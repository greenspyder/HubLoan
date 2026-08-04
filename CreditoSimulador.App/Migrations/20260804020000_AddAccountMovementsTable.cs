using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CreditoSimulador.App.Migrations
{
    public partial class AddAccountMovementsTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "account_movements",
                columns: table => new
                {
                    id_movimentacao = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_cliente = table.Column<int>(type: "integer", nullable: false),
                    id_conta = table.Column<int>(type: "integer", nullable: false),
                    tipo = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    valor = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    saldo_anterior = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    saldo_atual = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    descricao = table.Column<string>(type: "text", nullable: true),
                    id_contrato = table.Column<int>(type: "integer", nullable: true),
                    id_parcela = table.Column<int>(type: "integer", nullable: true),
                    data_operacional = table.Column<DateTime>(type: "date", nullable: false),
                    criado_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_account_movements", x => x.id_movimentacao);
                    table.ForeignKey(
                        name: "FK_account_movements_clientes_id_cliente",
                        column: x => x.id_cliente,
                        principalTable: "clientes",
                        principalColumn: "id_cliente",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_account_movements_contas_id_conta",
                        column: x => x.id_conta,
                        principalTable: "contas",
                        principalColumn: "id_conta",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_account_movements_cliente",
                table: "account_movements",
                columns: new[] { "id_cliente", "id_movimentacao" });

            migrationBuilder.CreateIndex(
                name: "idx_account_movements_conta",
                table: "account_movements",
                column: "id_conta");

            migrationBuilder.CreateIndex(
                name: "idx_account_movements_data",
                table: "account_movements",
                column: "data_operacional");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "account_movements");
        }
    }
}
