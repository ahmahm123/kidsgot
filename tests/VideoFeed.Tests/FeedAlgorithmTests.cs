using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using VideoFeed.Api;
using Xunit;

namespace VideoFeed.Tests;

public sealed class FeedAlgorithmTests
{
    private static FeedService CreateService()
    {
        return new FeedService(
            dbContext: null!,
            providerCoordinator: null!,
            userPreferenceService: null!,
            optionsAccessor: Options.Create(new FeedOptions
            {
                RollingWindowSize = 100,
                RepeatCreatorWindow = 10
            }),
            logger: NullLogger<FeedService>.Instance);
    }

    [Fact]
    public void SelectVideos_PrioritizesUnderservedCategory()
    {
        var service = CreateService();
        var allCategories = CategoryCatalog.TopCategories();

        var candidates = new Dictionary<string, List<Video>>(StringComparer.OrdinalIgnoreCase);
        foreach (var category in allCategories)
        {
            candidates[category] = Enumerable.Range(1, 20)
                .Select(i => BuildVideo(category, i))
                .ToList();
        }

        var servedCounts = allCategories.ToDictionary(x => x, _ => 0, StringComparer.OrdinalIgnoreCase);
        servedCounts["Creativity & Expression"] = 35;
        servedCounts["Learning & Brain Boosting"] = 5;

        var targetCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["Learning & Brain Boosting"] = 15,
            ["Creativity & Expression"] = 20,
            ["Life Skills & Positive Growth"] = 15,
            ["Comedy"] = 15,
            ["Public Speaking"] = 15,
            ["Sports"] = 15,
            ["Business"] = 5
        };

        var result = service.SelectVideos(
            limit: 20,
            categoryCandidates: candidates,
            initialServedCounts: servedCounts,
            targetCounts: targetCounts,
            blockedCreators: new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            includedSubAreas: CategoryCatalog.DefaultIncludedSubAreas(),
            recentServedVideos: new List<Video>());

        var learningCount = result.SelectedVideos.Count(v => v.TopCategory == "Learning & Brain Boosting");
        var creativityCount = result.SelectedVideos.Count(v => v.TopCategory == "Creativity & Expression");

        Assert.Equal(20, result.SelectedVideos.Count);
        Assert.True(
            learningCount >= creativityCount,
            $"Expected underserved category to be prioritized. Learning={learningCount}, Creativity={creativityCount}");
    }

    [Fact]
    public void SelectVideos_HandlesCategoryShortageByDegradingGracefully()
    {
        var service = CreateService();
        var candidates = CategoryCatalog.TopCategories()
            .ToDictionary(cat => cat, _ => new List<Video>(), StringComparer.OrdinalIgnoreCase);

        candidates["Comedy"] = Enumerable.Range(1, 8).Select(i => BuildVideo("Comedy", i)).ToList();

        var servedCounts = CategoryCatalog.TopCategories().ToDictionary(x => x, _ => 0, StringComparer.OrdinalIgnoreCase);
        var targetCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["Learning & Brain Boosting"] = 15,
            ["Creativity & Expression"] = 20,
            ["Life Skills & Positive Growth"] = 15,
            ["Comedy"] = 15,
            ["Public Speaking"] = 15,
            ["Sports"] = 15,
            ["Business"] = 5
        };

        var result = service.SelectVideos(
            limit: 8,
            categoryCandidates: candidates,
            initialServedCounts: servedCounts,
            targetCounts: targetCounts,
            blockedCreators: new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            includedSubAreas: CategoryCatalog.DefaultIncludedSubAreas(),
            recentServedVideos: new List<Video>());

        Assert.Equal(8, result.SelectedVideos.Count);
        Assert.All(result.SelectedVideos, video => Assert.Equal("Comedy", video.TopCategory));
    }

    private static Video BuildVideo(string topCategory, int index)
    {
        var subArea = CategoryCatalog.RequiresSubArea(topCategory)
            ? CategoryCatalog.SubAreasFor(topCategory).First()
            : null;

        return new Video
        {
            Id = Guid.NewGuid(),
            Platform = "youtube",
            PlatformVideoId = $"{TextNormalizer.Normalize(topCategory).Replace(" ", "-", StringComparison.Ordinal)}-{index}",
            PermalinkUrl = $"https://www.youtube.com/watch?v={Guid.NewGuid():N}",
            Title = $"{topCategory} video {index}",
            Description = "seeded",
            CreatorName = $"Creator {index}",
            CreatorId = $"creator-{index}",
            ThumbnailUrl = $"https://picsum.photos/seed/{index}/480/800",
            DurationSeconds = 30,
            TopCategory = topCategory,
            SubArea = subArea,
            SourceId = "unit-tests",
            Whitelisted = true,
            CreatedAt = DateTime.UtcNow,
            FetchedAt = DateTime.UtcNow
        };
    }
}
