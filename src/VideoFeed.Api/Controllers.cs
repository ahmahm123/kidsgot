using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace VideoFeed.Api;

[ApiController]
[Route("auth")]
public sealed class AuthController(
    AppDbContext dbContext,
    IPasswordHasher<AppUser> passwordHasher,
    IJwtTokenService jwtTokenService,
    IUserPreferenceService preferenceService) : ControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var existing = await dbContext.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (existing is not null)
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var user = new AppUser
        {
            Email = email,
            Role = AppRoles.User,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        await preferenceService.GetOrCreateAsync(user.Id, cancellationToken);
        return Ok(jwtTokenService.CreateToken(user));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(jwtTokenService.CreateToken(user));
    }
}

[ApiController]
[Authorize]
[Route("users")]
public sealed class UsersController(
    IUserContextService userContextService,
    IUserPreferenceService preferenceService,
    HistoryService historyService) : ControllerBase
{
    [HttpGet("preferences")]
    public async Task<ActionResult<UserPreferencesDto>> GetPreferences(CancellationToken cancellationToken)
    {
        var userId = userContextService.GetRequiredUserId();
        var pref = await preferenceService.GetOrCreateAsync(userId, cancellationToken);
        return Ok(new UserPreferencesDto
        {
            CategoryWeights = preferenceService.NormalizeWeights(pref.GetCategoryWeights()),
            IncludedSubAreas = preferenceService.NormalizeIncludedSubAreas(pref.GetIncludedSubAreas()),
            BlockedCreators = pref.GetBlockedCreators(),
            DataSaverMode = pref.DataSaverMode,
            KidSafeMode = pref.KidSafeMode
        });
    }

    [HttpPut("preferences")]
    public async Task<ActionResult<UserPreferencesDto>> UpdatePreferences(
        [FromBody] UserPreferencesDto request,
        CancellationToken cancellationToken)
    {
        var userId = userContextService.GetRequiredUserId();
        var pref = await preferenceService.UpdateAsync(userId, request, cancellationToken);
        return Ok(new UserPreferencesDto
        {
            CategoryWeights = preferenceService.NormalizeWeights(pref.GetCategoryWeights()),
            IncludedSubAreas = preferenceService.NormalizeIncludedSubAreas(pref.GetIncludedSubAreas()),
            BlockedCreators = pref.GetBlockedCreators(),
            DataSaverMode = pref.DataSaverMode,
            KidSafeMode = pref.KidSafeMode
        });
    }

    [HttpGet("history")]
    public async Task<ActionResult<List<FeedItemDto>>> History([FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var userId = userContextService.GetRequiredUserId();
        var items = await historyService.GetHistoryAsync(userId, limit, cancellationToken);
        return Ok(items);
    }
}

[ApiController]
[Authorize]
[Route("feed")]
public sealed class FeedController(
    FeedService feedService,
    IUserContextService userContextService) : ControllerBase
{
    [HttpGet]
    [EnableRateLimiting("feed")]
    public async Task<ActionResult<FeedResponse>> GetFeed(
        [FromQuery] int limit = 20,
        [FromQuery] string? language = null,
        CancellationToken cancellationToken = default)
    {
        var userId = userContextService.GetRequiredUserId();
        var response = await feedService.GetFeedAsync(userId, limit, language, cancellationToken);
        return Ok(response);
    }
}

[ApiController]
[Authorize]
[Route("events")]
public sealed class EventsController(
    AppDbContext dbContext,
    IUserContextService userContextService) : ControllerBase
{
    [HttpPost("view")]
    public async Task<IActionResult> TrackView([FromBody] ViewEventRequest request, CancellationToken cancellationToken)
    {
        var userId = userContextService.GetRequiredUserId();
        var exists = await dbContext.Videos.AnyAsync(x => x.Id == request.VideoId, cancellationToken);
        if (!exists)
        {
            return NotFound(new { message = "Video not found." });
        }

        dbContext.EventViews.Add(new EventView
        {
            UserId = userId,
            VideoId = request.VideoId,
            WatchTimeSeconds = request.WatchTimeSeconds,
            CompletionRatio = request.Completion,
            ViewedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { status = "tracked" });
    }
}

[ApiController]
[Authorize]
[Route("moderation")]
public sealed class ModerationController(
    AppDbContext dbContext,
    IUserContextService userContextService) : ControllerBase
{
    [HttpPost("report")]
    public async Task<IActionResult> Report([FromBody] ReportRequest request, CancellationToken cancellationToken)
    {
        var userId = userContextService.GetRequiredUserId();
        var exists = await dbContext.Videos.AnyAsync(x => x.Id == request.VideoId, cancellationToken);
        if (!exists)
        {
            return NotFound(new { message = "Video not found." });
        }

        dbContext.Reports.Add(new Report
        {
            UserId = userId,
            VideoId = request.VideoId,
            Reason = request.Reason,
            Details = request.Details,
            CreatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { status = "reported" });
    }
}

[ApiController]
[Authorize(Policy = AuthPolicies.AdminOnly)]
[Route("admin/sources")]
public sealed class AdminSourcesController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Source>>> List(CancellationToken cancellationToken)
    {
        var rows = await dbContext.Sources.OrderBy(x => x.Platform).ThenBy(x => x.SourceId).ToListAsync(cancellationToken);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<ActionResult<Source>> Create([FromBody] SourceUpsertRequest request, CancellationToken cancellationToken)
    {
        if (!CategoryCatalog.IsKnownTopCategory(request.TopCategory))
        {
            return BadRequest(new { message = $"Unknown top category: {request.TopCategory}" });
        }

        if (CategoryCatalog.RequiresSubArea(request.TopCategory))
        {
            var valid = CategoryCatalog.SubAreasFor(request.TopCategory)
                .Contains(request.SubArea ?? string.Empty, StringComparer.OrdinalIgnoreCase);
            if (!valid)
            {
                return BadRequest(new { message = $"Sub-area required for {request.TopCategory}." });
            }
        }

        var source = new Source
        {
            Platform = request.Platform.ToLowerInvariant(),
            SourceId = request.SourceId,
            TopCategory = request.TopCategory,
            SubArea = request.SubArea,
            Enabled = request.Enabled,
            Whitelisted = request.Whitelisted,
            AccessMode = request.AccessMode
        };
        dbContext.Sources.Add(source);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(List), new { id = source.Id }, source);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Source>> Update(Guid id, [FromBody] SourceUpsertRequest request, CancellationToken cancellationToken)
    {
        var source = await dbContext.Sources.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (source is null)
        {
            return NotFound();
        }

        source.Platform = request.Platform.ToLowerInvariant();
        source.SourceId = request.SourceId;
        source.TopCategory = request.TopCategory;
        source.SubArea = request.SubArea;
        source.Enabled = request.Enabled;
        source.Whitelisted = request.Whitelisted;
        source.AccessMode = request.AccessMode;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(source);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var source = await dbContext.Sources.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (source is null)
        {
            return NotFound();
        }

        dbContext.Sources.Remove(source);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}

[ApiController]
[Authorize(Policy = AuthPolicies.AdminOnly)]
[Route("admin/categories")]
public sealed class AdminCategoriesController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<CategoryDefinition>>> List(CancellationToken cancellationToken)
    {
        var rows = await dbContext.CategoryDefinitions
            .OrderBy(x => x.TopCategory)
            .ThenBy(x => x.SubArea)
            .ToListAsync(cancellationToken);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDefinition>> Create([FromBody] CategoryUpsertRequest request, CancellationToken cancellationToken)
    {
        if (!CategoryCatalog.IsKnownTopCategory(request.TopCategory))
        {
            return BadRequest(new { message = $"Unknown top category: {request.TopCategory}" });
        }

        var row = new CategoryDefinition
        {
            TopCategory = request.TopCategory,
            SubArea = request.SubArea,
            Detail = request.Detail ?? CategoryCatalog.SubAreaDetail(request.TopCategory, request.SubArea ?? string.Empty),
            Enabled = request.Enabled
        };
        dbContext.CategoryDefinitions.Add(row);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(List), new { id = row.Id }, row);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CategoryDefinition>> Update(
        Guid id,
        [FromBody] CategoryUpsertRequest request,
        CancellationToken cancellationToken)
    {
        var row = await dbContext.CategoryDefinitions.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (row is null)
        {
            return NotFound();
        }

        row.TopCategory = request.TopCategory;
        row.SubArea = request.SubArea;
        row.Detail = request.Detail;
        row.Enabled = request.Enabled;
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(row);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var row = await dbContext.CategoryDefinitions.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (row is null)
        {
            return NotFound();
        }

        dbContext.CategoryDefinitions.Remove(row);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}

[ApiController]
[Authorize(Policy = AuthPolicies.AdminOnly)]
[Route("admin/videos/override-category")]
public sealed class AdminVideoOverridesController(
    AppDbContext dbContext,
    IUserContextService userContextService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<VideoCategoryOverride>>> List(CancellationToken cancellationToken)
    {
        var rows = await dbContext.VideoCategoryOverrides
            .Include(x => x.Video)
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync(cancellationToken);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<ActionResult<VideoCategoryOverride>> Upsert(
        [FromBody] VideoCategoryOverrideRequest request,
        CancellationToken cancellationToken)
    {
        var video = await dbContext.Videos.FirstOrDefaultAsync(x => x.Id == request.VideoId, cancellationToken);
        if (video is null)
        {
            return NotFound(new { message = "Video not found." });
        }

        if (!CategoryCatalog.IsKnownTopCategory(request.TopCategory))
        {
            return BadRequest(new { message = $"Unknown top category: {request.TopCategory}" });
        }

        var overrideRow = await dbContext.VideoCategoryOverrides
            .FirstOrDefaultAsync(x => x.VideoId == request.VideoId, cancellationToken);
        if (overrideRow is null)
        {
            overrideRow = new VideoCategoryOverride
            {
                VideoId = request.VideoId
            };
            dbContext.VideoCategoryOverrides.Add(overrideRow);
        }

        overrideRow.TopCategory = request.TopCategory;
        overrideRow.SubArea = request.SubArea;
        overrideRow.Reason = request.Reason;
        overrideRow.UpdatedBy = userContextService.GetRequiredEmail();
        overrideRow.UpdatedAt = DateTime.UtcNow;

        video.TopCategory = request.TopCategory;
        video.SubArea = request.SubArea;
        video.ExplainJson = System.Text.Json.JsonSerializer.Serialize(
            new ExplainDto
            {
                Mode = "adminOverride",
                Reason = request.Reason
            });

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(overrideRow);
    }

    [HttpPut("{videoId:guid}")]
    public Task<ActionResult<VideoCategoryOverride>> Update(
        Guid videoId,
        [FromBody] VideoCategoryOverrideRequest request,
        CancellationToken cancellationToken)
    {
        request.VideoId = videoId;
        return Upsert(request, cancellationToken);
    }

    [HttpDelete("{videoId:guid}")]
    public async Task<IActionResult> Delete(Guid videoId, CancellationToken cancellationToken)
    {
        var row = await dbContext.VideoCategoryOverrides
            .FirstOrDefaultAsync(x => x.VideoId == videoId, cancellationToken);
        if (row is null)
        {
            return NotFound();
        }

        dbContext.VideoCategoryOverrides.Remove(row);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
