using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace VideoFeed.Api;

public static class AppRoles
{
    public const string User = "User";
    public const string Admin = "Admin";
}

public static class AuthPolicies
{
    public const string AdminOnly = "AdminOnly";
}

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "CategoryWeightedVideoFeed";
    public string Audience { get; set; } = "CategoryWeightedVideoFeed.Client";
    public string SigningKey { get; set; } = "CHANGE_ME";
    public int ExpiresMinutes { get; set; } = 120;
}

public sealed class FeedOptions
{
    public int RollingWindowSize { get; set; } = 100;
    public int RepeatCreatorWindow { get; set; } = 10;
    public int CandidateCacheMinutes { get; set; } = 5;
}

public sealed class ProviderOptions
{
    public YouTubeProviderOptions YouTube { get; set; } = new();
    public MetaProviderOptions Meta { get; set; } = new();
}

public sealed class YouTubeProviderOptions
{
    public bool Enabled { get; set; }
    public string ApiKey { get; set; } = string.Empty;
    public string ApplicationName { get; set; } = "CategoryWeightedVideoFeed";
}

public sealed class MetaProviderOptions
{
    public bool Enabled { get; set; }
    public string AppId { get; set; } = string.Empty;
    public string AppSecret { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public bool PermissionsGranted { get; set; }
}

public sealed record SubAreaDefinition(string Name, string Detail);

public sealed record TopCategoryDefinition(string Name, bool RequiresSubArea, IReadOnlyList<SubAreaDefinition> SubAreas);

public static class CategoryCatalog
{
    public static readonly IReadOnlyList<TopCategoryDefinition> Definitions = new[]
    {
        new TopCategoryDefinition(
            "Learning & Brain Boosting",
            true,
            new[]
            {
                new SubAreaDefinition("Math Fun", "Easy tricks, puzzles, number games"),
                new SubAreaDefinition("Science Experiments", "Safe, simple home experiments"),
                new SubAreaDefinition("Space & Planets", "Stars, astronauts, solar system"),
                new SubAreaDefinition("History Stories", "Kid-friendly past events"),
                new SubAreaDefinition("Geography & Countries", "Maps, cultures, landmarks"),
                new SubAreaDefinition("Reading & Storytime", "Short stories, moral tales"),
                new SubAreaDefinition("Spelling & Vocabulary", "Word games"),
                new SubAreaDefinition("Coding for Kids", "Simple logic & beginner coding"),
                new SubAreaDefinition("Robotics & STEM", "Basic engineering fun"),
                new SubAreaDefinition("Fun Facts", "Amazing kid-safe facts")
            }),
        new TopCategoryDefinition(
            "Creativity & Expression",
            true,
            new[]
            {
                new SubAreaDefinition("Drawing & Art", "Step-by-step drawing"),
                new SubAreaDefinition("DIY Crafts", "Paper crafts, creative builds"),
                new SubAreaDefinition("Music & Singing", "Songs, instruments"),
                new SubAreaDefinition("Dance & Movement", "Simple choreography"),
                new SubAreaDefinition("Acting & Skits", "Short role-play fun"),
                new SubAreaDefinition("Photography Basics", "Kid creativity with cameras"),
                new SubAreaDefinition("Creative Writing", "Short poem or story prompts"),
                new SubAreaDefinition("Origami", "Paper folding"),
                new SubAreaDefinition("Magic Tricks (Safe)", "Easy illusion tricks"),
                new SubAreaDefinition("LEGO & Building", "Building challenges")
            }),
        new TopCategoryDefinition(
            "Life Skills & Positive Growth",
            true,
            new[]
            {
                new SubAreaDefinition("Kindness & Good Manners", "Respect & empathy"),
                new SubAreaDefinition("Friendship Lessons", "Sharing & teamwork"),
                new SubAreaDefinition("Health & Hygiene", "Brushing, eating healthy"),
                new SubAreaDefinition("Mindfulness & Calm Time", "Simple breathing exercises"),
                new SubAreaDefinition("Problem Solving", "Brain teasers"),
                new SubAreaDefinition("Money Basics", "Saving & understanding coins"),
                new SubAreaDefinition("Safety Tips", "Road safety, stranger safety"),
                new SubAreaDefinition("Environmental Care", "Recycling, saving water"),
                new SubAreaDefinition("Sports Skills", "Beginner techniques"),
                new SubAreaDefinition("Animal & Wildlife", "Cute animals + learning facts")
            }),
        new TopCategoryDefinition("Comedy", false, Array.Empty<SubAreaDefinition>()),
        new TopCategoryDefinition("Public Speaking", false, Array.Empty<SubAreaDefinition>()),
        new TopCategoryDefinition("Sports", false, Array.Empty<SubAreaDefinition>()),
        new TopCategoryDefinition("Business", false, Array.Empty<SubAreaDefinition>())
    };

