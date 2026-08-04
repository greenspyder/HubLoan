using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CreditoSimulador.App.Migrations
{
    public partial class AddDesembolsoAutorizadoEmToContratos : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "desembolso_autorizado_em",
                table: "contratos",
                type: "timestamp with time zone",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "desembolso_autorizado_em",
                table: "contratos");
        }
    }
}
