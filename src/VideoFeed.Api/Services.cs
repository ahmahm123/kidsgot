using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace VideoFeed.Api;

public interface IUserContextService
{
    Guid GetRequiredUserId();
    string GetRequiredEmail();
}

public sealed class UserContextService(IHttpContextAccessor httpContextAccessor) : IUserContextService
{
    public Guid GetRequiredUserId()
    {
        var userId = httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userId, out var parsed)
            ? parsed
            : throw new UnauthorizedAccessException("Invalid token: user id missing.");
    }

    public string GetRequiredEmail()
    {
        return httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Email)?.Value
               ?? throw new UnauthorizedAccessException("Invalid token: email missing.");
    }
}

public interface IJwtTokenService
{
    AuthResponse CreateToken(AppUser user);
}

public sealed class JwtTokenService(IOptions<JwtOptions> jwtOptionsAccessor) : IJwtTokenService
{
    private readonly JwtOptions _jwt = jwtOptionsAccessor.Value;

    public AuthResponse CreateToken(AppUser user)
    {
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwt.ExpiresMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAtUtc,
            signingCredentials: creds);
        return new AuthResponse
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            UserId = user.Id,
            Email = user.Email,
            Role = user.Role,
            ExpiresAtUtc = expiresAtUtc
        };
    }
}

public interface IUserPreferenceService
{
    Task<UserPreference> GetOrCreateAsync(Guid userId, CancellationToken cancellationToken);
    Task<UserPreference> UpdateAsync(Guid userId, UserPreferencesDto input, CancellationToken cancellationToken);
    Dictionary<string, int> NormalizeWeights(Dictionary<string, int> weights);
    Dictionary<string, List<string>> NormalizeIncludedSubAreas(Dictionary<string, List<string>> includedSubAreas);
}

public sealed class UserPreferenceService(AppDbContext dbContext) : IUserPreferenceService
{
    public async Task<UserPreference> GetOrCreateAsync(Guid userId, CancellationToken cancellationToken)
    {
        var pref = await dbContext.UserPreferences.FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (pref is not null)
        {
            return pref;
        }

        pref = new UserPreference
        {
            UserId = userId
        };
        pref.SetCategoryWeights(CategoryCatalog.DefaultWeights());
        pref.SetIncludedSubAreas(CategoryCatalog.DefaultIncludedSubAreas());
        pref.SetBlockedCreators(Array.Empty<string>());
        dbContext.UserPreferences.Add(pref);
        await dbContext.SaveChangesAsync(cancellationToken);
        return pref;
    }

    public async Task<UserPreference> UpdateAsync(Guid userId, UserPreferencesDto input, CancellationToken cancellationToken)
    {
        var pref = await GetOrCreateAsync(userId, cancellationToken);
        var normalizedWeights = NormalizeWeights(input.CategoryWeights);
        var normalizedSubAreas = NormalizeIncludedSubAreas(input.IncludedSubAreas);
        var blockedCreators = input.BlockedCreators.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList();

        pref.SetCategoryWeights(normalizedWeights);
        pref.SetIncludedSubAreas(normalizedSubAreas);
        pref.SetBlockedCreators(blockedCreators);
        pref.DataSaverMode = input.DataSaverMode;
        pref.KidSafeMode = input.KidSafeMode;
        pref.UpdatedAt = DateTime.UtcNow;

        dbContext.UserPreferences.Update(pref);
        await dbContext.SaveChangesAsync(cancellationToken);
        return pref;
    }

    public Dictionary<string, int> NormalizeWeights(Dictionary<string, int> weights)
    {
        var clean = CategoryCatalog.TopCategories()
            .ToDictionary(category => category, _ => 0, StringComparer.OrdinalIgnoreCase);

        foreach (var (category, rawWeight) in weights)
        {
            if (CategoryCatalog.IsKnownTopCategory(category))
            {
                clean[category] = Math.Max(0, rawWeight);
            }
        }

        if (clean.Values.Sum() == 0)
        {
            clean = CategoryCatalog.DefaultWeights();
        }

        var sum = clean.Values.Sum();
        if (sum == 100)
        {
            return clean;
        }

        var scaled = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var remainders = new List<(string Category, decimal FractionalPart)>();
        var running = 0;
        foreach (var category in CategoryCatalog.TopCategories())
        {
            var rawScaled = (decimal)clean[category] * 100m / sum;
            var floored = (int)Math.Floor(rawScaled);
            scaled[category] = floored;
            running += floored;
            remainders.Add((category, rawScaled - floored));
        }

        var remainderSlots = 100 - running;
        foreach (var (category, _) in remainders
                     .OrderByDescending(x => x.FractionalPart)
                     .ThenBy(x => x.Category, StringComparer.OrdinalIgnoreCase)
                     .Take(remainderSlots))
        {
            scaled[category] += 1;
        }

        return scaled;
    }

    public Dictionary<string, List<string>> NormalizeIncludedSubAreas(Dictionary<string, List<string>> includedSubAreas)
    {
        var clean = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var def in CategoryCatalog.Definitions.Where(x => x.RequiresSubArea))
        {
            if (!includedSubAreas.TryGetValue(def.Name, out var provided))
            {
                clean[def.Name] = def.SubAreas.Select(x => x.Name).ToList();
                continue;
            }

            var valid = provided
                .Where(candidate => def.SubAreas.Any(sub => sub.Name.Equals(candidate, StringComparison.OrdinalIgnoreCase)))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            clean[def.Name] = valid.Count > 0 ? valid : def.SubAreas.Select(x => x.Name).ToList();
        }

        return clean;
    }
}

