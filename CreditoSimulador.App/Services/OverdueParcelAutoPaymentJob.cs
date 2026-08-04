using Npgsql;

namespace CreditoSimulador.App.Services;

public class OverdueParcelAutoPaymentJob
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<OverdueParcelAutoPaymentJob> _logger;

    public OverdueParcelAutoPaymentJob(IConfiguration configuration, ILogger<OverdueParcelAutoPaymentJob> logger)
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

        var hasTipoPagamento = ColumnExists(conn, "contratos", "tipo_pagamento");

        var sqlContratos = hasTipoPagamento
            ? @"
            SELECT c.id_contrato, c.id_cliente
            FROM contratos c
            WHERE LOWER(COALESCE(c.tipo_pagamento, '')) IN ('débito em conta', 'debito em conta')
              AND EXISTS (
                  SELECT 1
                  FROM parcelas p
                  WHERE p.id_contrato = c.id_contrato
                    AND COALESCE(p.status_pagamento, 'ABERTO') <> 'PAGO'
                                        AND p.data_vencimento < @dataOperacional
              )
            ORDER BY c.id_contrato"
            : @"
            SELECT c.id_contrato, c.id_cliente
            FROM contratos c
            WHERE EXISTS (
                  SELECT 1
                  FROM parcelas p
                  WHERE p.id_contrato = c.id_contrato
                    AND COALESCE(p.status_pagamento, 'ABERTO') <> 'PAGO'
                                        AND p.data_vencimento < @dataOperacional
              )
            ORDER BY c.id_contrato";

        if (!hasTipoPagamento)
        {
            _logger.LogWarning("Coluna contratos.tipo_pagamento não encontrada. Processando contratos em atraso sem filtro de tipo de pagamento.");
        }

        using var cmdContratos = new NpgsqlCommand(sqlContratos, conn);
        cmdContratos.Parameters.AddWithValue("dataOperacional", dataOperacional);
        using var readerContratos = cmdContratos.ExecuteReader();

        var contratos = new List<(int ContratoId, int ClienteId)>();
        while (readerContratos.Read())
        {
            contratos.Add((readerContratos.GetInt32(0), readerContratos.GetInt32(1)));
        }

        readerContratos.Close();

        var contratosProcessados = 0;
        var parcelasPagas = 0;

        foreach (var contrato in contratos)
        {
            using var transaction = conn.BeginTransaction();
            try
            {
                var saldoCliente = ObterSaldoCliente(conn, contrato.ClienteId, transaction);
                var parcelasAtrasadas = ObterParcelasAtrasadas(conn, contrato.ContratoId, dataOperacional, transaction);

                var saldoDisponivel = saldoCliente;
                var pagasNesteContrato = 0;
                foreach (var parcela in parcelasAtrasadas)
                {
                    if (saldoDisponivel < parcela.ValorTotalParcela)
                    {
                        break;
                    }

                    var (idConta, saldoAnterior, saldoAtual) = DebitarSaldo(conn, contrato.ClienteId, parcela.ValorTotalParcela, transaction);
                    MarcarParcelaComoPaga(conn, parcela.IdParcela, transaction);
                    RegistrarMovimentacaoConta(
                        conn,
                        contrato.ClienteId,
                        idConta,
                        "PAGAMENTO_AUTOMATICO_PARCELA",
                        -parcela.ValorTotalParcela,
                        saldoAnterior,
                        saldoAtual,
                        dataOperacional,
                        $"Pagamento automático de parcela em atraso (parcela {parcela.IdParcela}).",
                        contrato.ContratoId,
                        parcela.IdParcela,
                        transaction);
                    saldoDisponivel -= parcela.ValorTotalParcela;
                    pagasNesteContrato++;
                }

                AtualizarStatusContrato(conn, contrato.ContratoId, dataOperacional, transaction);

                transaction.Commit();
                contratosProcessados++;
                parcelasPagas += pagasNesteContrato;
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                _logger.LogError(ex, "Erro ao processar pagamento automático do contrato {ContratoId}", contrato.ContratoId);
            }
        }

        _logger.LogInformation("Job de pagamento automático concluído. Contratos processados: {Contratos}, parcelas pagas: {Parcelas}.", contratosProcessados, parcelasPagas);
    }

    private static decimal ObterSaldoCliente(NpgsqlConnection conn, int clienteId, NpgsqlTransaction transaction)
    {
        const string sql = "SELECT saldo FROM contas WHERE id_cliente = @idCliente FOR UPDATE";
        using var cmd = new NpgsqlCommand(sql, conn, transaction);
        cmd.Parameters.AddWithValue("idCliente", clienteId);
        var result = cmd.ExecuteScalar();

        if (result is null)
        {
            throw new InvalidOperationException("Cliente sem conta ativa para débito automático.");
        }

        return Convert.ToDecimal(result);
    }

    private static List<ParcelaEmAtraso> ObterParcelasAtrasadas(NpgsqlConnection conn, int contratoId, DateTime dataOperacional, NpgsqlTransaction transaction)
    {
        const string sql = @"
            SELECT id_parcela, valor_total_parcela
            FROM parcelas
            WHERE id_contrato = @idContrato
              AND COALESCE(status_pagamento, 'ABERTO') <> 'PAGO'
              AND data_vencimento < @dataOperacional
            ORDER BY data_vencimento, num_parcela";

        using var cmd = new NpgsqlCommand(sql, conn, transaction);
        cmd.Parameters.AddWithValue("idContrato", contratoId);
        cmd.Parameters.AddWithValue("dataOperacional", dataOperacional);
        using var reader = cmd.ExecuteReader();

        var parcelas = new List<ParcelaEmAtraso>();
        while (reader.Read())
        {
            parcelas.Add(new ParcelaEmAtraso(reader.GetInt32(0), reader.GetDecimal(1)));
        }

        return parcelas;
    }

    private static (int IdConta, decimal SaldoAnterior, decimal SaldoAtual) DebitarSaldo(NpgsqlConnection conn, int clienteId, decimal valor, NpgsqlTransaction transaction)
    {
        const string sql = @"
            UPDATE contas
            SET saldo = saldo - @valor
            WHERE id_cliente = @idCliente
              AND saldo >= @valor
            RETURNING id_conta, saldo";

        using var cmd = new NpgsqlCommand(sql, conn, transaction);
        cmd.Parameters.AddWithValue("valor", valor);
        cmd.Parameters.AddWithValue("idCliente", clienteId);

        using var reader = cmd.ExecuteReader();
        if (!reader.Read())
        {
            throw new InvalidOperationException("Saldo insuficiente para o débito automático.");
        }

        var idConta = reader.GetInt32(0);
        var saldoAtual = reader.GetDecimal(1);
        var saldoAnterior = saldoAtual + valor;
        return (idConta, saldoAnterior, saldoAtual);
    }

    private static void MarcarParcelaComoPaga(NpgsqlConnection conn, int parcelaId, NpgsqlTransaction transaction)
    {
        const string sql = @"
            UPDATE parcelas
            SET status_pagamento = 'PAGO'
            WHERE id_parcela = @idParcela";

        using var cmd = new NpgsqlCommand(sql, conn, transaction);
        cmd.Parameters.AddWithValue("idParcela", parcelaId);
        cmd.ExecuteNonQuery();
    }

    private static void AtualizarStatusContrato(NpgsqlConnection conn, int contratoId, DateTime dataOperacional, NpgsqlTransaction transaction)
    {
        const string sql = @"
            UPDATE contratos
            SET status = CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM parcelas p
                    WHERE p.id_contrato = @idContrato
                      AND COALESCE(p.status_pagamento, 'ABERTO') <> 'PAGO'
                      AND p.data_vencimento < @dataOperacional
                ) THEN 'atrasado'
                ELSE 'desembolsado'
            END
            WHERE id_contrato = @idContrato";

        using var cmd = new NpgsqlCommand(sql, conn, transaction);
        cmd.Parameters.AddWithValue("idContrato", contratoId);
        cmd.Parameters.AddWithValue("dataOperacional", dataOperacional);
        cmd.ExecuteNonQuery();
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

    private static void RegistrarMovimentacaoConta(
        NpgsqlConnection conn,
        int clienteId,
        int idConta,
        string tipo,
        decimal valor,
        decimal saldoAnterior,
        decimal saldoAtual,
        DateTime dataOperacional,
        string? descricao,
        int? idContrato,
        int? idParcela,
        NpgsqlTransaction transaction)
    {
        const string sql = @"
            INSERT INTO account_movements
            (id_cliente, id_conta, tipo, valor, saldo_anterior, saldo_atual, descricao, id_contrato, id_parcela, data_operacional)
            VALUES
            (@idCliente, @idConta, @tipo, @valor, @saldoAnterior, @saldoAtual, @descricao, @idContrato, @idParcela, @dataOperacional)";

        using var cmd = new NpgsqlCommand(sql, conn, transaction);
        cmd.Parameters.AddWithValue("idCliente", clienteId);
        cmd.Parameters.AddWithValue("idConta", idConta);
        cmd.Parameters.AddWithValue("tipo", tipo);
        cmd.Parameters.AddWithValue("valor", valor);
        cmd.Parameters.AddWithValue("saldoAnterior", saldoAnterior);
        cmd.Parameters.AddWithValue("saldoAtual", saldoAtual);
        cmd.Parameters.AddWithValue("descricao", string.IsNullOrWhiteSpace(descricao) ? (object)DBNull.Value : descricao);
        cmd.Parameters.AddWithValue("idContrato", idContrato.HasValue ? idContrato.Value : (object)DBNull.Value);
        cmd.Parameters.AddWithValue("idParcela", idParcela.HasValue ? idParcela.Value : (object)DBNull.Value);
        cmd.Parameters.AddWithValue("dataOperacional", dataOperacional.Date);
        cmd.ExecuteNonQuery();
    }

    private static bool ColumnExists(NpgsqlConnection conn, string tableName, string columnName)
    {
        const string sql = @"
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = @tableName
                  AND column_name = @columnName
            )";

        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("tableName", tableName);
        cmd.Parameters.AddWithValue("columnName", columnName);

        var result = cmd.ExecuteScalar();
        return result is not null && Convert.ToBoolean(result);
    }

    private sealed record ParcelaEmAtraso(int IdParcela, decimal ValorTotalParcela);
}