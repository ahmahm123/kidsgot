namespace VideoFeed.Mobile;

public sealed class OnboardingPage : ContentPage
{
    private readonly OnboardingViewModel _viewModel;

    public OnboardingPage(OnboardingViewModel viewModel)
    {
        _viewModel = viewModel;
        BindingContext = _viewModel;
        Title = "Onboarding";

        var weightsCollection = new CollectionView
        {
            ItemTemplate = new DataTemplate(() =>
            {
                var topLabel = new Label { FontAttributes = FontAttributes.Bold };
                topLabel.SetBinding(Label.TextProperty, nameof(CategoryWeightItemViewModel.TopCategory));

                var slider = new Slider(0, 100, 0);
                slider.SetBinding(Slider.ValueProperty, nameof(CategoryWeightItemViewModel.Weight), mode: BindingMode.TwoWay);

                var valueLabel = new Label { HorizontalTextAlignment = TextAlignment.End };
                valueLabel.SetBinding(Label.TextProperty, nameof(CategoryWeightItemViewModel.Weight), stringFormat: "{0}%");

                return new VerticalStackLayout
                {
                    Spacing = 6,
                    Margin = new Thickness(0, 8),
                    Children = { topLabel, slider, valueLabel }
                };
            })
        };
        weightsCollection.SetBinding(ItemsView.ItemsSourceProperty, nameof(OnboardingViewModel.CategoryWeights));

        var subAreasCollection = new CollectionView
        {
            ItemTemplate = new DataTemplate(() =>
            {
                var check = new CheckBox();
                check.SetBinding(CheckBox.IsCheckedProperty, nameof(SubAreaSelectionViewModel.IsIncluded), mode: BindingMode.TwoWay);

                var text = new Label { VerticalOptions = LayoutOptions.Center };
                text.SetBinding(Label.TextProperty, nameof(SubAreaSelectionViewModel.Display));

                var category = new Label { FontSize = 12, TextColor = Colors.Gray };
                category.SetBinding(Label.TextProperty, nameof(SubAreaSelectionViewModel.TopCategory));

                return new VerticalStackLayout
                {
                    Margin = new Thickness(0, 6),
                    Children =
                    {
                        new HorizontalStackLayout { Children = { check, text } },
                        category
                    }
                };
            })
        };
        subAreasCollection.SetBinding(ItemsView.ItemsSourceProperty, nameof(OnboardingViewModel.SubAreaSelections));

        var totalLabel = new Label { FontAttributes = FontAttributes.Bold };
        totalLabel.SetBinding(Label.TextProperty, nameof(OnboardingViewModel.TotalWeight), stringFormat: "Total: {0}%");

        var statusLabel = new Label { TextColor = Colors.Teal };
        statusLabel.SetBinding(Label.TextProperty, nameof(OnboardingViewModel.StatusMessage));

        Content = new ScrollView
        {
            Content = new VerticalStackLayout
            {
                Padding = 16,
                Spacing = 12,
                Children =
                {
                    new Label
                    {
                        Text = "Pick top categories and set weights to 100%.",
                        FontAttributes = FontAttributes.Bold
                    },
                    new Button { Text = "Load Current Preferences", Command = _viewModel.LoadCommand },
                    weightsCollection,
                    totalLabel,
                    new Button { Text = "Normalize to 100%", Command = _viewModel.NormalizeCommand },
                    new Label
                    {
                        Text = "Educational sub-areas (include/exclude):",
                        FontAttributes = FontAttributes.Bold
                    },
                    subAreasCollection,
                    new Button { Text = "Save Onboarding Preferences", Command = _viewModel.SaveCommand },
                    statusLabel
                }
            }
        };
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (_viewModel.CategoryWeights.Count == 0)
        {
            await _viewModel.LoadAsync();
        }
    }
}

public sealed class PreferencesPage : ContentPage
{
    private readonly PreferencesViewModel _viewModel;

