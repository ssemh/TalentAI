using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YGA.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReposJsonToGithubProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RawReposJson",
                table: "github_profiles",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RawReposJson",
                table: "github_profiles");
        }
    }
}
