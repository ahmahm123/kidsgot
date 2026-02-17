using System.Net.Http.Json;
using System.Text.Json;

namespace VideoFeed.Mobile;

public interface IVideoFeedApiClient
{
    Task<UserPreferencesModel> GetPreferencesAsync(CancellationToken cancellationToken = default);
    Task SavePreferencesAsync(UserPreferencesModel preferences, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FeedItemModel>> GetFeedAsync(int limit, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FeedItemModel>> GetHistoryAsync(int limit = 50, CancellationToken cancellationToken = default);
    Task TrackViewAsync(Guid videoId, int watchTimeSeconds, double completion, CancellationToken cancellationToken = default);
    Task ReportContentAsync(Guid videoId, string reason, string? details = null, CancellationToken cancellationToken = default);
}

public sealed class HybridVideoFeedApiClient(
    HttpClient httpClient,
    MockVideoFeedApiClient mockClient) : IVideoFeedApiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<UserPreferencesModel> GetPreferencesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await httpClient.GetAsync("users/preferences", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return await mockClient.GetPreferencesAsync(cancellationToken);
            }

            var payload = await response.Content.ReadFromJsonAsync<UserPreferencesModel>(JsonOptions, cancellationToken);
            return payload ?? await mockClient.GetPreferencesAsync(cancellationToken);
        }
        catch
        {
            return await mockClient.GetPreferencesAsync(cancellationToken);
        }
    }

    public async Task SavePreferencesAsync(UserPreferencesModel preferences, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await httpClient.PutAsJsonAsync("users/preferences", preferences, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                await mockClient.SavePreferencesAsync(preferences, cancellationToken);
            }
        }
        catch
        {
            await mockClient.SavePreferencesAsync(preferences, cancellationToken);
        }
    }

    public async Task<IReadOnlyList<FeedItemModel>> GetFeedAsync(int limit, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await httpClient.GetAsync($"feed?limit={limit}", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return await mockClient.GetFeedAsync(limit, cancellationToken);
            }

            var payload = await response.Content.ReadFromJsonAsync<FeedEnvelope>(JsonOptions, cancellationToken);
            return payload?.Items ?? await mockClient.GetFeedAsync(limit, cancellationToken);
        }
        catch
        {
            return await mockClient.GetFeedAsync(limit, cancellationToken);
        }
    }

    public async Task<IReadOnlyList<FeedItemModel>> GetHistoryAsync(int limit = 50, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await httpClient.GetAsync($"users/history?limit={limit}", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return await mockClient.GetHistoryAsync(limit, cancellationToken);
            }

            var payload = await response.Content.ReadFromJsonAsync<List<FeedItemModel>>(JsonOptions, cancellationToken);
            return payload ?? await mockClient.GetHistoryAsync(limit, cancellationToken);
        }
        catch
        {
            return await mockClient.GetHistoryAsync(limit, cancellationToken);
        }
    }

    public async Task TrackViewAsync(Guid videoId, int watchTimeSeconds, double completion, CancellationToken cancellationToken = default)
    {
        try
        {
            await httpClient.PostAsJsonAsync(
                "events/view",
                new
                {
                    VideoId = videoId,
                    WatchTimeSeconds = watchTimeSeconds,
                    Completion = completion
                },
                cancellationToken);
        }
        catch
        {
            await mockClient.TrackViewAsync(videoId, watchTimeSeconds, completion, cancellationToken);
        }
    }

    public async Task ReportContentAsync(Guid videoId, string reason, string? details = null, CancellationToken cancellationToken = default)
    {
        try
        {
            await httpClient.PostAsJsonAsync(
                "moderation/report",
                new
                {
                    VideoId = videoId,
                    Reason = reason,
                    Details = details
                },
                cancellationToken);
        }
        catch
        {
            await mockClient.ReportContentAsync(videoId, reason, details, cancellationToken);
        }
    }

    private sealed class FeedEnvelope
    {
        public List<FeedItemModel> Items { get; set; } = new();
    }
}

public sealed class MockVideoFeedApiClient : IVideoFeedApiClient
{
    private readonly List<FeedItemModel> _seedItems;
    private readonly List<FeedItemModel> _history = new();
    private UserPreferencesModel _preferences = new();

    public MockVideoFeedApiClient()
    {
        _seedItems = BuildSeedItems();
    }

    public Task<UserPreferencesModel> GetPreferencesAsync(CancellationToken cancellationToken = default)
        => Task.FromResult(_preferences);

    public Task SavePreferencesAsync(UserPreferencesModel preferences, CancellationToken cancellationToken = default)
    {
        _preferences = preferences;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<FeedItemModel>> GetFeedAsync(int limit, CancellationToken cancellationToken = default)
    {
        var items = _seedItems.Take(Math.Max(1, limit)).ToList();
        return Task.FromResult<IReadOnlyList<FeedItemModel>>(items);
    }

    public Task<IReadOnlyList<FeedItemModel>> GetHistoryAsync(int limit = 50, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<FeedItemModel>>(_history.Take(Math.Max(1, limit)).ToList());
    }

    public Task TrackViewAsync(Guid videoId, int watchTimeSeconds, double completion, CancellationToken cancellationToken = default)
    {
        var match = _seedItems.FirstOrDefault(x => x.VideoId == videoId);
        if (match is not null)
        {
            _history.Insert(0, match);
            if (_history.Count > 50)
            {
                _history.RemoveAt(_history.Count - 1);
            }
        }

        return Task.CompletedTask;
    }

    public Task ReportContentAsync(Guid videoId, string reason, string? details = null, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    private static List<FeedItemModel> BuildSeedItems()
    {
        var list = new List<FeedItemModel>();
        var platformCycle = new[] { "youtube", "instagram", "facebook" };
        var i = 0;
        foreach (var top in MobileCategoryCatalog.Definitions)
        {
            var subAreas = top.RequiresSubArea
                ? top.SubAreas.Select(x => x.Name).ToList()
                : new List<string?> { null };
            foreach (var sub in subAreas)
            {
                i++;
                var platform = platformCycle[i % platformCycle.Length];
                list.Add(new FeedItemModel
                {
                    VideoId = Guid.NewGuid(),
                    Platform = platform,
                    PlatformVideoId = $"{platform}-{i:0000}",
                    PermalinkUrl = platform == "youtube"
                        ? $"https://www.youtube.com/embed/{platform}-{i:0000}"
                        : $"https://{platform}.example.com/reel/{platform}-{i:0000}",
                    Title = string.IsNullOrWhiteSpace(sub) ? $"{top.Name} short" : $"{sub} short",
                    CreatorName = $"Mock Creator {top.Name}",
                    CreatorId = $"mock-{top.Name}-{i:0000}",
                    ThumbnailUrl = $"https://picsum.photos/seed/{i}/480/800",
                    DurationSeconds = 35 + (i % 40),
                    TopCategory = top.Name,
                    SubArea = sub,
                    SourceId = $"source-{platform}-{i:0000}",
                    Whitelisted = true,
                    Explain = new ExplainModel
                    {
                        Mode = "contentBased",
                        Reason = string.IsNullOrWhiteSpace(sub)
                            ? $"Matched keywords for {top.Name}"
                            : $"Matched keywords for {top.Name} / {sub}",
                        MatchedKeywords = string.IsNullOrWhiteSpace(sub)
                            ? new List<string> { top.Name.ToLowerInvariant() }
                            : new List<string> { sub.ToLowerInvariant() }
                    }
                });
            }
        }

        return list;
    }
}
