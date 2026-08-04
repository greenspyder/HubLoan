using CreditoSimulador.App.Models;
using Npgsql;

namespace CreditoSimulador.App.Services;

public class LoanContractGenerationConsumer
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<LoanContractGenerationConsumer> _logger;

    public LoanContractGenerationConsumer(IConfiguration configuration, ILogger<LoanContractGenerationConsumer> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public void Execute()
    {
        var connectionString = _configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Username=postgres;Password=13531;Database=postgres";

        using var conn = new NpgsqlConnection(connectionString);
        conn.Open();

        var dataOperacional = ObterDataOperacional(conn);

        var template = ObterTemplateAtivo(conn);
        if (template is null)
        {
            _logger.LogWarning("Nenhum template de contrato ativo encontrado. Geração de contratos adiada.");
            return;
        }

        const string sqlContratos = @"
            SELECT c.id_contrato,
                   c.id_cliente,
                   cl.nome,
                   c.valor_financiado,
                   c.taxa_juros_mensal,
                   c.quantidade_parcelas,
                   c.tipo_amortizacao,
                   COALESCE(to_jsonb(c) ->> 'tipo_pagamento', 'Débito em conta') AS tipo_pagamento
            FROM contratos c
            INNER JOIN clientes cl ON cl.id_cliente = c.id_cliente
            WHERE LOWER(COALESCE(to_jsonb(c) ->> 'status', '')) = LOWER(@statusGeracao)
            ORDER BY c.id_contrato";

        using var cmdContratos = new NpgsqlCommand(sqlContratos, conn);
        cmdContratos.Parameters.AddWithValue("statusGeracao", ContratoStatus.GeracaoContratos);

        using var reader = cmdContratos.ExecuteReader();
        var contratos = new List<ContratoPendente>();
        while (reader.Read())
        {
            contratos.Add(new ContratoPendente(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetString(2),
                reader.GetDecimal(3),
                reader.GetDecimal(4),
                reader.GetInt32(5),
                reader.GetString(6),
                reader.GetString(7)));
        }

        reader.Close();

        var processados = 0;
        foreach (var contrato in contratos)
        {
            var textoContrato = RenderizarContrato(template, contrato, dataOperacional);

            const string sqlUpdate = @"
                UPDATE contratos c
                SET id_template_contrato = @idTemplate,
                    contrato_gerado_texto = @texto,
                    contrato_gerado_em = @geradoEm,
                    status = @novoStatus
                WHERE c.id_contrato = @idContrato
                  AND LOWER(COALESCE(to_jsonb(c) ->> 'status', '')) = LOWER(@statusGeracao)";

            using var cmdUpdate = new NpgsqlCommand(sqlUpdate, conn);
            cmdUpdate.Parameters.AddWithValue("idTemplate", template.IdTemplate);
            cmdUpdate.Parameters.AddWithValue("texto", textoContrato);
            cmdUpdate.Parameters.AddWithValue("geradoEm", dataOperacional);
            cmdUpdate.Parameters.AddWithValue("novoStatus", ContratoStatus.PendenteAssinatura);
            cmdUpdate.Parameters.AddWithValue("idContrato", contrato.IdContrato);
            cmdUpdate.Parameters.AddWithValue("statusGeracao", ContratoStatus.GeracaoContratos);

            processados += cmdUpdate.ExecuteNonQuery();
        }

        if (processados > 0)
        {
            _logger.LogInformation("Consumer de geração processou {Quantidade} contratos para assinatura.", processados);
        }
    }

    private static TemplateContrato? ObterTemplateAtivo(NpgsqlConnection conn)
    {
        const string sql = @"
            SELECT id_template, nome, conteudo
            FROM contract_templates
            WHERE ativo = TRUE
            ORDER BY COALESCE(atualizado_em, criado_em) DESC
            LIMIT 1";

        using var cmd = new NpgsqlCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        return new TemplateContrato(
            reader.GetString(0),
            reader.GetString(1),
            reader.GetString(2));
    }

    private static DateTime ObterDataOperacional(NpgsqlConnection conn)
    {
        const string sql = "SELECT COALESCE((SELECT data_operacional FROM operational_control WHERE id = 1), CURRENT_DATE)";
        using var cmd = new NpgsqlCommand(sql, conn);
        var result = cmd.ExecuteScalar();
        return result switch
        {
            DateTime parsed => parsed.Date,
            DateOnly parsed => parsed.ToDateTime(TimeOnly.MinValue),
            _ => DateTime.Today
        };
    }

    private static string RenderizarContrato(TemplateContrato template, ContratoPendente contrato, DateTime dataOperacional)
    {
        return template.Conteudo
            .Replace("{{cliente_nome}}", contrato.NomeCliente)
            .Replace("{{id_contrato}}", contrato.IdContrato.ToString())
            .Replace("{{id_cliente}}", contrato.IdCliente.ToString())
            .Replace("{{valor_financiado}}", contrato.ValorFinanciado.ToString("N2"))
            .Replace("{{taxa_juros_mensal}}", (contrato.TaxaJurosMensal * 100).ToString("N2") + "%")
            .Replace("{{quantidade_parcelas}}", contrato.QuantidadeParcelas.ToString())
            .Replace("{{tipo_amortizacao}}", contrato.TipoAmortizacao)
            .Replace("{{tipo_pagamento}}", contrato.TipoPagamento)
                .Replace("{{data_geracao}}", dataOperacional.ToString("yyyy-MM-dd"))
            .Replace("{{nome_template}}", template.Nome);
    }

    private sealed record TemplateContrato(string IdTemplate, string Nome, string Conteudo);

    private sealed record ContratoPendente(
        int IdContrato,
        int IdCliente,
        string NomeCliente,
        decimal ValorFinanciado,
        decimal TaxaJurosMensal,
        int QuantidadeParcelas,
        string TipoAmortizacao,
        string TipoPagamento);
}