    public PreferencesPage(PreferencesViewModel viewModel)
    {
        _viewModel = viewModel;
        BindingContext = _viewModel;
        Title = "Preferences";

        var weights = new CollectionView
        {
            ItemTemplate = new DataTemplate(() =>
            {
                var title = new Label { FontAttributes = FontAttributes.Bold };
                title.SetBinding(Label.TextProperty, nameof(CategoryWeightItemViewModel.TopCategory));

                var entry = new Entry { Keyboard = Keyboard.Numeric, WidthRequest = 80 };
                entry.SetBinding(Entry.TextProperty, nameof(CategoryWeightItemViewModel.Weight), mode: BindingMode.TwoWay);

                return new HorizontalStackLayout
                {
                    Children =
                    {
                        title,
                        new Label { Text = "  " },
                        entry,
                        new Label { Text = "%" }
                    }
                };
            })
        };
        weights.SetBinding(ItemsView.ItemsSourceProperty, nameof(PreferencesViewModel.CategoryWeights));

        var blockedList = new CollectionView
        {
            ItemTemplate = new DataTemplate(() =>
            {
                var label = new Label { VerticalOptions = LayoutOptions.Center };
                label.SetBinding(Label.TextProperty, ".");

                var button = new Button { Text = "Remove", FontSize = 12, Padding = new Thickness(8, 2) };
                button.SetBinding(Button.CommandProperty, new Binding(nameof(PreferencesViewModel.RemoveBlockedCreatorCommand), source: _viewModel));
                button.SetBinding(Button.CommandParameterProperty, ".");

                return new HorizontalStackLayout { Children = { label, button } };
            })
        };
        blockedList.SetBinding(ItemsView.ItemsSourceProperty, nameof(PreferencesViewModel.BlockedCreators));

        var blockedEntry = new Entry { Placeholder = "creator id/name" };
        blockedEntry.SetBinding(Entry.TextProperty, nameof(PreferencesViewModel.NewBlockedCreator), mode: BindingMode.TwoWay);

        var dataSaver = new Switch();
        dataSaver.SetBinding(Switch.IsToggledProperty, nameof(PreferencesViewModel.DataSaverMode), mode: BindingMode.TwoWay);
        var kidSafe = new Switch();
        kidSafe.SetBinding(Switch.IsToggledProperty, nameof(PreferencesViewModel.KidSafeMode), mode: BindingMode.TwoWay);

        var status = new Label { TextColor = Colors.Teal };
        status.SetBinding(Label.TextProperty, nameof(PreferencesViewModel.StatusMessage));

        Content = new ScrollView
        {
            Content = new VerticalStackLayout
            {
                Padding = 16,
                Spacing = 10,
                Children =
                {
                    new Button { Text = "Load", Command = _viewModel.LoadCommand },
                    new Label { Text = "Category weights (must total 100):", FontAttributes = FontAttributes.Bold },
                    weights,
                    new Label { Text = "Blocked creators:", FontAttributes = FontAttributes.Bold },
                    new HorizontalStackLayout
                    {
                        Children =
                        {
                            blockedEntry,
                            new Button { Text = "Add", Command = _viewModel.AddBlockedCreatorCommand }
                        }
                    },
                    blockedList,
                    new HorizontalStackLayout { Children = { new Label { Text = "Data Saver Mode" }, dataSaver } },
                    new HorizontalStackLayout { Children = { new Label { Text = "Kid-safe Mode" }, kidSafe } },
                    new Button { Text = "Save Preferences", Command = _viewModel.SaveCommand },
                    status
                }
            }
        };
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (_viewModel.CategoryWeights.Count == 0)
        {
            await _viewModel.LoadAsync();
        }
    }
}

public sealed class FeedPage : ContentPage
{
    private readonly FeedViewModel _viewModel;

