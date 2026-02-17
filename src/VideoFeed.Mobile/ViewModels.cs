using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace VideoFeed.Mobile;

public abstract class BaseViewModel : INotifyPropertyChanged
{
    private bool _isBusy;
    private string _title = string.Empty;

    public event PropertyChangedEventHandler? PropertyChanged;

    public bool IsBusy
    {
        get => _isBusy;
        set => SetProperty(ref _isBusy, value);
    }

    public string Title
    {
        get => _title;
        set => SetProperty(ref _title, value);
    }

    protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string propertyName = "")
    {
        if (EqualityComparer<T>.Default.Equals(field, value))
        {
            return false;
        }

        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        return true;
    }
}

public sealed class CategoryWeightItemViewModel : BaseViewModel
{
    private int _weight;

    public CategoryWeightItemViewModel(string topCategory, int weight)
    {
        TopCategory = topCategory;
        _weight = weight;
    }

    public string TopCategory { get; }

    public int Weight
    {
        get => _weight;
        set
        {
            var clamped = Math.Clamp(value, 0, 100);
            if (SetProperty(ref _weight, clamped))
            {
                WeightChanged?.Invoke(this, EventArgs.Empty);
            }
        }
    }

    public event EventHandler? WeightChanged;
}

public sealed class SubAreaSelectionViewModel : BaseViewModel
{
    private bool _isIncluded;

    public SubAreaSelectionViewModel(string topCategory, string subArea, string detail, bool isIncluded)
    {
        TopCategory = topCategory;
        SubArea = subArea;
        Detail = detail;
        _isIncluded = isIncluded;
    }

    public string TopCategory { get; }
    public string SubArea { get; }
    public string Detail { get; }
    public string Display => $"{SubArea} - {Detail}";

    public bool IsIncluded
    {
        get => _isIncluded;
        set => SetProperty(ref _isIncluded, value);
    }
}

public sealed class OnboardingViewModel : BaseViewModel
{
    private readonly IVideoFeedApiClient _apiClient;
    private int _totalWeight;
    private string _statusMessage = string.Empty;

    public OnboardingViewModel(IVideoFeedApiClient apiClient)
    {
        _apiClient = apiClient;
        Title = "Onboarding";
        NormalizeCommand = new Command(NormalizeWeights);
        SaveCommand = new Command(async () => await SaveAsync());
        LoadCommand = new Command(async () => await LoadAsync());
    }

    public ObservableCollection<CategoryWeightItemViewModel> CategoryWeights { get; } = new();
    public ObservableCollection<SubAreaSelectionViewModel> SubAreaSelections { get; } = new();
    public Command NormalizeCommand { get; }
    public Command SaveCommand { get; }
    public Command LoadCommand { get; }

    public int TotalWeight
    {
        get => _totalWeight;
        private set => SetProperty(ref _totalWeight, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetProperty(ref _statusMessage, value);
    }

    public async Task LoadAsync()
    {
        if (IsBusy)
        {
            return;
        }

        IsBusy = true;
        try
        {
            CategoryWeights.Clear();
            SubAreaSelections.Clear();

            var prefs = await _apiClient.GetPreferencesAsync();
            foreach (var category in MobileCategoryCatalog.Definitions)
            {
                var weight = prefs.CategoryWeights.GetValueOrDefault(category.Name, 0);
                var item = new CategoryWeightItemViewModel(category.Name, weight);
                item.WeightChanged += (_, _) => TotalWeight = CategoryWeights.Sum(x => x.Weight);
                CategoryWeights.Add(item);

                if (!category.RequiresSubArea)
                {
                    continue;
                }

                var included = prefs.IncludedSubAreas.GetValueOrDefault(category.Name, new List<string>());
                foreach (var sub in category.SubAreas)
                {
                    SubAreaSelections.Add(new SubAreaSelectionViewModel(
                        category.Name,
                        sub.Name,
                        sub.Detail,
                        included.Contains(sub.Name, StringComparer.OrdinalIgnoreCase)));
                }
            }

            TotalWeight = CategoryWeights.Sum(x => x.Weight);
            StatusMessage = "Loaded preferences.";
        }
        finally
        {
            IsBusy = false;
        }
    }

    public void NormalizeWeights()
    {
        if (CategoryWeights.Count == 0)
        {
            return;
        }

        var sum = CategoryWeights.Sum(x => x.Weight);
        if (sum <= 0)
        {
            foreach (var row in CategoryWeights)
            {
                row.Weight = MobileCategoryCatalog.DefaultWeights.GetValueOrDefault(row.TopCategory, 0);
            }

            TotalWeight = CategoryWeights.Sum(x => x.Weight);
            StatusMessage = "Reset to default 100% split.";
            return;
        }

        var scaled = CategoryWeights
            .Select(row =>
            {
                var scaledValue = (decimal)row.Weight * 100m / sum;
                return new { row.TopCategory, Floored = (int)Math.Floor(scaledValue), Fraction = scaledValue - Math.Floor(scaledValue) };
            })
            .ToList();

        var distributed = scaled.ToDictionary(x => x.TopCategory, x => x.Floored, StringComparer.OrdinalIgnoreCase);
        var remainder = 100 - distributed.Values.Sum();
        foreach (var row in scaled.OrderByDescending(x => x.Fraction).ThenBy(x => x.TopCategory).Take(remainder))
        {
            distributed[row.TopCategory] += 1;
        }

        foreach (var row in CategoryWeights)
        {
            row.Weight = distributed[row.TopCategory];
        }

        TotalWeight = CategoryWeights.Sum(x => x.Weight);
        StatusMessage = "Normalized to 100%.";
    }

    public async Task SaveAsync()
    {
        NormalizeWeights();
        var preferences = new UserPreferencesModel
        {
            CategoryWeights = CategoryWeights.ToDictionary(x => x.TopCategory, x => x.Weight, StringComparer.OrdinalIgnoreCase),
            IncludedSubAreas = SubAreaSelections
                .Where(x => x.IsIncluded)
                .GroupBy(x => x.TopCategory)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(x => x.SubArea).ToList(),
                    StringComparer.OrdinalIgnoreCase),
            DataSaverMode = false,
            KidSafeMode = true
        };
        await _apiClient.SavePreferencesAsync(preferences);
        StatusMessage = "Preferences saved.";
    }
}

