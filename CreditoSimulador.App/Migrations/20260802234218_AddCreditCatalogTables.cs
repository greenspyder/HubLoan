using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CreditoSimulador.App.Migrations
{
    /// <inheritdoc />
    public partial class AddCreditCatalogTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "credit_limit_requests",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    cliente_id = table.Column<int>(type: "integer", nullable: false),
                    oferta_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    valor_solicitado = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    quantidade_parcelas = table.Column<int>(type: "integer", nullable: false),
                    dia_vencimento = table.Column<int>(type: "integer", nullable: false),
                    carencia_meses = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    criado_em = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    garantias = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credit_limit_requests", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "credit_offers",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    nome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    descricao = table.Column<string>(type: "text", nullable: false),
                    valor_minimo = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    valor_maximo = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    parcelas_minimas = table.Column<int>(type: "integer", nullable: false),
                    parcelas_maximas = table.Column<int>(type: "integer", nullable: false),
                    carencia_minima_meses = table.Column<int>(type: "integer", nullable: false),
                    carencia_maxima_meses = table.Column<int>(type: "integer", nullable: false),
                    dia_vencimento_minimo = table.Column<int>(type: "integer", nullable: false),
                    dia_vencimento_maximo = table.Column<int>(type: "integer", nullable: false),
                    taxa_juros_mensal = table.Column<decimal>(type: "numeric(12,6)", precision: 12, scale: 6, nullable: false),
                    tipo_amortizacao = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    garantias = table.Column<string>(type: "text", nullable: false),
                    ativa = table.Column<bool>(type: "boolean", nullable: false),
                    limite_maximo_cliente = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credit_offers", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "credit_limit_requests");

            migrationBuilder.DropTable(
                name: "credit_offers");
        }
    }
}
