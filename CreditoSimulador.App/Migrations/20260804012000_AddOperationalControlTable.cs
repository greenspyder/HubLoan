using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CreditoSimulador.App.Migrations
{
    public partial class AddOperationalControlTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "operational_control",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    data_operacional = table.Column<DateTime>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operational_control", x => x.id);
                });

            migrationBuilder.InsertData(
                table: "operational_control",
                columns: new[] { "id", "data_operacional" },
                values: new object[] { 1, null });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "operational_control");
        }
    }
}