    public FeedPage(FeedViewModel viewModel)
    {
        _viewModel = viewModel;
        BindingContext = _viewModel;
        Title = "Feed";

        var carousel = new CarouselView
        {
            ItemsLayout = new LinearItemsLayout(ItemsLayoutOrientation.Vertical),
            ItemTemplate = new DataTemplate(() =>
            {
                var web = new WebView { HeightRequest = 420 };
                web.SetBinding(WebView.SourceProperty, nameof(FeedItemModel.PermalinkUrl));

                var category = new Label { FontAttributes = FontAttributes.Bold, TextColor = Colors.Indigo };
                category.SetBinding(Label.TextProperty, nameof(FeedItemModel.CategoryLabel));

                var title = new Label { FontSize = 16, FontAttributes = FontAttributes.Bold };
                title.SetBinding(Label.TextProperty, nameof(FeedItemModel.Title));

                var creator = new Label { FontSize = 12, TextColor = Colors.Gray };
                creator.SetBinding(Label.TextProperty, nameof(FeedItemModel.CreatorName), stringFormat: "Creator: {0}");

                var whyHeader = new Label { Text = "Why am I seeing this?", FontAttributes = FontAttributes.Bold };
                var whyText = new Label { FontSize = 12 };
                whyText.SetBinding(Label.TextProperty, "Explain.Reason");

                var hideButton = new Button { Text = "Hide this creator", FontSize = 12 };
                hideButton.SetBinding(Button.CommandProperty, new Binding(nameof(FeedViewModel.HideCreatorCommand), source: _viewModel));
                hideButton.SetBinding(Button.CommandParameterProperty, ".");

                var reportButton = new Button { Text = "Report content", FontSize = 12 };
                reportButton.SetBinding(Button.CommandProperty, new Binding(nameof(FeedViewModel.ReportCommand), source: _viewModel));
                reportButton.SetBinding(Button.CommandParameterProperty, ".");

                return new ScrollView
                {
                    Content = new VerticalStackLayout
                    {
                        Padding = 12,
                        Spacing = 8,
                        Children =
                        {
                            web,
                            category,
                            title,
                            creator,
                            whyHeader,
                            whyText,
                            new HorizontalStackLayout { Children = { hideButton, reportButton } }
                        }
                    }
                };
            })
        };
        carousel.SetBinding(ItemsView.ItemsSourceProperty, nameof(FeedViewModel.Items));
        carousel.SetBinding(CarouselView.CurrentItemProperty, nameof(FeedViewModel.SelectedItem), mode: BindingMode.TwoWay);

        var status = new Label { TextColor = Colors.Teal };
        status.SetBinding(Label.TextProperty, nameof(FeedViewModel.StatusMessage));

        Content = new VerticalStackLayout
        {
            Padding = 12,
            Children =
            {
                new Button { Text = "Refresh Feed", Command = _viewModel.LoadCommand },
                carousel,
                status
            }
        };
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (_viewModel.Items.Count == 0)
        {
            await _viewModel.LoadAsync();
        }
    }
}

public sealed class HistoryPage : ContentPage
{
    private readonly HistoryViewModel _viewModel;

    public HistoryPage(HistoryViewModel viewModel)
    {
        _viewModel = viewModel;
        BindingContext = _viewModel;
        Title = "History";

        var list = new CollectionView
        {
            ItemTemplate = new DataTemplate(() =>
            {
                var title = new Label { FontAttributes = FontAttributes.Bold };
                title.SetBinding(Label.TextProperty, nameof(FeedItemModel.Title));

                var subtitle = new Label { FontSize = 12, TextColor = Colors.Gray };
                subtitle.SetBinding(Label.TextProperty, nameof(FeedItemModel.CategoryLabel));

                return new VerticalStackLayout
                {
                    Margin = new Thickness(0, 8),
                    Children = { title, subtitle }
                };
            })
        };
        list.SetBinding(ItemsView.ItemsSourceProperty, nameof(HistoryViewModel.Items));

        Content = new VerticalStackLayout
        {
            Padding = 16,
            Children =
            {
                new Button { Text = "Load last 50", Command = _viewModel.LoadCommand },
                list
            }
        };
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (_viewModel.Items.Count == 0)
        {
            await _viewModel.LoadAsync();
        }
    }
}

public sealed class SettingsPage : ContentPage
{
    public SettingsPage(SettingsViewModel viewModel)
    {
        BindingContext = viewModel;
        Title = "Settings";

        var notice = new Label { FontSize = 12, TextColor = Colors.DarkSlateBlue };
        notice.SetBinding(Label.TextProperty, nameof(SettingsViewModel.ProviderNotice));

        var kidSafe = new Switch();
        kidSafe.SetBinding(Switch.IsToggledProperty, nameof(SettingsViewModel.KidSafeMode), mode: BindingMode.TwoWay);

        Content = new ScrollView
        {
            Content = new VerticalStackLayout
            {
                Padding = 16,
                Spacing = 10,
                Children =
                {
                    new Label { Text = "Provider constraints", FontAttributes = FontAttributes.Bold },
                    notice,
                    new HorizontalStackLayout { Children = { new Label { Text = "Kid-safe mode" }, kidSafe } },
                    new Button { Text = "Save", Command = viewModel.SaveCommand }
                }
            }
        };
    }
}