public interface ICategorizationEngine
{
    CategorizationResult Categorize(
        ProviderCandidate candidate,
        Source? source,
        VideoCategoryOverride? adminOverride);
}

public sealed class DeterministicCategorizationEngine : ICategorizationEngine
{
    private sealed record KeywordRule(int Priority, string TopCategory, string? SubArea, IReadOnlyList<string> Keywords);

    private static readonly IReadOnlyList<KeywordRule> Rules = new[]
    {
        new KeywordRule(1, "Learning & Brain Boosting", "Math Fun", new[] { "math", "number game", "puzzle", "counting", "addition" }),
        new KeywordRule(2, "Learning & Brain Boosting", "Science Experiments", new[] { "science experiment", "volcano", "baking soda", "experiment" }),
        new KeywordRule(3, "Learning & Brain Boosting", "Space & Planets", new[] { "space", "planet", "solar system", "astronaut", "moon" }),
        new KeywordRule(4, "Learning & Brain Boosting", "History Stories", new[] { "history", "ancient", "past event", "civilization" }),
        new KeywordRule(5, "Learning & Brain Boosting", "Geography & Countries", new[] { "map", "country", "capital city", "geography", "landmark" }),
        new KeywordRule(6, "Learning & Brain Boosting", "Reading & Storytime", new[] { "storytime", "read aloud", "short story", "moral tale" }),
        new KeywordRule(7, "Learning & Brain Boosting", "Spelling & Vocabulary", new[] { "spelling", "vocabulary", "word game", "phonics" }),
        new KeywordRule(8, "Learning & Brain Boosting", "Coding for Kids", new[] { "coding", "scratch", "logic game", "beginner code" }),
        new KeywordRule(9, "Learning & Brain Boosting", "Robotics & STEM", new[] { "robot", "stem", "engineering", "robotics" }),
        new KeywordRule(10, "Learning & Brain Boosting", "Fun Facts", new[] { "fun fact", "did you know", "amazing fact" }),

        new KeywordRule(20, "Creativity & Expression", "Drawing & Art", new[] { "draw", "drawing", "sketch", "art tutorial" }),
        new KeywordRule(21, "Creativity & Expression", "DIY Crafts", new[] { "diy", "craft", "paper craft", "creative build" }),
        new KeywordRule(22, "Creativity & Expression", "Music & Singing", new[] { "song", "sing", "instrument", "music" }),
        new KeywordRule(23, "Creativity & Expression", "Dance & Movement", new[] { "dance", "choreography", "movement" }),
        new KeywordRule(24, "Creativity & Expression", "Acting & Skits", new[] { "skit", "acting", "role play" }),
        new KeywordRule(25, "Creativity & Expression", "Photography Basics", new[] { "photo", "camera basics", "photography" }),
        new KeywordRule(26, "Creativity & Expression", "Creative Writing", new[] { "poem", "story prompt", "creative writing" }),
        new KeywordRule(27, "Creativity & Expression", "Origami", new[] { "origami", "paper fold", "paper folding" }),
        new KeywordRule(28, "Creativity & Expression", "Magic Tricks (Safe)", new[] { "magic trick", "illusion", "safe magic" }),
        new KeywordRule(29, "Creativity & Expression", "LEGO & Building", new[] { "lego", "building challenge", "block build" }),

        new KeywordRule(40, "Life Skills & Positive Growth", "Kindness & Good Manners", new[] { "kindness", "manners", "respect", "empathy" }),
        new KeywordRule(41, "Life Skills & Positive Growth", "Friendship Lessons", new[] { "friendship", "sharing", "teamwork" }),
        new KeywordRule(42, "Life Skills & Positive Growth", "Health & Hygiene", new[] { "hygiene", "brushing", "healthy food", "wash hands" }),
        new KeywordRule(43, "Life Skills & Positive Growth", "Mindfulness & Calm Time", new[] { "mindfulness", "breathing exercise", "calm time" }),
        new KeywordRule(44, "Life Skills & Positive Growth", "Problem Solving", new[] { "brain teaser", "problem solving", "riddle" }),
        new KeywordRule(45, "Life Skills & Positive Growth", "Money Basics", new[] { "saving money", "coins", "budget basics" }),
        new KeywordRule(46, "Life Skills & Positive Growth", "Safety Tips", new[] { "safety tip", "road safety", "stranger safety" }),
        new KeywordRule(47, "Life Skills & Positive Growth", "Environmental Care", new[] { "recycle", "saving water", "environment" }),
        new KeywordRule(48, "Life Skills & Positive Growth", "Sports Skills", new[] { "sports skill", "beginner technique", "training drill" }),
        new KeywordRule(49, "Life Skills & Positive Growth", "Animal & Wildlife", new[] { "animal", "wildlife", "zoo facts" }),

        new KeywordRule(60, "Comedy", null, new[] { "comedy", "funny", "joke", "laugh" }),
        new KeywordRule(61, "Public Speaking", null, new[] { "public speaking", "confidence tip", "storytelling", "debate basics" }),
        new KeywordRule(62, "Sports", null, new[] { "sports", "highlight", "teamwork", "match" }),
        new KeywordRule(63, "Business", null, new[] { "business", "entrepreneur", "economics", "money habit" })
    };