    public static readonly IReadOnlyDictionary<string, int> ExampleWeights = new Dictionary<string, int>
    {
        ["Learning & Brain Boosting"] = 15,
        ["Creativity & Expression"] = 20,
        ["Life Skills & Positive Growth"] = 15,
        ["Comedy"] = 15,
        ["Public Speaking"] = 15,
        ["Sports"] = 15,
        ["Business"] = 5
    };

    public static readonly HashSet<string> EducationalTopCategories = new(
        new[]
        {
            "Learning & Brain Boosting",
            "Creativity & Expression",
            "Life Skills & Positive Growth"
        },
        StringComparer.OrdinalIgnoreCase);

    public static bool RequiresSubArea(string topCategory) =>
        Definitions.FirstOrDefault(x => x.Name.Equals(topCategory, StringComparison.OrdinalIgnoreCase))?.RequiresSubArea
        ?? false;

    public static bool IsKnownTopCategory(string topCategory) =>
        Definitions.Any(x => x.Name.Equals(topCategory, StringComparison.OrdinalIgnoreCase));

    public static IReadOnlyList<string> TopCategories() => Definitions.Select(x => x.Name).ToList();

    public static IReadOnlyList<string> SubAreasFor(string topCategory) =>
        Definitions.FirstOrDefault(x => x.Name.Equals(topCategory, StringComparison.OrdinalIgnoreCase))?.SubAreas
            .Select(x => x.Name)
            .ToList()
        ?? Array.Empty<string>();

    public static Dictionary<string, int> DefaultWeights()
    {
        return ExampleWeights.ToDictionary(kvp => kvp.Key, kvp => kvp.Value, StringComparer.OrdinalIgnoreCase);
    }

    public static Dictionary<string, List<string>> DefaultIncludedSubAreas()
    {
        return Definitions
            .Where(def => def.RequiresSubArea)
            .ToDictionary(
                def => def.Name,
                def => def.SubAreas.Select(sub => sub.Name).ToList(),
                StringComparer.OrdinalIgnoreCase);
    }

    public static string? SubAreaDetail(string topCategory, string subArea)
    {
        var top = Definitions.FirstOrDefault(x => x.Name.Equals(topCategory, StringComparison.OrdinalIgnoreCase));
        return top?.SubAreas.FirstOrDefault(x => x.Name.Equals(subArea, StringComparison.OrdinalIgnoreCase))?.Detail;
    }
}

public sealed class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(500)]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Role { get; set; } = AppRoles.User;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public UserPreference? Preference { get; set; }
}

public sealed class UserPreference
{
    [Key]
    [ForeignKey(nameof(User))]
    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    [Column(TypeName = "jsonb")]
    public string CategoryWeightsJson { get; set; } = "{}";

    [Column(TypeName = "jsonb")]
    public string IncludedSubAreasJson { get; set; } = "{}";

    [Column(TypeName = "jsonb")]
    public string BlockedCreatorsJson { get; set; } = "[]";

    public bool DataSaverMode { get; set; }

    public bool KidSafeMode { get; set; } = true;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Dictionary<string, int> GetCategoryWeights()
    {
        var parsed = JsonSerializer.Deserialize<Dictionary<string, int>>(CategoryWeightsJson)
                     ?? new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var topCategory in CategoryCatalog.TopCategories())
        {
            if (!parsed.ContainsKey(topCategory))
            {
                parsed[topCategory] = 0;
            }
        }

