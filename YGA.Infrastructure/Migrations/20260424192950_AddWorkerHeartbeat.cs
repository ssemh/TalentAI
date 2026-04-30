using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YGA.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkerHeartbeat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "worker_heartbeats",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkerName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    LastSeenAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastStatus = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_worker_heartbeats", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_worker_heartbeats_WorkerName",
                table: "worker_heartbeats",
                column: "WorkerName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "worker_heartbeats");
        }
    }
}