    public CategorizationResult Categorize(
        ProviderCandidate candidate,
        Source? source,
        VideoCategoryOverride? adminOverride)
    {
        if (adminOverride is not null)
        {
            return new CategorizationResult
            {
                TopCategory = adminOverride.TopCategory,
                SubArea = adminOverride.SubArea,
                Explain = new ExplainDto
                {
                    Mode = "adminOverride",
                    Reason = adminOverride.Reason
                }
            };
        }

        if (source is not null && CategoryCatalog.IsKnownTopCategory(source.TopCategory))
        {
            return new CategorizationResult
            {
                TopCategory = source.TopCategory,
                SubArea = source.SubArea,
                Explain = new ExplainDto
                {
                    Mode = "sourceBased",
                    Reason = $"Mapped from source '{source.SourceId}' configured by admin."
                }
            };
        }

        var haystack = TextNormalizer.Normalize(
            $"{candidate.Title} {candidate.Description} {string.Join(' ', candidate.Hashtags)}");
        var matches = Rules
            .Select(rule =>
            {
                var matched = rule.Keywords
                    .Where(keyword => haystack.Contains(TextNormalizer.Normalize(keyword), StringComparison.Ordinal))
                    .ToList();
                return (Rule: rule, Matched: matched);
            })
            .Where(result => result.Matched.Count > 0)
            .OrderByDescending(result => result.Matched.Count)
            .ThenBy(result => result.Rule.Priority)
            .ToList();

        if (matches.Count == 0)
        {
            return new CategorizationResult
            {
                TopCategory = "Comedy",
                Explain = new ExplainDto
                {
                    Mode = "contentBased",
                    Reason = "No keyword match; deterministic fallback category.",
                    MatchedKeywords = new List<string>()
                }
            };
        }

        var winner = matches[0];
        return new CategorizationResult
        {
            TopCategory = winner.Rule.TopCategory,
            SubArea = winner.Rule.SubArea,
            Explain = new ExplainDto
            {
                Mode = "contentBased",
                Reason = $"Matched keywords: {string.Join(", ", winner.Matched)}",
                MatchedKeywords = winner.Matched
            }
        };
    }
}

public interface IVideoProvider
{
    string Name { get; }
    Task<ProviderResult> GetCandidatesAsync(ProviderQuery query, CancellationToken cancellationToken);
}

public sealed class MockVideoProvider : IVideoProvider
{
    public string Name => "MockProvider";

    public Task<ProviderResult> GetCandidatesAsync(ProviderQuery query, CancellationToken cancellationToken)
    {
        var categories = CategoryCatalog.SubAreasFor(query.TopCategory);
        var selectedSubArea = query.SubArea ?? categories.FirstOrDefault();
        var platformCycle = new[] { "youtube", "instagram", "facebook" };
        var candidates = new List<ProviderCandidate>();

        for (var i = 0; i < query.Limit; i++)
        {
            var platform = platformCycle[i % platformCycle.Length];
            var sequence = (i + 1).ToString("000");
            var resolvedSubArea = selectedSubArea;
            var title = query.TopCategory switch
            {
                "Learning & Brain Boosting" => $"{resolvedSubArea} challenge for kids #{sequence}",
                "Creativity & Expression" => $"{resolvedSubArea} mini tutorial #{sequence}",
                "Life Skills & Positive Growth" => $"{resolvedSubArea} positive habit #{sequence}",
                "Public Speaking" => $"Public speaking confidence tip #{sequence}",
                "Sports" => $"Sports beginner drill #{sequence}",
                "Business" => $"Business basics for kids #{sequence}",
                _ => $"Comedy short laugh #{sequence}"
            };

            var sourceId = $"mock-{platform}-{TextNormalizer.Normalize(query.TopCategory).Replace(" ", "-", StringComparison.Ordinal)}";
            candidates.Add(new ProviderCandidate
            {
                Platform = platform,
                PlatformVideoId = $"{sourceId}-{sequence}",
                PermalinkUrl = platform == "youtube"
                    ? $"https://www.youtube.com/embed/{sourceId}-{sequence}"
                    : $"https://{platform}.example.com/reel/{sourceId}-{sequence}",
                Title = title,
                Description = $"Official-mock content for {query.TopCategory} {resolvedSubArea}",
                CreatorId = sourceId,
                CreatorName = $"Mock Creator {query.TopCategory}",
                ThumbnailUrl = $"https://picsum.photos/seed/{sourceId}-{sequence}/480/800",
                DurationSeconds = 30 + i % 60,
                SourceId = sourceId,
                Hashtags = new List<string> { query.TopCategory, resolvedSubArea ?? query.TopCategory },
                Whitelisted = true,
                Language = "en"
            });
        }

        return Task.FromResult(new ProviderResult
        {
            ProviderName = Name,
            Enabled = true,
            Candidates = candidates,
            Messages = new List<string> { "Mock provider served local test data." }
        });
    }
}

public sealed class YouTubeVideoProvider(
    IOptions<ProviderOptions> providerOptions,
    ILogger<YouTubeVideoProvider> logger) : IVideoProvider
{
    public string Name => "YouTubeProvider";

    public Task<ProviderResult> GetCandidatesAsync(ProviderQuery query, CancellationToken cancellationToken)
    {
        var options = providerOptions.Value.YouTube;
        if (!options.Enabled || string.IsNullOrWhiteSpace(options.ApiKey))
        {
            return Task.FromResult(new ProviderResult
            {
                ProviderName = Name,
                Enabled = false,
                Messages = new List<string>
                {
                    "YouTube provider disabled: configure official YouTube Data API key. No scraping is used."
                }
            });
        }

        logger.LogInformation(
            "YouTube provider enabled for category {Category}. Integrate official Data API calls in this adapter.",
            query.TopCategory);
        return Task.FromResult(new ProviderResult
        {
            ProviderName = Name,
            Enabled = true,
            Messages = new List<string>
            {
                "YouTube provider is configured for official API usage. Current MVP keeps mock/local data if API pulls are not wired."
            },
            Candidates = new List<ProviderCandidate>()
        });
    }
}

