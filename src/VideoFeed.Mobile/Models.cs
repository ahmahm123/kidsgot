namespace VideoFeed.Mobile;

public sealed record SubAreaOption(string Name, string Detail)
{
    public string Display => $"{Name} - {Detail}";
}

public sealed record TopCategoryOption(string Name, bool RequiresSubArea, IReadOnlyList<SubAreaOption> SubAreas);

public static class MobileCategoryCatalog
{
    public static readonly IReadOnlyList<TopCategoryOption> Definitions = new[]
    {
        new TopCategoryOption(
            "Learning & Brain Boosting",
            true,
            new[]
            {
                new SubAreaOption("Math Fun", "Easy tricks, puzzles, number games"),
                new SubAreaOption("Science Experiments", "Safe, simple home experiments"),
                new SubAreaOption("Space & Planets", "Stars, astronauts, solar system"),
                new SubAreaOption("History Stories", "Kid-friendly past events"),
                new SubAreaOption("Geography & Countries", "Maps, cultures, landmarks"),
                new SubAreaOption("Reading & Storytime", "Short stories, moral tales"),
                new SubAreaOption("Spelling & Vocabulary", "Word games"),
                new SubAreaOption("Coding for Kids", "Simple logic & beginner coding"),
                new SubAreaOption("Robotics & STEM", "Basic engineering fun"),
                new SubAreaOption("Fun Facts", "Amazing kid-safe facts")
            }),
        new TopCategoryOption(
            "Creativity & Expression",
            true,
            new[]
            {
                new SubAreaOption("Drawing & Art", "Step-by-step drawing"),
                new SubAreaOption("DIY Crafts", "Paper crafts, creative builds"),
                new SubAreaOption("Music & Singing", "Songs, instruments"),
                new SubAreaOption("Dance & Movement", "Simple choreography"),
                new SubAreaOption("Acting & Skits", "Short role-play fun"),
                new SubAreaOption("Photography Basics", "Kid creativity with cameras"),
                new SubAreaOption("Creative Writing", "Short poem or story prompts"),
                new SubAreaOption("Origami", "Paper folding"),
                new SubAreaOption("Magic Tricks (Safe)", "Easy illusion tricks"),
                new SubAreaOption("LEGO & Building", "Building challenges")
            }),
        new TopCategoryOption(
            "Life Skills & Positive Growth",
            true,
            new[]
            {
                new SubAreaOption("Kindness & Good Manners", "Respect & empathy"),
                new SubAreaOption("Friendship Lessons", "Sharing & teamwork"),
                new SubAreaOption("Health & Hygiene", "Brushing, eating healthy"),
                new SubAreaOption("Mindfulness & Calm Time", "Simple breathing exercises"),
                new SubAreaOption("Problem Solving", "Brain teasers"),
                new SubAreaOption("Money Basics", "Saving & understanding coins"),
                new SubAreaOption("Safety Tips", "Road safety, stranger safety"),
                new SubAreaOption("Environmental Care", "Recycling, saving water"),
                new SubAreaOption("Sports Skills", "Beginner techniques"),
                new SubAreaOption("Animal & Wildlife", "Cute animals + learning facts")
            }),
        new TopCategoryOption("Comedy", false, Array.Empty<SubAreaOption>()),
        new TopCategoryOption("Public Speaking", false, Array.Empty<SubAreaOption>()),
        new TopCategoryOption("Sports", false, Array.Empty<SubAreaOption>()),
        new TopCategoryOption("Business", false, Array.Empty<SubAreaOption>())
    };

    public static Dictionary<string, int> DefaultWeights => new(StringComparer.OrdinalIgnoreCase)
    {
        ["Learning & Brain Boosting"] = 15,
        ["Creativity & Expression"] = 20,
        ["Life Skills & Positive Growth"] = 15,
        ["Comedy"] = 15,
        ["Public Speaking"] = 15,
        ["Sports"] = 15,
        ["Business"] = 5
    };
}

public sealed class UserPreferencesModel
{
    public Dictionary<string, int> CategoryWeights { get; set; } = new(MobileCategoryCatalog.DefaultWeights, StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, List<string>> IncludedSubAreas { get; set; } = MobileCategoryCatalog.Definitions
        .Where(x => x.RequiresSubArea)
        .ToDictionary(x => x.Name, x => x.SubAreas.Select(s => s.Name).ToList(), StringComparer.OrdinalIgnoreCase);
    public List<string> BlockedCreators { get; set; } = new();
    public bool DataSaverMode { get; set; }
    public bool KidSafeMode { get; set; } = true;
}

public sealed class ExplainModel
{
    public string Mode { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public List<string> MatchedKeywords { get; set; } = new();
}

public sealed class FeedItemModel
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
    public string SourceId { get; set; } = string.Empty;
    public bool Whitelisted { get; set; }
    public ExplainModel Explain { get; set; } = new();

    public string CategoryLabel => string.IsNullOrWhiteSpace(SubArea) ? TopCategory : $"{TopCategory} / {SubArea}";
}
