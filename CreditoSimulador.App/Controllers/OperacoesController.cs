using System.Text;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace CreditoSimulador.App.Controllers
{
    [ApiController]
    public class OperacoesController : ControllerBase
    {
        private readonly string _connectionString;

        public OperacoesController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? "Host=localhost;Username=postgres;Password=13531;Database=postgres";
        }

        [HttpGet("/operacoes")]
        public IActionResult Index([FromQuery] int? contratoId)
        {
            var contratos = ListarContratos();
            var contratoSelecionado = contratoId is > 0
                ? contratos.FirstOrDefault(c => c.Id == contratoId.Value)
                : contratos.FirstOrDefault();

            var detalhes = contratoSelecionado is null ? null : BuscarDetalhes(contratoSelecionado.Id);
            return Content(BuildHtml(contratos, contratoSelecionado, detalhes), "text/html; charset=utf-8");
        }

        [HttpPost("/operacoes")]
        public IActionResult AtualizarStatus([FromForm] int contratoId, [FromForm] string status)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            conn.Open();

            const string sql = "UPDATE contratos SET status = @status WHERE id_contrato = @id";
            using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("status", status);
            cmd.Parameters.AddWithValue("id", contratoId);
            cmd.ExecuteNonQuery();

            return Redirect($"/operacoes?contratoId={contratoId}");
        }

        private List<ContratoResumo> ListarContratos()
        {
            using var conn = new NpgsqlConnection(_connectionString);
            conn.Open();

            const string sql = @"
                SELECT id_contrato, id_cliente, status
                FROM contratos
                ORDER BY id_contrato DESC";

            using var cmd = new NpgsqlCommand(sql, conn);
            using var reader = cmd.ExecuteReader();

            var contratos = new List<ContratoResumo>();
            while (reader.Read())
            {
                contratos.Add(new ContratoResumo(
                    reader.GetInt32(0),
                    reader.GetInt32(1),
                    reader.IsDBNull(2) ? "geração de contratos" : reader.GetString(2)));
            }

            return contratos;
        }

        private ContratoDetalhes? BuscarDetalhes(int contratoId)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            conn.Open();

            const string sqlContrato = @"
                SELECT id_contrato, id_cliente, valor_financiado, taxa_juros_mensal, quantidade_parcelas, tipo_amortizacao, status
                FROM contratos
                WHERE id_contrato = @id";

            using var cmdContrato = new NpgsqlCommand(sqlContrato, conn);
            cmdContrato.Parameters.AddWithValue("id", contratoId);
            using var reader = cmdContrato.ExecuteReader();
            if (!reader.Read())
            {
                return null;
            }

            var detalhes = new ContratoDetalhes(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetDecimal(2),
                reader.GetDecimal(3),
                reader.GetInt32(4),
                reader.GetString(5),
                reader.IsDBNull(6) ? "geração de contratos" : reader.GetString(6));

            reader.Close();

            const string sqlParcelas = @"
                SELECT num_parcela, data_vencimento, valor_total_parcela, status_pagamento
                FROM parcelas
                WHERE id_contrato = @id
                ORDER BY num_parcela";

            using var cmdParcelas = new NpgsqlCommand(sqlParcelas, conn);
            cmdParcelas.Parameters.AddWithValue("id", contratoId);
            using var parcelasReader = cmdParcelas.ExecuteReader();
            while (parcelasReader.Read())
            {
                detalhes.Parcelas.Add(new ParcelaResumo(
                    parcelasReader.GetInt32(0),
                    parcelasReader.GetDateTime(1).ToString("yyyy-MM-dd"),
                    parcelasReader.GetDecimal(2),
                    parcelasReader.IsDBNull(3) ? "Pendente" : parcelasReader.GetString(3)));
            }

            return detalhes;
        }

        private string BuildHtml(List<ContratoResumo> contratos, ContratoResumo? contratoSelecionado, ContratoDetalhes? detalhes)
        {
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html>");
            sb.AppendLine("<html lang=\"pt-BR\">");
            sb.AppendLine("<head>");
            sb.AppendLine("<meta charset=\"utf-8\" />");
            sb.AppendLine("<title>Operações de Crédito</title>");
            sb.AppendLine("<style>body{font-family:Arial,sans-serif;margin:24px;}label{display:block;margin-top:12px;}select,input,button{padding:8px;margin-top:4px;}table{border-collapse:collapse;width:100%;margin-top:16px;}th,td{border:1px solid #ccc;padding:8px;text-align:left;}small{color:#666;}</style>");
            sb.AppendLine("</head>");
            sb.AppendLine("<body>");
            sb.AppendLine("<h1>Operações de crédito</h1>");
            sb.AppendLine("<p>Escolha um contrato na lista para ver detalhes e atualizar o status.</p>");
            sb.AppendLine("<form method=\"get\" action=\"/operacoes\">");
            sb.AppendLine("<label for=\"contratoId\">Contrato</label>");
            sb.AppendLine("<select name=\"contratoId\" id=\"contratoId\">");
            foreach (var contrato in contratos)
            {
                var selected = contrato.Id == (contratoSelecionado?.Id ?? 0) ? "selected" : string.Empty;
                sb.AppendLine($"<option value=\"{contrato.Id}\" {selected}>#{contrato.Id} - Cliente {contrato.ClienteId} - Status: {contrato.Status}</option>");
            }
            sb.AppendLine("</select>");
            sb.AppendLine("<button type=\"submit\">Ver detalhes</button>");
            sb.AppendLine("</form>");

            if (detalhes is not null)
            {
                sb.AppendLine("<h2>Detalhes do contrato</h2>");
                sb.AppendLine($"<p><strong>Contrato:</strong> #{detalhes.Id} | <strong>Cliente:</strong> {detalhes.ClienteId}</p>");
                sb.AppendLine($"<p><strong>Status atual:</strong> {detalhes.Status}</p>");
                sb.AppendLine($"<p><strong>Valor financiado:</strong> {detalhes.ValorFinanciado:C2} | <strong>Parcelas:</strong> {detalhes.QuantidadeParcelas}</p>");
                sb.AppendLine($"<p><strong>Taxa:</strong> {detalhes.TaxaJurosMensal:P2} | <strong>Amortização:</strong> {detalhes.TipoAmortizacao}</p>");

                sb.AppendLine("<form method=\"post\" action=\"/operacoes\">");
                sb.AppendLine($"<input type=\"hidden\" name=\"contratoId\" value=\"{detalhes.Id}\" />");
                sb.AppendLine("<label for=\"status\">Novo status</label>");
                sb.AppendLine("<select name=\"status\" id=\"status\">");
                foreach (var status in new[] { "geração de contratos", "pendente assinatura", "aguardando desembolso", "desembolsado", "atrasado", "expirado" })
                {
                    var selected = status.Equals(detalhes.Status, StringComparison.OrdinalIgnoreCase) ? "selected" : string.Empty;
                    sb.AppendLine($"<option value=\"{status}\" {selected}>{status}</option>");
                }
                sb.AppendLine("</select>");
                sb.AppendLine("<button type=\"submit\">Salvar status</button>");
                sb.AppendLine("</form>");

                sb.AppendLine("<h3>Parcelas</h3>");
                sb.AppendLine("<table>");
                sb.AppendLine("<tr><th>#</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr>");
                foreach (var parcela in detalhes.Parcelas)
                {
                    sb.AppendLine($"<tr><td>{parcela.Numero}</td><td>{parcela.DataVencimento}</td><td>{parcela.ValorTotalParcela:C2}</td><td>{parcela.StatusPagamento}</td></tr>");
                }
                sb.AppendLine("</table>");
            }
            else
            {
                sb.AppendLine("<p>Nenhum contrato encontrado.</p>");
            }

            sb.AppendLine("</body>");
            sb.AppendLine("</html>");
            return sb.ToString();
        }

        private sealed record ContratoResumo(int Id, int ClienteId, string Status);

        private sealed class ContratoDetalhes
        {
            public ContratoDetalhes(int id, int clienteId, decimal valorFinanciado, decimal taxaJurosMensal, int quantidadeParcelas, string tipoAmortizacao, string status)
            {
                Id = id;
                ClienteId = clienteId;
                ValorFinanciado = valorFinanciado;
                TaxaJurosMensal = taxaJurosMensal;
                QuantidadeParcelas = quantidadeParcelas;
                TipoAmortizacao = tipoAmortizacao;
                Status = status;
            }

            public int Id { get; }
            public int ClienteId { get; }
            public decimal ValorFinanciado { get; }
            public decimal TaxaJurosMensal { get; }
            public int QuantidadeParcelas { get; }
            public string TipoAmortizacao { get; }
            public string Status { get; }
            public List<ParcelaResumo> Parcelas { get; } = new();
        }

        private sealed record ParcelaResumo(int Numero, string DataVencimento, decimal ValorTotalParcela, string StatusPagamento);
    }
}