public sealed class MetaVideoProvider(
    IOptions<ProviderOptions> providerOptions,
    ILogger<MetaVideoProvider> logger) : IVideoProvider
{
    public string Name => "MetaProvider";

    public Task<ProviderResult> GetCandidatesAsync(ProviderQuery query, CancellationToken cancellationToken)
    {
        var options = providerOptions.Value.Meta;
        if (!options.Enabled || !options.PermissionsGranted || string.IsNullOrWhiteSpace(options.AccessToken))
        {
            return Task.FromResult(new ProviderResult
            {
                ProviderName = Name,
                Enabled = false,
                Messages = new List<string>
                {
                    "Meta provider disabled: missing Graph API permissions/access token. Only connected/approved sources are supported."
                }
            });
        }

        logger.LogInformation(
            "Meta provider enabled for category {Category}. Use Graph API only for owned/approved sources.",
            query.TopCategory);
        return Task.FromResult(new ProviderResult
        {
            ProviderName = Name,
            Enabled = true,
            Candidates = new List<ProviderCandidate>(),
            Messages = new List<string>
            {
                "Meta provider configured. Pull only permitted Instagram/Facebook reels via official Graph API."
            }
        });
    }
}

public sealed class CandidateFetchResult
{
    public List<Video> Candidates { get; init; } = new();
    public List<string> Warnings { get; init; } = new();
}

public sealed class ProviderCoordinator(
    AppDbContext dbContext,
    IEnumerable<IVideoProvider> providers,
    ICategorizationEngine categorizationEngine,
    IDistributedCache cache,
    IOptions<FeedOptions> feedOptionsAccessor,
    ILogger<ProviderCoordinator> logger)
{
    private readonly FeedOptions _feedOptions = feedOptionsAccessor.Value;

    public async Task<CandidateFetchResult> GetCandidatesAsync(
        string topCategory,
        IReadOnlyCollection<string>? includedSubAreas,
        bool kidSafeMode,
        int limit,
        CancellationToken cancellationToken)
    {
        var warnings = new List<string>();
        var subAreasToFetch = CategoryCatalog.RequiresSubArea(topCategory)
            ? (includedSubAreas is { Count: > 0 }
                ? includedSubAreas.Select(x => (string?)x)
                : CategoryCatalog.SubAreasFor(topCategory).Select(x => (string?)x))
            : new string?[] { null };

        var videos = new List<Video>();
        var seenVideoIds = new HashSet<Guid>();
        foreach (var platform in new[] { "youtube", "instagram", "facebook" })
        {
            foreach (var subArea in subAreasToFetch)
            {
                var cacheKey = BuildCacheKey(platform, topCategory, subArea, kidSafeMode);
                var cachedJson = await cache.GetStringAsync(cacheKey, cancellationToken);
                List<Guid>? ids = null;
                if (!string.IsNullOrWhiteSpace(cachedJson))
                {
                    ids = JsonSerializer.Deserialize<List<Guid>>(cachedJson);
                }

                if (ids is null || ids.Count == 0)
                {
                    var refreshWarnings = await RefreshOnDemandAsync(topCategory, subArea, limit, cancellationToken);
                    warnings.AddRange(refreshWarnings);
                    var query = dbContext.Videos
                        .Where(v => v.Platform == platform && v.TopCategory == topCategory);
                    if (!string.IsNullOrWhiteSpace(subArea))
                    {
                        query = query.Where(v => v.SubArea == subArea);
                    }

                    if (kidSafeMode)
                    {
                        query = query.Where(v => v.Whitelisted);
                    }

                    ids = await query
                        .OrderByDescending(v => v.FetchedAt)
                        .Select(v => v.Id)
                        .Take(Math.Max(limit, 50))
                        .ToListAsync(cancellationToken);

                    var serialized = JsonSerializer.Serialize(ids);
                    await cache.SetStringAsync(
                        cacheKey,
                        serialized,
                        new DistributedCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_feedOptions.CandidateCacheMinutes)
                        },
                        cancellationToken);
                }

                if (ids.Count == 0)
                {
                    continue;
                }

                var chunk = await dbContext.Videos
                    .Where(v => ids.Contains(v.Id))
                    .ToListAsync(cancellationToken);
                foreach (var video in chunk)
                {
                    if (seenVideoIds.Add(video.Id))
                    {
                        videos.Add(video);
                    }
                }
            }
        }

        return new CandidateFetchResult { Candidates = videos, Warnings = warnings };
    }

    private static string BuildCacheKey(string platform, string topCategory, string? subArea, bool kidSafeMode) =>
        $"candidates:{platform}:{TextNormalizer.Normalize(topCategory)}:{TextNormalizer.Normalize(subArea ?? "all")}:{kidSafeMode}";

    private async Task<List<string>> RefreshOnDemandAsync(
        string topCategory,
        string? subArea,
        int limit,
        CancellationToken cancellationToken)
    {
        var throttleKey = $"refresh-throttle:{TextNormalizer.Normalize(topCategory)}:{TextNormalizer.Normalize(subArea ?? "all")}";
        var alreadyRefreshed = await cache.GetStringAsync(throttleKey, cancellationToken);
        if (!string.IsNullOrWhiteSpace(alreadyRefreshed))
        {
            return new List<string>();
        }

        var warnings = new List<string>();
        foreach (var provider in providers)
        {
            var result = await provider.GetCandidatesAsync(
                new ProviderQuery
                {
                    TopCategory = topCategory,
                    SubArea = subArea,
                    Limit = limit
                },
                cancellationToken);

            warnings.AddRange(result.Messages.Select(message => $"{provider.Name}: {message}"));
            if (!result.Enabled || result.Candidates.Count == 0)
            {
                continue;
            }

            foreach (var candidate in result.Candidates)
            {
                await UpsertCandidateAsync(candidate, cancellationToken);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await cache.SetStringAsync(
            throttleKey,
            DateTime.UtcNow.ToString("O"),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2) },
            cancellationToken);
        return warnings;
    }

    private async Task UpsertCandidateAsync(ProviderCandidate candidate, CancellationToken cancellationToken)
    {
        var source = await dbContext.Sources
            .FirstOrDefaultAsync(
                x => x.Platform == candidate.Platform && x.SourceId == candidate.SourceId && x.Enabled,
                cancellationToken);

        Video? existing;
        if (!string.IsNullOrWhiteSpace(candidate.PlatformVideoId))
        {
            existing = await dbContext.Videos
                .FirstOrDefaultAsync(
                    x => x.Platform == candidate.Platform && x.PlatformVideoId == candidate.PlatformVideoId,
                    cancellationToken);
        }
        else
        {
            existing = await dbContext.Videos
                .FirstOrDefaultAsync(
                    x => x.Platform == candidate.Platform && x.PermalinkUrl == candidate.PermalinkUrl,
                    cancellationToken);
        }

        var overrideCategory = existing is null
            ? null
            : await dbContext.VideoCategoryOverrides
                .FirstOrDefaultAsync(x => x.VideoId == existing.Id, cancellationToken);

        var categorization = categorizationEngine.Categorize(candidate, source, overrideCategory);
        var resolvedSubArea = categorization.SubArea;
        if (CategoryCatalog.RequiresSubArea(categorization.TopCategory) && string.IsNullOrWhiteSpace(resolvedSubArea))
        {
            resolvedSubArea = CategoryCatalog.SubAreasFor(categorization.TopCategory).FirstOrDefault();
        }

        if (existing is null)
        {
            existing = new Video();
            dbContext.Videos.Add(existing);
        }

        existing.Platform = candidate.Platform;
        existing.PlatformVideoId = candidate.PlatformVideoId;
        existing.PermalinkUrl = candidate.PermalinkUrl;
        existing.Title = candidate.Title;
        existing.Description = candidate.Description;
        existing.CreatorName = candidate.CreatorName;
        existing.CreatorId = candidate.CreatorId;
        existing.ThumbnailUrl = candidate.ThumbnailUrl;
        existing.DurationSeconds = candidate.DurationSeconds;
        existing.TopCategory = categorization.TopCategory;
        existing.SubArea = resolvedSubArea;
        existing.Language = candidate.Language;
        existing.SourceId = candidate.SourceId;
        existing.Whitelisted = source?.Whitelisted ?? candidate.Whitelisted;
        existing.CreatedAt = candidate.CreatedAt;
        existing.FetchedAt = candidate.FetchedAt;
        existing.ExplainJson = JsonSerializer.Serialize(categorization.Explain);

        if (!CategoryCatalog.IsKnownTopCategory(existing.TopCategory))
        {
            logger.LogWarning("Skipping unknown category assignment {Category} for candidate {Title}", existing.TopCategory, existing.Title);
            existing.TopCategory = "Comedy";
            existing.SubArea = null;
            existing.ExplainJson = JsonSerializer.Serialize(
                new ExplainDto
                {
                    Mode = "fallback",
                    Reason = "Unknown category was resolved to Comedy."
                });
        }
    }
}

