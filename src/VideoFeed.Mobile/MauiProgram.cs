using Microsoft.Extensions.Logging;

namespace VideoFeed.Mobile;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder.UseMauiApp<App>();

        builder.Services.AddSingleton<MockVideoFeedApiClient>();
        builder.Services.AddHttpClient<IVideoFeedApiClient, HybridVideoFeedApiClient>(client =>
        {
            client.BaseAddress = new Uri("http://10.0.2.2:5000/");
            client.Timeout = TimeSpan.FromSeconds(8);
        });

        builder.Services.AddSingleton<OnboardingViewModel>();
        builder.Services.AddSingleton<PreferencesViewModel>();
        builder.Services.AddSingleton<FeedViewModel>();
        builder.Services.AddSingleton<HistoryViewModel>();
        builder.Services.AddSingleton<SettingsViewModel>();

        builder.Services.AddSingleton<OnboardingPage>();
        builder.Services.AddSingleton<PreferencesPage>();
        builder.Services.AddSingleton<FeedPage>();
        builder.Services.AddSingleton<HistoryPage>();
        builder.Services.AddSingleton<SettingsPage>();
        builder.Services.AddSingleton<AppShell>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