public sealed class PreferencesViewModel : BaseViewModel
{
    private readonly IVideoFeedApiClient _apiClient;
    private string _newBlockedCreator = string.Empty;
    private bool _dataSaverMode;
    private bool _kidSafeMode = true;
    private string _statusMessage = string.Empty;

    public PreferencesViewModel(IVideoFeedApiClient apiClient)
    {
        _apiClient = apiClient;
        Title = "Preferences";
        LoadCommand = new Command(async () => await LoadAsync());
        AddBlockedCreatorCommand = new Command(AddBlockedCreator);
        RemoveBlockedCreatorCommand = new Command<string>(RemoveBlockedCreator);
        SaveCommand = new Command(async () => await SaveAsync());
    }

    public ObservableCollection<CategoryWeightItemViewModel> CategoryWeights { get; } = new();
    public ObservableCollection<string> BlockedCreators { get; } = new();
    public Command LoadCommand { get; }
    public Command AddBlockedCreatorCommand { get; }
    public Command RemoveBlockedCreatorCommand { get; }
    public Command SaveCommand { get; }

    public string NewBlockedCreator
    {
        get => _newBlockedCreator;
        set => SetProperty(ref _newBlockedCreator, value);
    }

    public bool DataSaverMode
    {
        get => _dataSaverMode;
        set => SetProperty(ref _dataSaverMode, value);
    }

    public bool KidSafeMode
    {
        get => _kidSafeMode;
        set => SetProperty(ref _kidSafeMode, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetProperty(ref _statusMessage, value);
    }

    public async Task LoadAsync()
    {
        if (IsBusy)
        {
            return;
        }

        IsBusy = true;
        try
        {
            var prefs = await _apiClient.GetPreferencesAsync();
            CategoryWeights.Clear();
            foreach (var category in MobileCategoryCatalog.Definitions)
            {
                CategoryWeights.Add(new CategoryWeightItemViewModel(category.Name, prefs.CategoryWeights.GetValueOrDefault(category.Name, 0)));
            }

            BlockedCreators.Clear();
            foreach (var creator in prefs.BlockedCreators)
            {
                BlockedCreators.Add(creator);
            }

            DataSaverMode = prefs.DataSaverMode;
            KidSafeMode = prefs.KidSafeMode;
            StatusMessage = "Preferences loaded.";
        }
        finally
        {
            IsBusy = false;
        }
    }

    private void AddBlockedCreator()
    {
        if (string.IsNullOrWhiteSpace(NewBlockedCreator))
        {
            return;
        }

        if (!BlockedCreators.Any(x => x.Equals(NewBlockedCreator, StringComparison.OrdinalIgnoreCase)))
        {
            BlockedCreators.Add(NewBlockedCreator.Trim());
        }

        NewBlockedCreator = string.Empty;
    }

    private void RemoveBlockedCreator(string? creator)
    {
        if (string.IsNullOrWhiteSpace(creator))
        {
            return;
        }

        var match = BlockedCreators.FirstOrDefault(x => x.Equals(creator, StringComparison.OrdinalIgnoreCase));
        if (match is not null)
        {
            BlockedCreators.Remove(match);
        }
    }

    public async Task SaveAsync()
    {
        var sum = CategoryWeights.Sum(x => x.Weight);
        if (sum != 100)
        {
            StatusMessage = $"Weight total is {sum} (must be 100).";
            return;
        }

        var prefs = new UserPreferencesModel
        {
            CategoryWeights = CategoryWeights.ToDictionary(x => x.TopCategory, x => x.Weight, StringComparer.OrdinalIgnoreCase),
            BlockedCreators = BlockedCreators.ToList(),
            DataSaverMode = DataSaverMode,
            KidSafeMode = KidSafeMode
        };
        await _apiClient.SavePreferencesAsync(prefs);
        StatusMessage = "Preferences saved.";
    }
}

public sealed class FeedViewModel : BaseViewModel
{
    private readonly IVideoFeedApiClient _apiClient;
    private FeedItemModel? _selectedItem;
    private string _statusMessage = string.Empty;