public sealed class FeedService(
    AppDbContext dbContext,
    ProviderCoordinator providerCoordinator,
    IUserPreferenceService userPreferenceService,
    IOptions<FeedOptions> optionsAccessor,
    ILogger<FeedService> logger)
{
    private readonly FeedOptions _options = optionsAccessor.Value;

    public async Task<FeedResponse> GetFeedAsync(Guid userId, int limit, string? language, CancellationToken cancellationToken)
    {
        limit = Math.Clamp(limit, 1, 50);
        var preference = await userPreferenceService.GetOrCreateAsync(userId, cancellationToken);
        var weights = userPreferenceService.NormalizeWeights(preference.GetCategoryWeights());
        var includedSubAreas = userPreferenceService.NormalizeIncludedSubAreas(preference.GetIncludedSubAreas());
        var blockedCreators = preference.GetBlockedCreators()
            .Select(TextNormalizer.Normalize)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var recentServed = await dbContext.FeedServed
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.ServedAt)
            .Take(_options.RollingWindowSize)
            .Include(x => x.Video)
            .ToListAsync(cancellationToken);

        var servedCounts = CategoryCatalog.TopCategories()
            .ToDictionary(
                category => category,
                category => recentServed.Count(x => x.Video.TopCategory == category),
                StringComparer.OrdinalIgnoreCase);

        var targetCounts = CategoryCatalog.TopCategories()
            .ToDictionary(
                category => category,
                category => (int)Math.Round(weights[category] * _options.RollingWindowSize / 100.0, MidpointRounding.AwayFromZero),
                StringComparer.OrdinalIgnoreCase);

        var candidateWarnings = new List<string>();
        var categoryCandidates = new Dictionary<string, List<Video>>(StringComparer.OrdinalIgnoreCase);
        foreach (var topCategory in CategoryCatalog.TopCategories())
        {
            includedSubAreas.TryGetValue(topCategory, out var selectedSubAreas);
            var fetchResult = await providerCoordinator.GetCandidatesAsync(
                topCategory,
                selectedSubAreas,
                preference.KidSafeMode,
                Math.Max(limit * 4, 40),
                cancellationToken);
            var filteredCandidates = fetchResult.Candidates;
            if (!string.IsNullOrWhiteSpace(language))
            {
                filteredCandidates = filteredCandidates
                    .Where(video => !string.IsNullOrWhiteSpace(video.Language) &&
                                    video.Language.Equals(language, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            categoryCandidates[topCategory] = filteredCandidates;
            candidateWarnings.AddRange(fetchResult.Warnings);

            if (filteredCandidates.Count == 0)
            {
                logger.LogWarning("Shortage: no candidates for category {Category}", topCategory);
                candidateWarnings.Add($"shortage:{topCategory}");
            }
        }

        var selection = SelectVideos(
            limit,
            categoryCandidates,
            servedCounts,
            targetCounts,
            blockedCreators,
            includedSubAreas,
            recentServed.Select(x => x.Video).ToList());

        selection.Warnings.AddRange(candidateWarnings.Distinct());

        foreach (var video in selection.SelectedVideos)
        {
            dbContext.FeedServed.Add(new FeedServed
            {
                UserId = userId,
                VideoId = video.Id,
                TopCategorySnapshot = video.TopCategory,
                ServedAt = DateTime.UtcNow
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return new FeedResponse
        {
            Items = selection.SelectedVideos.Select(ToFeedItemDto).ToList(),
            ServedCounts = selection.ServedCounts,
            TargetCounts = selection.TargetCounts,
            RollingWindowSize = _options.RollingWindowSize,
            Warnings = selection.Warnings.Distinct().ToList()
        };
    }

    public FeedAlgorithmResult SelectVideos(
        int limit,
        Dictionary<string, List<Video>> categoryCandidates,
        Dictionary<string, int> initialServedCounts,
        Dictionary<string, int> targetCounts,
        HashSet<string> blockedCreators,
        Dictionary<string, List<string>> includedSubAreas,
        List<Video> recentServedVideos)
    {
        var result = new FeedAlgorithmResult
        {
            ServedCounts = new Dictionary<string, int>(initialServedCounts, StringComparer.OrdinalIgnoreCase),
            TargetCounts = new Dictionary<string, int>(targetCounts, StringComparer.OrdinalIgnoreCase)
        };

        var recentCreatorQueue = new Queue<string>(
            recentServedVideos
                .Take(_options.RepeatCreatorWindow)
                .Select(v => TextNormalizer.Normalize(v.CreatorId)));
        var recentCreatorSet = recentCreatorQueue.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var recentFingerprints = recentServedVideos
            .SelectMany(CreateDedupFingerprints)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var selectedFingerprints = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var selectedIds = new HashSet<Guid>();

        for (var i = 0; i < limit; i++)
        {
            Video? bestVideo = null;
            var bestScore = int.MinValue;
            var selectedFromCategory = string.Empty;

            foreach (var (category, videos) in categoryCandidates)
            {
                foreach (var video in videos)
                {
                    if (selectedIds.Contains(video.Id))
                    {
                        continue;
                    }

                    var score = 100;
                    var served = result.ServedCounts.GetValueOrDefault(category, 0);
                    var target = result.TargetCounts.GetValueOrDefault(category, 0);
                    if (served < target)
                    {
                        score += (target - served) * 6;
                    }
                    else if (served > target)
                    {
                        score -= (served - target) * 4;
                    }

                    var normalizedCreator = TextNormalizer.Normalize(video.CreatorId);
                    if (recentCreatorSet.Contains(normalizedCreator))
                    {
                        score -= 35;
                    }

                    if (blockedCreators.Contains(normalizedCreator) ||
                        blockedCreators.Contains(TextNormalizer.Normalize(video.CreatorName)))
                    {
                        score -= 10_000;
                    }

                    var fingerprints = CreateDedupFingerprints(video).ToList();
                    if (fingerprints.Any(fingerprint =>
                            recentFingerprints.Contains(fingerprint) || selectedFingerprints.Contains(fingerprint)))
                    {
                        score -= 10_000;
                    }

                    if (CategoryCatalog.RequiresSubArea(video.TopCategory) &&
                        includedSubAreas.TryGetValue(video.TopCategory, out var allowedSubAreas) &&
                        allowedSubAreas.Count > 0 &&
                        !allowedSubAreas.Contains(video.SubArea ?? string.Empty, StringComparer.OrdinalIgnoreCase))
                    {
                        score -= 5_000;
                    }

                    if (score > bestScore)
                    {
                        bestScore = score;
                        bestVideo = video;
                        selectedFromCategory = category;
                    }
                }
            }

            if (bestVideo is null || bestScore < -5000)
            {
                result.Warnings.Add("shortage:global");
                break;
            }

            result.SelectedVideos.Add(bestVideo);
            selectedIds.Add(bestVideo.Id);
            result.ServedCounts[selectedFromCategory] = result.ServedCounts.GetValueOrDefault(selectedFromCategory, 0) + 1;

            var creator = TextNormalizer.Normalize(bestVideo.CreatorId);
            recentCreatorQueue.Enqueue(creator);
            recentCreatorSet.Add(creator);
            while (recentCreatorQueue.Count > _options.RepeatCreatorWindow)
            {
                var removed = recentCreatorQueue.Dequeue();
                if (!recentCreatorQueue.Contains(removed))
                {
                    recentCreatorSet.Remove(removed);
                }
            }

            foreach (var selectedFingerprint in CreateDedupFingerprints(bestVideo))
            {
                selectedFingerprints.Add(selectedFingerprint);
            }
        }

        return result;
    }

    private static IEnumerable<string> CreateDedupFingerprints(Video video)
    {
        if (!string.IsNullOrWhiteSpace(video.PermalinkUrl))
        {
            yield return $"url:{TextNormalizer.Normalize(video.PermalinkUrl)}";
        }

        yield return $"tc:{TextNormalizer.Normalize($"{video.Title}|{video.CreatorName}")}";
    }

    private static FeedItemDto ToFeedItemDto(Video video)
    {
        ExplainDto explain;
        try
        {
            explain = JsonSerializer.Deserialize<ExplainDto>(video.ExplainJson) ?? new ExplainDto();
        }
        catch
        {
            explain = new ExplainDto { Mode = "unknown", Reason = "Unable to parse explain metadata." };
        }

        return new FeedItemDto
        {
            VideoId = video.Id,
            Platform = video.Platform,
            PlatformVideoId = video.PlatformVideoId,
            PermalinkUrl = video.PermalinkUrl,
            Title = video.Title,
            CreatorName = video.CreatorName,
            CreatorId = video.CreatorId,
            ThumbnailUrl = video.ThumbnailUrl,
            DurationSeconds = video.DurationSeconds,
            TopCategory = video.TopCategory,
            SubArea = video.SubArea,
            Language = video.Language,
            CreatedAt = video.CreatedAt,
            FetchedAt = video.FetchedAt,
            SourceId = video.SourceId,
            Whitelisted = video.Whitelisted,
            Explain = explain
        };
    }
}

public sealed class HistoryService(AppDbContext dbContext)
{
    public async Task<List<FeedItemDto>> GetHistoryAsync(Guid userId, int maxItems, CancellationToken cancellationToken)
    {
        maxItems = Math.Clamp(maxItems, 1, 50);
        var entries = await dbContext.EventViews
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.ViewedAt)
            .Include(x => x.Video)
            .Take(200)
            .ToListAsync(cancellationToken);

        return entries
            .GroupBy(x => x.VideoId)
            .OrderByDescending(group => group.Max(x => x.ViewedAt))
            .Take(maxItems)
            .Select(group => group.First().Video)
            .Select(video => new FeedItemDto
            {
                VideoId = video.Id,
                Platform = video.Platform,
                PlatformVideoId = video.PlatformVideoId,
                PermalinkUrl = video.PermalinkUrl,
                Title = video.Title,
                CreatorName = video.CreatorName,
                CreatorId = video.CreatorId,
                ThumbnailUrl = video.ThumbnailUrl,
                DurationSeconds = video.DurationSeconds,
                TopCategory = video.TopCategory,
                SubArea = video.SubArea,
                Language = video.Language,
                CreatedAt = video.CreatedAt,
                FetchedAt = video.FetchedAt,
                SourceId = video.SourceId,
                Whitelisted = video.Whitelisted,
                Explain = JsonSerializer.Deserialize<ExplainDto>(video.ExplainJson) ?? new ExplainDto()
            })
            .ToList();
    }
}

public sealed class IngestionService(
    AppDbContext dbContext,
    ICategorizationEngine categorizationEngine)
{
    public async Task<Video> UpsertVideoAsync(ProviderCandidate candidate, CancellationToken cancellationToken)
    {
        var source = await dbContext.Sources
            .FirstOrDefaultAsync(
                x => x.Platform == candidate.Platform && x.SourceId == candidate.SourceId,
                cancellationToken);
        var existing = await dbContext.Videos
            .FirstOrDefaultAsync(
                x => x.Platform == candidate.Platform &&
                     ((!string.IsNullOrWhiteSpace(candidate.PlatformVideoId) &&
                       x.PlatformVideoId == candidate.PlatformVideoId) ||
                      (!string.IsNullOrWhiteSpace(candidate.PermalinkUrl) &&
                       x.PermalinkUrl == candidate.PermalinkUrl)),
                cancellationToken);

        var overrideCategory = existing is null
            ? null
            : await dbContext.VideoCategoryOverrides.FirstOrDefaultAsync(x => x.VideoId == existing.Id, cancellationToken);
        var category = categorizationEngine.Categorize(candidate, source, overrideCategory);

        if (existing is null)
        {
            existing = new Video();
            dbContext.Videos.Add(existing);
        }

        existing.Platform = candidate.Platform;
        existing.PlatformVideoId = candidate.PlatformVideoId;
        existing.PermalinkUrl = candidate.PermalinkUrl;
        existing.Title = candidate.Title;
        existing.Description = candidate.Description;
        existing.CreatorName = candidate.CreatorName;
        existing.CreatorId = candidate.CreatorId;
        existing.ThumbnailUrl = candidate.ThumbnailUrl;
        existing.DurationSeconds = candidate.DurationSeconds;
        existing.TopCategory = category.TopCategory;
        existing.SubArea = category.SubArea;
        existing.Language = candidate.Language;
        existing.SourceId = candidate.SourceId;
        existing.Whitelisted = source?.Whitelisted ?? candidate.Whitelisted;
        existing.ExplainJson = JsonSerializer.Serialize(category.Explain);
        existing.FetchedAt = DateTime.UtcNow;
        if (existing.CreatedAt == default)
        {
            existing.CreatedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return existing;
    }
}

public sealed class DatabaseInitializerHostedService(
    IServiceProvider serviceProvider,
    IPasswordHasher<AppUser> passwordHasher,
    ILogger<DatabaseInitializerHostedService> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync(cancellationToken);

        await SeedCategoriesAsync(dbContext, cancellationToken);
        await SeedUsersAndPreferencesAsync(dbContext, cancellationToken);
        await SeedSourcesAndVideosAsync(dbContext, cancellationToken);

        logger.LogInformation("Database initialized and seeded.");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task SeedCategoriesAsync(AppDbContext dbContext, CancellationToken cancellationToken)
    {
        if (await dbContext.CategoryDefinitions.AnyAsync(cancellationToken))
        {
            return;
        }

        var rows = new List<CategoryDefinition>();
        foreach (var top in CategoryCatalog.Definitions)
        {
            rows.Add(new CategoryDefinition
            {
                TopCategory = top.Name,
                SubArea = null,
                Detail = null,
                Enabled = true
            });

            foreach (var sub in top.SubAreas)
            {
                rows.Add(new CategoryDefinition
                {
                    TopCategory = top.Name,
                    SubArea = sub.Name,
                    Detail = sub.Detail,
                    Enabled = true
                });
            }
        }

        dbContext.CategoryDefinitions.AddRange(rows);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedUsersAndPreferencesAsync(AppDbContext dbContext, CancellationToken cancellationToken)
    {
        if (!await dbContext.Users.AnyAsync(cancellationToken))
        {
            var admin = new AppUser
            {
                Email = "admin@local.dev",
                Role = AppRoles.Admin
            };
            admin.PasswordHash = passwordHasher.HashPassword(admin, "Admin123!");

            var demoUser = new AppUser
            {
                Email = "demo@local.dev",
                Role = AppRoles.User
            };
            demoUser.PasswordHash = passwordHasher.HashPassword(demoUser, "Demo12345!");

            dbContext.Users.AddRange(admin, demoUser);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var users = await dbContext.Users.ToListAsync(cancellationToken);
        foreach (var user in users)
        {
            var existing = await dbContext.UserPreferences.FirstOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
            if (existing is not null)
            {
                continue;
            }

            var pref = new UserPreference
            {
                UserId = user.Id,
                DataSaverMode = false,
                KidSafeMode = true
            };
            pref.SetCategoryWeights(CategoryCatalog.DefaultWeights());
            pref.SetIncludedSubAreas(CategoryCatalog.DefaultIncludedSubAreas());
            pref.SetBlockedCreators(Array.Empty<string>());
            dbContext.UserPreferences.Add(pref);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedSourcesAndVideosAsync(AppDbContext dbContext, CancellationToken cancellationToken)
    {
        if (!await dbContext.Sources.AnyAsync(cancellationToken))
        {
            var sources = new List<Source>();
            foreach (var top in CategoryCatalog.Definitions)
            {
                foreach (var platform in new[] { "youtube", "instagram", "facebook" })
                {
                    sources.Add(new Source
                    {
                        Platform = platform,
                        SourceId = $"seed-{platform}-{TextNormalizer.Normalize(top.Name).Replace(" ", "-", StringComparison.Ordinal)}",
                        TopCategory = top.Name,
                        SubArea = top.SubAreas.FirstOrDefault()?.Name,
                        AccessMode = "approved-source",
                        Whitelisted = true,
                        Enabled = true
                    });
                }
            }

            dbContext.Sources.AddRange(sources);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (await dbContext.Videos.AnyAsync(cancellationToken))
        {
            return;
        }

        var sourcesByCategory = await dbContext.Sources
            .GroupBy(x => x.TopCategory)
            .ToDictionaryAsync(group => group.Key, group => group.ToList(), cancellationToken);
        var videos = new List<Video>();

        foreach (var top in CategoryCatalog.Definitions)
        {
            var categorySources = sourcesByCategory[top.Name];
            var subAreas = top.RequiresSubArea ? top.SubAreas : new[] { new SubAreaDefinition(string.Empty, string.Empty) };
            var videoIndex = 0;
            foreach (var sub in subAreas)
            {
                foreach (var source in categorySources)
                {
                    for (var i = 0; i < 3; i++)
                    {
                        videoIndex++;
                        var platformVideoId = $"{source.SourceId}-{videoIndex:000}";
                        var title = BuildSeedTitle(top.Name, sub.Name, videoIndex);
                        var creatorName = $"Seed Creator {source.Platform} {top.Name}";

                        videos.Add(new Video
                        {
                            Platform = source.Platform,
                            PlatformVideoId = platformVideoId,
                            PermalinkUrl = source.Platform == "youtube"
                                ? $"https://www.youtube.com/embed/{platformVideoId}"
                                : $"https://{source.Platform}.example.com/reel/{platformVideoId}",
                            Title = title,
                            Description = $"{title} from approved source {source.SourceId}.",
                            CreatorName = creatorName,
                            CreatorId = source.SourceId,
                            ThumbnailUrl = $"https://picsum.photos/seed/{platformVideoId}/480/800",
                            DurationSeconds = 20 + (videoIndex % 70),
                            TopCategory = top.Name,
                            SubArea = string.IsNullOrWhiteSpace(sub.Name) ? null : sub.Name,
                            Language = "en",
                            ExplainJson = JsonSerializer.Serialize(
                                new ExplainDto
                                {
                                    Mode = "sourceBased",
                                    Reason = $"Seeded from source mapping for {top.Name}{(string.IsNullOrWhiteSpace(sub.Name) ? string.Empty : $" / {sub.Name}")}."
                                }),
                            SourceId = source.SourceId,
                            Whitelisted = source.Whitelisted,
                            CreatedAt = DateTime.UtcNow.AddDays(-videoIndex),
                            FetchedAt = DateTime.UtcNow
                        });
                    }
                }
            }
        }

        dbContext.Videos.AddRange(videos);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string BuildSeedTitle(string topCategory, string? subArea, int index)
    {
        if (string.IsNullOrWhiteSpace(subArea))
        {
            return $"{topCategory} short #{index:000}";
        }

        return $"{subArea} - {topCategory} short #{index:000}";
    }
}