        return parsed;
    }

    public Dictionary<string, List<string>> GetIncludedSubAreas()
    {
        return JsonSerializer.Deserialize<Dictionary<string, List<string>>>(IncludedSubAreasJson)
               ?? new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
    }

    public List<string> GetBlockedCreators()
    {
        return JsonSerializer.Deserialize<List<string>>(BlockedCreatorsJson) ?? new List<string>();
    }

    public void SetCategoryWeights(Dictionary<string, int> weights)
    {
        CategoryWeightsJson = JsonSerializer.Serialize(weights);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetIncludedSubAreas(Dictionary<string, List<string>> includedSubAreas)
    {
        IncludedSubAreasJson = JsonSerializer.Serialize(includedSubAreas);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetBlockedCreators(IEnumerable<string> blockedCreators)
    {
        BlockedCreatorsJson = JsonSerializer.Serialize(blockedCreators.Distinct().ToList());
        UpdatedAt = DateTime.UtcNow;
    }
}

public sealed class Source
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(32)]
    public string Platform { get; set; } = "youtube";

    [MaxLength(200)]
    public string SourceId { get; set; } = string.Empty;

    [MaxLength(128)]
    public string AccessMode { get; set; } = "owned";

    [MaxLength(128)]
    public string TopCategory { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? SubArea { get; set; }

    public bool Enabled { get; set; } = true;
    public bool Whitelisted { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class Video
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(32)]
    public string Platform { get; set; } = "youtube";

    [MaxLength(255)]
    public string? PlatformVideoId { get; set; }

    [MaxLength(2000)]
    public string? PermalinkUrl { get; set; }

    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(200)]
    public string CreatorName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string CreatorId { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string ThumbnailUrl { get; set; } = string.Empty;

    public int? DurationSeconds { get; set; }

    [MaxLength(128)]
    public string TopCategory { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? SubArea { get; set; }

    [MaxLength(16)]
    public string? Language { get; set; }

    [Column(TypeName = "jsonb")]
    public string ExplainJson { get; set; } = "{}";

    [MaxLength(200)]
    public string SourceId { get; set; } = string.Empty;

    public bool Whitelisted { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
}

public sealed class VideoCategoryOverride
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VideoId { get; set; }
    public Video Video { get; set; } = null!;

    [MaxLength(128)]
    public string TopCategory { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? SubArea { get; set; }

    [MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(320)]
    public string UpdatedBy { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class FeedServed
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public Guid VideoId { get; set; }
    public Video Video { get; set; } = null!;

    public DateTime ServedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(128)]
    public string TopCategorySnapshot { get; set; } = string.Empty;
}

public sealed class EventView
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public Guid VideoId { get; set; }
    public Video Video { get; set; } = null!;

    public int WatchTimeSeconds { get; set; }
    public double CompletionRatio { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
}

public sealed class Report
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public Guid VideoId { get; set; }
    public Video Video { get; set; } = null!;

    [MaxLength(200)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Details { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class CategoryDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(128)]
    public string TopCategory { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? SubArea { get; set; }

    [MaxLength(500)]
    public string? Detail { get; set; }

    public bool Enabled { get; set; } = true;
}

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<Source> Sources => Set<Source>();
    public DbSet<Video> Videos => Set<Video>();
    public DbSet<FeedServed> FeedServed => Set<FeedServed>();
    public DbSet<EventView> EventViews => Set<EventView>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<CategoryDefinition> CategoryDefinitions => Set<CategoryDefinition>();
    public DbSet<VideoCategoryOverride> VideoCategoryOverrides => Set<VideoCategoryOverride>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("users");
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.Email).IsRequired();
            entity.Property(x => x.PasswordHash).IsRequired();
            entity.Property(x => x.Role).HasDefaultValue(AppRoles.User);
        });

        modelBuilder.Entity<UserPreference>(entity =>
        {
            entity.ToTable("user_preferences");
            entity.HasOne(x => x.User)
                .WithOne(x => x.Preference)
                .HasForeignKey<UserPreference>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(x => x.CategoryWeightsJson).HasColumnType("jsonb");
            entity.Property(x => x.IncludedSubAreasJson).HasColumnType("jsonb");
            entity.Property(x => x.BlockedCreatorsJson).HasColumnType("jsonb");
        });

        modelBuilder.Entity<Source>(entity =>
        {
            entity.ToTable("sources");
            entity.HasIndex(x => new { x.Platform, x.SourceId }).IsUnique();
            entity.Property(x => x.Platform).IsRequired();
            entity.Property(x => x.SourceId).IsRequired();
            entity.Property(x => x.TopCategory).IsRequired();
        });

        modelBuilder.Entity<Video>(entity =>
        {
            entity.ToTable("videos");
            entity.HasIndex(x => new { x.Platform, x.PlatformVideoId }).IsUnique();
            entity.HasIndex(x => x.PermalinkUrl).IsUnique();
            entity.HasIndex(x => x.TopCategory);
            entity.HasIndex(x => x.SourceId);
            entity.Property(x => x.ExplainJson).HasColumnType("jsonb");
            entity.Property(x => x.TopCategory).IsRequired();
            entity.Property(x => x.Title).IsRequired();
            entity.Property(x => x.CreatorName).IsRequired();
            entity.Property(x => x.CreatorId).IsRequired();
        });

        modelBuilder.Entity<VideoCategoryOverride>(entity =>
        {
            entity.ToTable("video_category_overrides");
            entity.HasIndex(x => x.VideoId).IsUnique();
            entity.HasOne(x => x.Video)
                .WithMany()
                .HasForeignKey(x => x.VideoId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(x => x.TopCategory).IsRequired();
        });

        modelBuilder.Entity<FeedServed>(entity =>
        {
            entity.ToTable("feed_served");
            entity.HasIndex(x => new { x.UserId, x.ServedAt });
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Video)
                .WithMany()
                .HasForeignKey(x => x.VideoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EventView>(entity =>
        {
            entity.ToTable("events_views");
            entity.HasIndex(x => new { x.UserId, x.ViewedAt });
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Video).WithMany().HasForeignKey(x => x.VideoId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Report>(entity =>
        {
            entity.ToTable("reports");
            entity.HasIndex(x => new { x.UserId, x.CreatedAt });
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Video).WithMany().HasForeignKey(x => x.VideoId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CategoryDefinition>(entity =>
        {
            entity.ToTable("categories");
            entity.HasIndex(x => new { x.TopCategory, x.SubArea }).IsUnique();
            entity.Property(x => x.TopCategory).IsRequired();
        });
    }
}

public static class TextNormalizer
{
    public static string Normalize(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var chars = value.ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : ' ')
            .ToArray();
        return string.Join(' ', new string(chars).Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }
}
