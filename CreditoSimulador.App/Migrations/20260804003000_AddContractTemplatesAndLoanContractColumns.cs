using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CreditoSimulador.App.Migrations
{
    public partial class AddContractTemplatesAndLoanContractColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "contract_templates",
                columns: table => new
                {
                    id_template = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    nome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    conteudo = table.Column<string>(type: "text", nullable: false),
                    ativo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    criado_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contract_templates", x => x.id_template);
                });

            migrationBuilder.AddColumn<string>(
                name: "id_template_contrato",
                table: "contratos",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contrato_gerado_texto",
                table: "contratos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "contrato_gerado_em",
                table: "contratos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "assinado_em",
                table: "contratos",
                type: "timestamp with time zone",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "id_template_contrato",
                table: "contratos");

            migrationBuilder.DropColumn(
                name: "contrato_gerado_texto",
                table: "contratos");

            migrationBuilder.DropColumn(
                name: "contrato_gerado_em",
                table: "contratos");

            migrationBuilder.DropColumn(
                name: "assinado_em",
                table: "contratos");

            migrationBuilder.DropTable(
                name: "contract_templates");
        }
    }
}
