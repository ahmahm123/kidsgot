namespace VideoFeed.Mobile;

public sealed class AppShell : Shell
{
    public AppShell(
        OnboardingPage onboardingPage,
        PreferencesPage preferencesPage,
        FeedPage feedPage,
        HistoryPage historyPage,
        SettingsPage settingsPage)
    {
        Title = "Category Weighted Feed";

        var tabBar = new TabBar();
        tabBar.Items.Add(new ShellContent
        {
            Title = "Onboarding",
            ContentTemplate = new DataTemplate(() => onboardingPage)
        });
        tabBar.Items.Add(new ShellContent
        {
            Title = "Preferences",
            ContentTemplate = new DataTemplate(() => preferencesPage)
        });
        tabBar.Items.Add(new ShellContent
        {
            Title = "Feed",
            ContentTemplate = new DataTemplate(() => feedPage)
        });
        tabBar.Items.Add(new ShellContent
        {
            Title = "History",
            ContentTemplate = new DataTemplate(() => historyPage)
        });
        tabBar.Items.Add(new ShellContent
        {
            Title = "Settings",
            ContentTemplate = new DataTemplate(() => settingsPage)
        });

        Items.Add(tabBar);
    }
}
