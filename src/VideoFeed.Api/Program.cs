using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VideoFeed.Api;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<FeedOptions>(builder.Configuration.GetSection("Feed"));
builder.Services.Configure<ProviderOptions>(builder.Configuration.GetSection("Providers"));

var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? builder.Configuration["POSTGRES_CONNECTION"]
    ?? throw new InvalidOperationException("Connection string 'Postgres' is required.");
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(postgresConnectionString));

var redisConnectionString = builder.Configuration.GetConnectionString("Redis")
    ?? builder.Configuration["REDIS_CONNECTION"];
if (!string.IsNullOrWhiteSpace(redisConnectionString))
{
    builder.Services.AddStackExchangeRedisCache(options => options.Configuration = redisConnectionString);
}
else
{
    builder.Services.AddDistributedMemoryCache();
}

builder.Services.AddSingleton<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IUserContextService, UserContextService>();
builder.Services.AddScoped<IUserPreferenceService, UserPreferenceService>();
builder.Services.AddScoped<ICategorizationEngine, DeterministicCategorizationEngine>();
builder.Services.AddScoped<ProviderCoordinator>();
builder.Services.AddScoped<FeedService>();
builder.Services.AddScoped<HistoryService>();
builder.Services.AddScoped<IngestionService>();

builder.Services.AddScoped<IVideoProvider, MockVideoProvider>();
builder.Services.AddScoped<IVideoProvider, YouTubeVideoProvider>();
builder.Services.AddScoped<IVideoProvider, MetaVideoProvider>();

builder.Services.AddHostedService<DatabaseInitializerHostedService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
        var key = Encoding.UTF8.GetBytes(jwtOptions.SigningKey);
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthPolicies.AdminOnly, policy => policy.RequireRole(AppRoles.Admin));
});

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("feed", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.Identity?.Name
                          ?? httpContext.Connection.RemoteIpAddress?.ToString()
                          ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => Results.Ok(new { status = "ok", service = "CategoryWeightedVideoFeed API" }));

app.Run();
