using System.ComponentModel.DataAnnotations;

namespace VideoFeed.Api;

public sealed class RegisterRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;
}

public sealed class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public sealed class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = AppRoles.User;
    public DateTime ExpiresAtUtc { get; set; }
}

public sealed class UserPreferencesDto
{
    public Dictionary<string, int> CategoryWeights { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, List<string>> IncludedSubAreas { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public List<string> BlockedCreators { get; set; } = new();
    public bool DataSaverMode { get; set; }
    public bool KidSafeMode { get; set; } = true;
}

public sealed class FeedResponse
{
    public List<FeedItemDto> Items { get; set; } = new();
    public Dictionary<string, int> ServedCounts { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, int> TargetCounts { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public List<string> Warnings { get; set; } = new();
    public int RollingWindowSize { get; set; } = 100;
}

public sealed class FeedItemDto
{
    public Guid VideoId { get; set; }
    public string Platform { get; set; } = "youtube";
    public string? PlatformVideoId { get; set; }
    public string? PermalinkUrl { get; set; }
    public string Title { get; set; } = string.Empty;
    public string CreatorName { get; set; } = string.Empty;
    public string CreatorId { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public int? DurationSeconds { get; set; }
    public string TopCategory { get; set; } = string.Empty;
    public string? SubArea { get; set; }
    public string? Language { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime FetchedAt { get; set; }
    public string SourceId { get; set; } = string.Empty;
    public bool Whitelisted { get; set; }
    public ExplainDto Explain { get; set; } = new();
}

public sealed class ExplainDto
{
    public string Mode { get; set; } = string.Empty;
    public List<string> MatchedKeywords { get; set; } = new();
    public string Reason { get; set; } = string.Empty;
}

public sealed class ViewEventRequest
{
    [Required]
    public Guid VideoId { get; set; }

    [Range(0, int.MaxValue)]
    public int WatchTimeSeconds { get; set; }

    [Range(0, 1)]
    public double Completion { get; set; }
}

public sealed class ReportRequest
{
    [Required]
    public Guid VideoId { get; set; }

    [Required]
    public string Reason { get; set; } = string.Empty;

    public string? Details { get; set; }
}

public sealed class SourceUpsertRequest
{
    [Required]
    public string Platform { get; set; } = "youtube";

    [Required]
    public string SourceId { get; set; } = string.Empty;

    [Required]
    public string TopCategory { get; set; } = string.Empty;

    public string? SubArea { get; set; }
    public bool Enabled { get; set; } = true;
    public bool Whitelisted { get; set; } = true;
    public string AccessMode { get; set; } = "owned";
}

public sealed class CategoryUpsertRequest
{
    [Required]
    public string TopCategory { get; set; } = string.Empty;

    public string? SubArea { get; set; }

    public string? Detail { get; set; }

    public bool Enabled { get; set; } = true;
}

public sealed class VideoCategoryOverrideRequest
{
    [Required]
    public Guid VideoId { get; set; }

    [Required]
    public string TopCategory { get; set; } = string.Empty;

    public string? SubArea { get; set; }

    [Required]
    public string Reason { get; set; } = string.Empty;
}

public sealed class ProviderCandidate
{
    public string Platform { get; set; } = "youtube";
    public string? PlatformVideoId { get; set; }
    public string? PermalinkUrl { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CreatorName { get; set; } = string.Empty;
    public string CreatorId { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public int? DurationSeconds { get; set; }
    public string? Language { get; set; }
    public string SourceId { get; set; } = string.Empty;
    public bool Whitelisted { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
    public List<string> Hashtags { get; set; } = new();
}

public sealed class ProviderQuery
{
    public string TopCategory { get; init; } = string.Empty;
    public string? SubArea { get; init; }
    public int Limit { get; init; } = 20;
}

public sealed class ProviderResult
{
    public string ProviderName { get; init; } = string.Empty;
    public bool Enabled { get; init; }
    public List<string> Messages { get; init; } = new();
    public List<ProviderCandidate> Candidates { get; init; } = new();
}

public sealed class CategorizationResult
{
    public string TopCategory { get; init; } = string.Empty;
    public string? SubArea { get; init; }
    public ExplainDto Explain { get; init; } = new();
}

public sealed class FeedAlgorithmResult
{
    public List<Video> SelectedVideos { get; set; } = new();
    public Dictionary<string, int> ServedCounts { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, int> TargetCounts { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public List<string> Warnings { get; set; } = new();
}