    public FeedViewModel(IVideoFeedApiClient apiClient)
    {
        _apiClient = apiClient;
        Title = "Feed";
        LoadCommand = new Command(async () => await LoadAsync());
        HideCreatorCommand = new Command<FeedItemModel>(async item => await HideCreatorAsync(item));
        ReportCommand = new Command<FeedItemModel>(async item => await ReportAsync(item));
    }

    public ObservableCollection<FeedItemModel> Items { get; } = new();
    public ObservableCollection<FeedItemModel> PreloadedItems { get; } = new();
    public Command LoadCommand { get; }
    public Command HideCreatorCommand { get; }
    public Command ReportCommand { get; }

    public FeedItemModel? SelectedItem
    {
        get => _selectedItem;
        set
        {
            if (SetProperty(ref _selectedItem, value) && value is not null)
            {
                _ = _apiClient.TrackViewAsync(value.VideoId, watchTimeSeconds: Math.Max(5, value.DurationSeconds ?? 15), completion: 0.7);
                ComputePreloadedItems(value);
            }
        }
    }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetProperty(ref _statusMessage, value);
    }

    public async Task LoadAsync()
    {
        if (IsBusy)
        {
            return;
        }

        IsBusy = true;
        try
        {
            var items = await _apiClient.GetFeedAsync(20);
            Items.Clear();
            foreach (var item in items)
            {
                Items.Add(item);
            }

            SelectedItem = Items.FirstOrDefault();
            StatusMessage = $"Loaded {Items.Count} items.";
        }
        finally
        {
            IsBusy = false;
        }
    }

    private void ComputePreloadedItems(FeedItemModel current)
    {
        PreloadedItems.Clear();
        var index = Items.IndexOf(current);
        if (index < 0)
        {
            return;
        }

        foreach (var item in Items.Skip(index + 1).Take(2))
        {
            PreloadedItems.Add(item);
        }
    }

    private async Task HideCreatorAsync(FeedItemModel? item)
    {
        if (item is null)
        {
            return;
        }

        var toRemove = Items.Where(x => x.CreatorId == item.CreatorId).ToList();
        foreach (var entry in toRemove)
        {
            Items.Remove(entry);
        }

        var prefs = await _apiClient.GetPreferencesAsync();
        if (!prefs.BlockedCreators.Any(x => x.Equals(item.CreatorId, StringComparison.OrdinalIgnoreCase)))
        {
            prefs.BlockedCreators.Add(item.CreatorId);
            await _apiClient.SavePreferencesAsync(prefs);
        }

        StatusMessage = $"Hidden creator: {item.CreatorName}.";
    }

    private async Task ReportAsync(FeedItemModel? item)
    {
        if (item is null)
        {
            return;
        }

        await _apiClient.ReportContentAsync(item.VideoId, "inappropriate", "Reported from mobile feed");
        StatusMessage = "Content reported.";
    }
}

public sealed class HistoryViewModel : BaseViewModel
{
    private readonly IVideoFeedApiClient _apiClient;

    public HistoryViewModel(IVideoFeedApiClient apiClient)
    {
        _apiClient = apiClient;
        Title = "History";
        LoadCommand = new Command(async () => await LoadAsync());
    }

    public ObservableCollection<FeedItemModel> Items { get; } = new();
    public Command LoadCommand { get; }

    public async Task LoadAsync()
    {
        if (IsBusy)
        {
            return;
        }

        IsBusy = true;
        try
        {
            var history = await _apiClient.GetHistoryAsync();
            Items.Clear();
            foreach (var item in history.Take(50))
            {
                Items.Add(item);
            }
        }
        finally
        {
            IsBusy = false;
        }
    }
}

public sealed class SettingsViewModel : BaseViewModel
{
    private readonly IVideoFeedApiClient _apiClient;
    private bool _kidSafeMode = true;
    private string _providerNotice =
        "Provider policy: no scraping. YouTube via Data API + official player; Meta via Graph API and permitted sources only.";

    public SettingsViewModel(IVideoFeedApiClient apiClient)
    {
        _apiClient = apiClient;
        Title = "Settings";
        SaveCommand = new Command(async () => await SaveAsync());
    }

    public bool KidSafeMode
    {
        get => _kidSafeMode;
        set => SetProperty(ref _kidSafeMode, value);
    }

    public string ProviderNotice
    {
        get => _providerNotice;
        set => SetProperty(ref _providerNotice, value);
    }

    public Command SaveCommand { get; }

    private async Task SaveAsync()
    {
        var prefs = await _apiClient.GetPreferencesAsync();
        prefs.KidSafeMode = KidSafeMode;
        await _apiClient.SavePreferencesAsync(prefs);
    }
}
