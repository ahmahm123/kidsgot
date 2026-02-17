using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace VideoFeed.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("202602170001_InitialCreate")]
    public partial class InitialCreate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TopCategory = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    SubArea = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Detail = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "sources",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    SourceId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AccessMode = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    TopCategory = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    SubArea = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    Whitelisted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sources", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false, defaultValue: "User"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "videos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    PlatformVideoId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    PermalinkUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatorId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    TopCategory = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    SubArea = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Language = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    ExplainJson = table.Column<string>(type: "jsonb", nullable: false),
                    SourceId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Whitelisted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_videos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "user_preferences",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryWeightsJson = table.Column<string>(type: "jsonb", nullable: false),
                    IncludedSubAreasJson = table.Column<string>(type: "jsonb", nullable: false),
                    BlockedCreatorsJson = table.Column<string>(type: "jsonb", nullable: false),
                    DataSaverMode = table.Column<bool>(type: "boolean", nullable: false),
                    KidSafeMode = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_preferences", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_user_preferences_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "events_views",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VideoId = table.Column<Guid>(type: "uuid", nullable: false),
                    WatchTimeSeconds = table.Column<int>(type: "integer", nullable: false),
                    CompletionRatio = table.Column<double>(type: "double precision", nullable: false),
                    ViewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_events_views", x => x.Id);
                    table.ForeignKey(
                        name: "FK_events_views_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_events_views_videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "videos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "feed_served",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VideoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TopCategorySnapshot = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feed_served", x => x.Id);
                    table.ForeignKey(
                        name: "FK_feed_served_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_feed_served_videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "videos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VideoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Details = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_reports_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_reports_videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "videos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "video_category_overrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VideoId = table.Column<Guid>(type: "uuid", nullable: false),
                    TopCategory = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    SubArea = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_video_category_overrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_video_category_overrides_videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "videos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_categories_TopCategory_SubArea",
                table: "categories",
                columns: new[] { "TopCategory", "SubArea" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_events_views_UserId_ViewedAt",
                table: "events_views",
                columns: new[] { "UserId", "ViewedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_events_views_VideoId",
                table: "events_views",
                column: "VideoId");

            migrationBuilder.CreateIndex(
                name: "IX_feed_served_UserId_ServedAt",
                table: "feed_served",
                columns: new[] { "UserId", "ServedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_feed_served_VideoId",
                table: "feed_served",
                column: "VideoId");

            migrationBuilder.CreateIndex(
                name: "IX_reports_UserId_CreatedAt",
                table: "reports",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_reports_VideoId",
                table: "reports",
                column: "VideoId");

            migrationBuilder.CreateIndex(
                name: "IX_sources_Platform_SourceId",
                table: "sources",
                columns: new[] { "Platform", "SourceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_Email",
                table: "users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_video_category_overrides_VideoId",
                table: "video_category_overrides",
                column: "VideoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_videos_PermalinkUrl",
                table: "videos",
                column: "PermalinkUrl",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_videos_Platform_PlatformVideoId",
                table: "videos",
                columns: new[] { "Platform", "PlatformVideoId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_videos_SourceId",
                table: "videos",
                column: "SourceId");

            migrationBuilder.CreateIndex(
                name: "IX_videos_TopCategory",
                table: "videos",
                column: "TopCategory");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "categories");
            migrationBuilder.DropTable(name: "events_views");
            migrationBuilder.DropTable(name: "feed_served");
            migrationBuilder.DropTable(name: "reports");
            migrationBuilder.DropTable(name: "sources");
            migrationBuilder.DropTable(name: "user_preferences");
            migrationBuilder.DropTable(name: "video_category_overrides");
            migrationBuilder.DropTable(name: "users");
            migrationBuilder.DropTable(name: "videos");
        }
    }
}
