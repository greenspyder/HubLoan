using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CreditoSimulador.App.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerScopedOffersAndDisbursementAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "cliente_id",
                table: "credit_offers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "conta_desembolso_id",
                table: "contratos",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "cliente_id",
                table: "credit_offers");

            migrationBuilder.DropColumn(
                name: "conta_desembolso_id",
                table: "contratos");
        }
    }
}
