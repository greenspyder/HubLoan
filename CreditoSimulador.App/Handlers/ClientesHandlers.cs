using Credito.Calculos;
using CreditoSimulador.App.Commands;
using CreditoSimulador.App.Models;
using CreditoSimulador.App.Services;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace CreditoSimulador.App.Handlers
{
    public abstract class BaseClientesHandler
    {
        protected readonly string ConnectionString = "Host=localhost;Username=postgres;Password=13531;Database=postgres";

        protected void AtualizarParcelasEVincularStatusDosContratos(NpgsqlConnection conn)
        {
            var dataOperacional = ObterDataOperacional(conn);

            const string sqlAtualizarParcelas = @"
                UPDATE parcelas
                SET status_pagamento = CASE
                    WHEN status_pagamento IS NULL OR status_pagamento = '' THEN 'ABERTO'
                    WHEN status_pagamento = 'ABERTO' AND data_vencimento < @dataOperacional THEN 'ATRASADO'
                    ELSE status_pagamento
                END
                WHERE (status_pagamento IS NULL OR status_pagamento = '' OR status_pagamento = 'ABERTO')
                  AND data_vencimento < @dataOperacional";

            using var cmdParcelas = new NpgsqlCommand(sqlAtualizarParcelas, conn);
            cmdParcelas.Parameters.AddWithValue("dataOperacional", dataOperacional);
            cmdParcelas.ExecuteNonQuery();

            const string sqlAtualizarContratos = @"
                UPDATE contratos
                SET status = CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM parcelas p
                        WHERE p.id_contrato = contratos.id_contrato
                          AND p.status_pagamento = 'ATRASADO'
                    ) THEN @atrasado
                    WHEN status IS NULL OR status = '' THEN @geracao
                    ELSE status
                END";

            using var cmdContratos = new NpgsqlCommand(sqlAtualizarContratos, conn);
            cmdContratos.Parameters.AddWithValue("atrasado", ContratoStatus.Atrasado);
            cmdContratos.Parameters.AddWithValue("geracao", ContratoStatus.GeracaoContratos);
            cmdContratos.ExecuteNonQuery();
        }

        protected DateTime ObterDataOperacional(NpgsqlConnection conn, NpgsqlTransaction? transaction = null)
        {
            const string sql = "SELECT COALESCE((SELECT data_operacional FROM operational_control WHERE id = 1), CURRENT_DATE)";
            using var cmd = transaction is null
                ? new NpgsqlCommand(sql, conn)
                : new NpgsqlCommand(sql, conn, transaction);
            var result = cmd.ExecuteScalar();
            return result switch
            {
                DateTime parsed => parsed.Date,
                DateOnly parsed => parsed.ToDateTime(TimeOnly.MinValue),
                _ => DateTime.Today
            };
        }

        protected void MarcarContratoComoDesembolsado(NpgsqlConnection conn, int contratoId)
        {
            const string sql = @"
                UPDATE contratos
                SET status = @desembolsado
                WHERE id_contrato = @id
                  AND NOT EXISTS (
                      SELECT 1
                      FROM parcelas p
                      WHERE p.id_contrato = @id
                        AND p.status_pagamento <> 'PAGO'
                  )";

            using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("desembolsado", ContratoStatus.Desembolsado);
            cmd.Parameters.AddWithValue("id", contratoId);
            cmd.ExecuteNonQuery();
        }

        protected string NormalizarStatusParcela(string? status)
        {
            return status switch
            {
                "PAGO" => "Pago",
                "ATRASADO" => "Atrasado",
                "ABERTO" => "Pendente",
                _ => string.IsNullOrWhiteSpace(status) ? "Pendente" : status
            };
        }

        protected string NormalizarStatusContrato(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return ContratoStatus.GeracaoContratos;
            }

            return status.Trim().ToLowerInvariant() switch
            {
                "geração de contratos" => ContratoStatus.GeracaoContratos,
                "pendente assinatura" => ContratoStatus.PendenteAssinatura,
                "aguardando desembolso" => ContratoStatus.AguardandoDesembolso,
                "desembolsado" => ContratoStatus.Desembolsado,
                "atrasado" => ContratoStatus.Atrasado,
                "expirado" => ContratoStatus.Expirado,
                _ => status
            };
        }

        protected string NormalizarTipoPagamento(string? tipoPagamento)
        {
            if (string.IsNullOrWhiteSpace(tipoPagamento))
            {
                return string.Empty;
            }

            return tipoPagamento.Trim().ToLowerInvariant() switch
            {
                "débito em conta" => "Débito em conta",
                "debito em conta" => "Débito em conta",
                "boleto" => "Boleto",
                _ => tipoPagamento.Trim()
            };
        }

        protected void RegistrarMovimentacaoConta(
            NpgsqlConnection conn,
            int clienteId,
            int idConta,
            string tipo,
            decimal valor,
            decimal saldoAnterior,
            decimal saldoAtual,
            DateTime dataOperacional,
            string? descricao = null,
            int? idContrato = null,
            int? idParcela = null,
            NpgsqlTransaction? transaction = null)
        {
            const string sql = @"
                INSERT INTO account_movements
                (id_cliente, id_conta, tipo, valor, saldo_anterior, saldo_atual, descricao, id_contrato, id_parcela, data_operacional)
                VALUES
                (@idCliente, @idConta, @tipo, @valor, @saldoAnterior, @saldoAtual, @descricao, @idContrato, @idParcela, @dataOperacional)";

            using var cmd = transaction is null
                ? new NpgsqlCommand(sql, conn)
                : new NpgsqlCommand(sql, conn, transaction);

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
    }

    public class ListarClientesHandler : BaseClientesHandler
    {
        public IActionResult Handle(ListarClientesCommand command)
        {
            var listaClientes = new List<object>();
            try
            {
                using var conn = new NpgsqlConnection(ConnectionString);
                conn.Open();

                if (command.CustomerId.HasValue)
                {
                    const string sqlFiltro = @"SELECT c.id_cliente,
                                                     c.nome,
                                                     c.limite_global,
                                                     COALESCE(SUM(ct.saldo), 0) AS saldo_total,
                                                     COUNT(ct.id_conta) AS total_contas
                                              FROM clientes c
                                              LEFT JOIN contas ct ON ct.id_cliente = c.id_cliente
                                              WHERE c.id_cliente = @id
                                              GROUP BY c.id_cliente, c.nome, c.limite_global";
                    using var cmdFiltro = new NpgsqlCommand(sqlFiltro, conn);
                    cmdFiltro.Parameters.AddWithValue("id", command.CustomerId.Value);

                    using var readerFiltro = cmdFiltro.ExecuteReader();
                    if (readerFiltro.Read())
                    {
                        return new OkObjectResult(new
                        {
                            Cliente = new
                            {
                                Id = readerFiltro.GetInt32(0),
                                Nome = readerFiltro.GetString(1),
                                Limite = readerFiltro.GetDecimal(2),
                                SaldoConta = readerFiltro.IsDBNull(3) ? 0m : readerFiltro.GetDecimal(3),
                                TotalContas = readerFiltro.IsDBNull(4) ? 0 : readerFiltro.GetInt64(4)
                            }
                        });
                    }

                    return new NotFoundObjectResult("Cliente para impersonation não encontrado.");
                }

                  const string sqlTodos = @"SELECT c.id_cliente,
                                    c.nome,
                                    c.limite_global,
                                    COALESCE(SUM(ct.saldo), 0) AS saldo_total,
                                    COUNT(ct.id_conta) AS total_contas
                                          FROM clientes c
                                          LEFT JOIN contas ct ON ct.id_cliente = c.id_cliente
                                GROUP BY c.id_cliente, c.nome, c.limite_global
                                          ORDER BY c.nome";
                using var cmdTodos = new NpgsqlCommand(sqlTodos, conn);
                using var reader = cmdTodos.ExecuteReader();

                while (reader.Read())
                {
                    listaClientes.Add(new
                    {
                        Id = reader.GetInt32(0),
                        Nome = reader.GetString(1),
                        Limite = reader.GetDecimal(2),
                        SaldoConta = reader.IsDBNull(3) ? 0m : reader.GetDecimal(3),
                        TotalContas = reader.IsDBNull(4) ? 0 : reader.GetInt64(4)
                    });
                }

                return new OkObjectResult(listaClientes);
            }
            catch (Exception ex)
            {
                return new ObjectResult($"Erro ao acessar o Postgres: {ex.Message}") { StatusCode = 500 };
            }
        }
    }

    public class ListarContratosHandler : BaseClientesHandler
    {
        public IActionResult Handle(ListarContratosCommand command)
        {
            try
            {
                using var conn = new NpgsqlConnection(ConnectionString);
                conn.Open();

                AtualizarParcelasEVincularStatusDosContratos(conn);

                const string sql = @"
            SELECT 
                c.id_contrato, 
                c.valor_financiado, 
                c.taxa_juros_mensal, 
                c.quantidade_parcelas, 
                c.tipo_amortizacao, 
                c.id_cliente,
                to_jsonb(c) ->> 'tipo_pagamento' AS tipo_pagamento,
                to_jsonb(c) ->> 'status' AS status
            FROM contratos c
            WHERE c.id_cliente = @id
            ORDER BY c.id_contrato DESC";

                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", command.CustomerId);
                using var reader = cmd.ExecuteReader();

                var contratos = new List<object>();
                while (reader.Read())
                {
                    contratos.Add(new
                    {
                        id = reader.GetInt32(0),
                        valorFinanciado = reader.GetDecimal(1),
                        taxaJurosMensal = reader.GetDecimal(2),
                        quantidadeParcelas = reader.GetInt32(3),
                        tipoAmortizacao = reader.GetString(4),
                        idCliente = reader.GetInt32(5),
                        tipoPagamento = NormalizarTipoPagamento(reader.IsDBNull(6) ? null : reader.GetString(6)),
                        status = NormalizarStatusContrato(reader.IsDBNull(7) ? null : reader.GetString(7))
                    });
                }

                return new OkObjectResult(contratos);
            }
            catch (Exception ex)
            {
                return new ObjectResult($"Erro ao buscar contratos: {ex.Message}") { StatusCode = 500 };
            }
        }
    }

    public class ListarParcelasHandler : BaseClientesHandler
    {
        public IActionResult Handle(ListarParcelasCommand command)
        {
            try
            {
                using var conn = new NpgsqlConnection(ConnectionString);
                conn.Open();

                AtualizarParcelasEVincularStatusDosContratos(conn);

                const string sql = @"
            SELECT 
                p.id_parcela,
                p.id_contrato,
                p.num_parcela,
                p.data_vencimento,
                p.valor_amortizacao,
                p.valor_juros,
                p.valor_total_parcela,
                p.status_pagamento
            FROM parcelas p
            INNER JOIN contratos c ON p.id_contrato = c.id_contrato
            WHERE c.id_cliente = @id
            ORDER BY p.id_contrato DESC, p.num_parcela ASC";

                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", command.CustomerId);
                using var reader = cmd.ExecuteReader();

                var parcelas = new List<object>();
                while (reader.Read())
                {
                    parcelas.Add(new
                    {
                        id = reader.GetInt32(0),
                        idContrato = reader.GetInt32(1),
                        numeroParcela = reader.GetInt32(2),
                        dataVencimento = reader.GetDateTime(3).ToString("yyyy-MM-dd"),
                        valorAmortizacao = reader.GetDecimal(4),
                        valorJuros = reader.GetDecimal(5),
                        valorTotalParcela = reader.GetDecimal(6),
                        statusPagamento = NormalizarStatusParcela(reader.IsDBNull(7) ? null : reader.GetString(7))
                    });
                }

                return new OkObjectResult(parcelas);
            }
            catch (Exception ex)
            {
                return new ObjectResult($"Erro ao buscar parcelas: {ex.Message}") { StatusCode = 500 };
            }
        }
    }

    public class ProcessarContratoHandler : BaseClientesHandler
    {
        public IActionResult Handle(ProcessarContratoCommand command)
        {
            try
            {
                using var conn = new NpgsqlConnection(ConnectionString);
                conn.Open();

                const string sqlBusca = "SELECT id_contrato, valor_financiado, taxa_juros_mensal, quantidade_parcelas, tipo_amortizacao, id_cliente FROM contratos LIMIT 1";
                using var cmdBusca = new NpgsqlCommand(sqlBusca, conn);
                using var reader = cmdBusca.ExecuteReader();

                if (reader.Read())
                {
                    var dataOperacional = ObterDataOperacional(conn);
                    int idContrato = reader.GetInt32(0);
                    decimal principal = reader.GetDecimal(1);
                    decimal taxa = reader.GetDecimal(2);
                    int numParcelas = reader.GetInt32(3);
                    string tipo = reader.GetString(4);
                    int idCliente = reader.GetInt32(5);
                    reader.Close();

                    const string sqlLimite = "SELECT limite_global FROM clientes WHERE id_cliente = @idCliente";
                    using (var cmdLimite = new NpgsqlCommand(sqlLimite, conn))
                    {
                        cmdLimite.Parameters.AddWithValue("idCliente", idCliente);
                        var limiteResult = cmdLimite.ExecuteScalar();
                        if (limiteResult is null)
                        {
                            return new BadRequestObjectResult("Cliente não encontrado.");
                        }

                        decimal limiteDisponivel = Convert.ToDecimal(limiteResult);

                        if (principal > limiteDisponivel)
                        {
                            return new BadRequestObjectResult($"Crédito Negado! O valor {principal:C2} excede o limite de {limiteDisponivel:C2} do cliente.");
                        }

                        Console.WriteLine($">>> LIMITE APROVADO: Limite de {limiteDisponivel:C2} para uma solicitação de {principal:C2}");
                    }

                        using (var cmdDesembolso = new NpgsqlCommand(@"UPDATE contas SET saldo = saldo + @valor WHERE id_cliente = @idCliente RETURNING id_conta, saldo", conn))
                    {
                        cmdDesembolso.Parameters.AddWithValue("valor", principal);
                        cmdDesembolso.Parameters.AddWithValue("idCliente", idCliente);
                            using var readerSaldo = cmdDesembolso.ExecuteReader();
                            if (!readerSaldo.Read())
                        {
                            return new BadRequestObjectResult("Cliente não possui conta ativa para desembolso.");
                        }

                            var idConta = readerSaldo.GetInt32(0);
                            var saldoAtual = readerSaldo.GetDecimal(1);
                            var saldoAnterior = saldoAtual - principal;
                            readerSaldo.Close();

                            RegistrarMovimentacaoConta(
                                conn,
                                idCliente,
                                idConta,
                                "DESEMBOLSO_PROCESSAMENTO",
                                principal,
                                saldoAnterior,
                                saldoAtual,
                                dataOperacional,
                                "Desembolso realizado no processamento manual de contrato.",
                                idContrato);
                    }

                    using (var cmdDel = new NpgsqlCommand("DELETE FROM parcelas WHERE id_contrato = @id", conn))
                    {
                        cmdDel.Parameters.AddWithValue("id", idContrato);
                        cmdDel.ExecuteNonQuery();
                    }

                    var calc = new CalculadoraAmortizacao();
                    var parcelasCalculadas = calc.GerarCronograma(principal, taxa, numParcelas, tipo);

                    const string sqlInsert = @"INSERT INTO parcelas (id_contrato, num_parcela, data_vencimento, valor_amortizacao, valor_juros, valor_total_parcela) 
                     VALUES (@id, @n, @data, @amort, @juros, @total)";

                    using var cmdInsert = new NpgsqlCommand(sqlInsert, conn);
                    cmdInsert.Parameters.Add("@id", NpgsqlTypes.NpgsqlDbType.Integer);
                    cmdInsert.Parameters.Add("@n", NpgsqlTypes.NpgsqlDbType.Integer);
                    cmdInsert.Parameters.Add("@data", NpgsqlTypes.NpgsqlDbType.Date);
                    cmdInsert.Parameters.Add("@amort", NpgsqlTypes.NpgsqlDbType.Numeric);
                    cmdInsert.Parameters.Add("@juros", NpgsqlTypes.NpgsqlDbType.Numeric);
                    cmdInsert.Parameters.Add("@total", NpgsqlTypes.NpgsqlDbType.Numeric);

                    foreach (var p in parcelasCalculadas)
                    {
                        cmdInsert.Parameters["@id"].Value = idContrato;
                        cmdInsert.Parameters["@n"].Value = p.Numero;
                        cmdInsert.Parameters["@data"].Value = dataOperacional.AddMonths(p.Numero);
                        cmdInsert.Parameters["@amort"].Value = p.Amortizacao;
                        cmdInsert.Parameters["@juros"].Value = p.Juros;
                        cmdInsert.Parameters["@total"].Value = p.Total;

                        cmdInsert.ExecuteNonQuery();
                    }

                    return new OkObjectResult(new { Mensagem = "Sucesso", Contrato = idContrato, ValorDesembolsado = principal });
                }

                return new NotFoundObjectResult("Nenhum contrato pendente.");
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Erro no processamento: {ex.Message}");
            }
        }
    }

    public class PagarParcelaHandler : BaseClientesHandler
    {
        public IActionResult Handle(PagarParcelaCommand command)
        {
            using var conn = new NpgsqlConnection(ConnectionString);
            conn.Open();
            using var trans = conn.BeginTransaction();

            try
            {
                var dataOperacional = ObterDataOperacional(conn, trans);

                const string sqlParc = "SELECT id_parcela, valor_total_parcela FROM parcelas WHERE id_contrato = @c AND num_parcela = @n AND status_pagamento = 'ABERTO'";
                using var cmdParc = new NpgsqlCommand(sqlParc, conn, trans);
                cmdParc.Parameters.AddWithValue("c", command.ContratoId);
                cmdParc.Parameters.AddWithValue("n", command.NumeroParcela);
                using var readerParcela = cmdParc.ExecuteReader();

                if (!readerParcela.Read())
                {
                    return new BadRequestObjectResult("Parcela não encontrada ou já paga.");
                }

                var idParcela = readerParcela.GetInt32(0);
                var valor = readerParcela.GetDecimal(1);
                readerParcela.Close();

                const string sqlDebito = @"
                    UPDATE contas
                    SET saldo = saldo - @v
                    WHERE id_cliente = (SELECT id_cliente FROM contratos WHERE id_contrato = @c)
                    RETURNING id_conta, id_cliente, saldo";
                using var cmdDeb = new NpgsqlCommand(sqlDebito, conn, trans);
                cmdDeb.Parameters.AddWithValue("v", valor);
                cmdDeb.Parameters.AddWithValue("c", command.ContratoId);
                using var readerDebito = cmdDeb.ExecuteReader();
                if (!readerDebito.Read())
                {
                    return new BadRequestObjectResult("Conta não encontrada para pagamento da parcela.");
                }

                var idConta = readerDebito.GetInt32(0);
                var idCliente = readerDebito.GetInt32(1);
                var saldoAtual = readerDebito.GetDecimal(2);
                var saldoAnterior = saldoAtual + valor;
                readerDebito.Close();

                RegistrarMovimentacaoConta(
                    conn,
                    idCliente,
                    idConta,
                    "PAGAMENTO_MANUAL_PARCELA",
                    -valor,
                    saldoAnterior,
                    saldoAtual,
                    dataOperacional,
                    $"Pagamento manual da parcela {command.NumeroParcela}.",
                    command.ContratoId,
                    idParcela,
                    trans);

                const string sqlBaixa = "UPDATE parcelas SET status_pagamento = 'PAGO' WHERE id_contrato = @c AND num_parcela = @n";
                using var cmdBaixa = new NpgsqlCommand(sqlBaixa, conn, trans);
                cmdBaixa.Parameters.AddWithValue("c", command.ContratoId);
                cmdBaixa.Parameters.AddWithValue("n", command.NumeroParcela);
                cmdBaixa.ExecuteNonQuery();

                MarcarContratoComoDesembolsado(conn, command.ContratoId);

                trans.Commit();
                return new OkObjectResult($"Parcela {command.NumeroParcela} paga com sucesso! Saldo atualizado.");
            }
            catch (Exception ex)
            {
                trans.Rollback();
                return new BadRequestObjectResult("Erro no pagamento: " + ex.Message);
            }
        }
    }

    public class SimularCreditoHandler : BaseClientesHandler
    {
        private readonly InMemoryCreditCatalog _catalog;

        public SimularCreditoHandler(InMemoryCreditCatalog catalog)
        {
            _catalog = catalog;
        }

        public IActionResult Handle(SimularCreditoCommand command)
        {
            try
            {
                var offer = _catalog.GetById(command.Request.OfertaId);
                if (offer is null)
                {
                    return new BadRequestObjectResult("Oferta não encontrada.");
                }

                if (offer.ClienteId != command.Request.ClienteId)
                {
                    return new BadRequestObjectResult("Oferta não está disponível para este cliente.");
                }

                if (!offer.Ativa)
                {
                    return new BadRequestObjectResult("Essa oferta não está mais disponível.");
                }

                if (command.Request.ValorSolicitado < offer.ValorMinimo || command.Request.ValorSolicitado > offer.ValorMaximo)
                {
                    return new BadRequestObjectResult($"Valor fora da faixa permitida para a oferta ({offer.ValorMinimo:C2} a {offer.ValorMaximo:C2}).");
                }

                if (command.Request.QuantidadeParcelas < offer.ParcelasMinimas || command.Request.QuantidadeParcelas > offer.ParcelasMaximas)
                {
                    return new BadRequestObjectResult($"Quantidade de parcelas fora do permitido ({offer.ParcelasMinimas} a {offer.ParcelasMaximas}).");
                }

                if (command.Request.DiaVencimento < offer.DiaVencimentoMinimo || command.Request.DiaVencimento > offer.DiaVencimentoMaximo)
                {
                    return new BadRequestObjectResult($"Dia de vencimento fora do permitido ({offer.DiaVencimentoMinimo} a {offer.DiaVencimentoMaximo}).");
                }

                if (command.Request.CarenciaMeses < offer.CarenciaMinimaMeses || command.Request.CarenciaMeses > offer.CarenciaMaximaMeses)
                {
                    return new BadRequestObjectResult($"Carência fora do permitido ({offer.CarenciaMinimaMeses} a {offer.CarenciaMaximaMeses}).");
                }

                using var conn = new NpgsqlConnection(ConnectionString);
                conn.Open();
                const string sqlCliente = "SELECT limite_global FROM clientes WHERE id_cliente = @id";
                using var cmdCliente = new NpgsqlCommand(sqlCliente, conn);
                cmdCliente.Parameters.AddWithValue("id", command.Request.ClienteId);
                var limiteCliente = cmdCliente.ExecuteScalar();
                if (limiteCliente is null)
                {
                    return new BadRequestObjectResult("Cliente não encontrado.");
                }

                var limiteDisponivel = Convert.ToDecimal(limiteCliente);
                if (command.Request.ValorSolicitado > limiteDisponivel)
                {
                    return new BadRequestObjectResult($"Crédito indisponível: o valor sugerido excede o limite do cliente ({limiteDisponivel:C2}).");
                }

                var dataOperacional = ObterDataOperacional(conn);

                var calc = new CalculadoraAmortizacao();
                var cronograma = calc.GerarCronograma(command.Request.ValorSolicitado, offer.TaxaJurosMensal, command.Request.QuantidadeParcelas, offer.TipoAmortizacao);
                var parcelas = cronograma.Select(p => new SimulacaoParcela
                {
                    Numero = p.Numero,
                    DataVencimento = dataOperacional.AddMonths(command.Request.CarenciaMeses + p.Numero).Date.AddDays(command.Request.DiaVencimento - 1),
                    ValorAmortizacao = p.Amortizacao,
                    ValorJuros = p.Juros,
                    ValorTotalParcela = p.Total
                }).ToList();

                var response = new SimulacaoCreditoResponse
                {
                    Aprovado = true,
                    Mensagem = "Simulação aprovada.",
                    Oferta = offer,
                    ValorSolicitado = command.Request.ValorSolicitado,
                    QuantidadeParcelas = command.Request.QuantidadeParcelas,
                    DiaVencimento = command.Request.DiaVencimento,
                    CarenciaMeses = command.Request.CarenciaMeses,
                    ValorParcela = parcelas.FirstOrDefault()?.ValorTotalParcela ?? 0m,
                    Parcelas = parcelas
                };

                return new OkObjectResult(response);
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Erro na simulação: {ex.Message}");
            }
        }
    }

    public class ContratarCreditoHandler : BaseClientesHandler
    {
        private readonly InMemoryCreditCatalog _catalog;

        public ContratarCreditoHandler(InMemoryCreditCatalog catalog)
        {
            _catalog = catalog;
        }

        public IActionResult Handle(ContratarCreditoCommand command)
        {
            using var conn = new NpgsqlConnection(ConnectionString);
            conn.Open();
            using var transaction = conn.BeginTransaction();

            try
            {
                var offer = _catalog.GetById(command.Request.OfertaId);
                if (offer is null || !offer.Ativa)
                {
                    return new BadRequestObjectResult("Oferta inválida ou indisponível.");
                }

                if (offer.ClienteId != command.Request.ClienteId)
                {
                    return new BadRequestObjectResult("Oferta não está disponível para este cliente.");
                }

                if (command.Request.ValorSolicitado < offer.ValorMinimo || command.Request.ValorSolicitado > offer.ValorMaximo)
                {
                    return new BadRequestObjectResult("Valor não contempla os limites da oferta.");
                }

                const string sqlCliente = "SELECT limite_global FROM clientes WHERE id_cliente = @id";
                using var cmdCliente = new NpgsqlCommand(sqlCliente, conn);
                cmdCliente.Parameters.AddWithValue("id", command.Request.ClienteId);
                var limiteCliente = cmdCliente.ExecuteScalar();
                if (limiteCliente is null)
                {
                    return new BadRequestObjectResult("Cliente não encontrado.");
                }

                var limiteDisponivel = Convert.ToDecimal(limiteCliente);
                if (command.Request.ValorSolicitado > limiteDisponivel)
                {
                    return new BadRequestObjectResult("Crédito negado pelo limite do cliente.");
                }

                if (command.Request.ContaDesembolsoId <= 0)
                {
                    return new BadRequestObjectResult("Selecione a conta para desembolso no último passo.");
                }

                const string sqlConta = "SELECT id_conta FROM contas WHERE id_conta = @idConta AND id_cliente = @idCliente";
                using var cmdConta = new NpgsqlCommand(sqlConta, conn);
                cmdConta.Parameters.AddWithValue("idConta", command.Request.ContaDesembolsoId);
                cmdConta.Parameters.AddWithValue("idCliente", command.Request.ClienteId);
                if (cmdConta.ExecuteScalar() is null)
                {
                    return new BadRequestObjectResult("Conta de desembolso inválida para o cliente.");
                }

                var tipoPagamento = NormalizarTipoPagamento(command.Request.TipoPagamento);
                if (string.IsNullOrWhiteSpace(tipoPagamento))
                {
                    tipoPagamento = "Débito em conta";
                }

                const string sqlInsertContrato = @"INSERT INTO contratos (valor_financiado, taxa_juros_mensal, quantidade_parcelas, tipo_amortizacao, tipo_pagamento, id_cliente, conta_desembolso_id)
                    VALUES (@valor, @taxa, @parcelas, @tipo, @tipoPagamento, @cliente, @contaDesembolsoId)
                    RETURNING id_contrato";
                using var cmdContrato = new NpgsqlCommand(sqlInsertContrato, conn);
                cmdContrato.Parameters.AddWithValue("valor", command.Request.ValorSolicitado);
                cmdContrato.Parameters.AddWithValue("taxa", offer.TaxaJurosMensal);
                cmdContrato.Parameters.AddWithValue("parcelas", command.Request.QuantidadeParcelas);
                cmdContrato.Parameters.AddWithValue("tipo", offer.TipoAmortizacao);
                cmdContrato.Parameters.AddWithValue("tipoPagamento", tipoPagamento);
                cmdContrato.Parameters.AddWithValue("cliente", command.Request.ClienteId);
                cmdContrato.Parameters.AddWithValue("contaDesembolsoId", command.Request.ContaDesembolsoId);
                var idContrato = (int)cmdContrato.ExecuteScalar();

                using (var cmdStatusContrato = new NpgsqlCommand("UPDATE contratos SET status = @status WHERE id_contrato = @id", conn))
                {
                    cmdStatusContrato.Parameters.AddWithValue("status", ContratoStatus.GeracaoContratos);
                    cmdStatusContrato.Parameters.AddWithValue("id", idContrato);
                    cmdStatusContrato.ExecuteNonQuery();
                }

                var dataOperacional = ObterDataOperacional(conn);

                var calc = new CalculadoraAmortizacao();
                var cronograma = calc.GerarCronograma(command.Request.ValorSolicitado, offer.TaxaJurosMensal, command.Request.QuantidadeParcelas, offer.TipoAmortizacao);
                const string sqlInsertParcela = @"INSERT INTO parcelas (id_contrato, num_parcela, data_vencimento, valor_amortizacao, valor_juros, valor_total_parcela, status_pagamento)
                    VALUES (@contrato, @numero, @data, @amort, @juros, @total, 'ABERTO')";
                using var cmdParcela = new NpgsqlCommand(sqlInsertParcela, conn);
                cmdParcela.Parameters.Add("@contrato", NpgsqlTypes.NpgsqlDbType.Integer);
                cmdParcela.Parameters.Add("@numero", NpgsqlTypes.NpgsqlDbType.Integer);
                cmdParcela.Parameters.Add("@data", NpgsqlTypes.NpgsqlDbType.Date);
                cmdParcela.Parameters.Add("@amort", NpgsqlTypes.NpgsqlDbType.Numeric);
                cmdParcela.Parameters.Add("@juros", NpgsqlTypes.NpgsqlDbType.Numeric);
                cmdParcela.Parameters.Add("@total", NpgsqlTypes.NpgsqlDbType.Numeric);

                foreach (var parcela in cronograma)
                {
                    cmdParcela.Parameters["@contrato"].Value = idContrato;
                    cmdParcela.Parameters["@numero"].Value = parcela.Numero;
                    cmdParcela.Parameters["@data"].Value = dataOperacional.AddMonths(command.Request.CarenciaMeses + parcela.Numero).Date.AddDays(command.Request.DiaVencimento - 1);
                    cmdParcela.Parameters["@amort"].Value = parcela.Amortizacao;
                    cmdParcela.Parameters["@juros"].Value = parcela.Juros;
                    cmdParcela.Parameters["@total"].Value = parcela.Total;
                    cmdParcela.ExecuteNonQuery();
                }

                _catalog.AddRequest(new CreditLimitRequest
                {
                    ClienteId = command.Request.ClienteId,
                    OfertaId = offer.Id,
                    ValorSolicitado = command.Request.ValorSolicitado,
                    QuantidadeParcelas = command.Request.QuantidadeParcelas,
                    DiaVencimento = command.Request.DiaVencimento,
                    CarenciaMeses = command.Request.CarenciaMeses,
                    Status = "APROVADO",
                    Garantias = offer.Garantias
                });

                transaction.Commit();

                offer.Ativa = false;
                offer.Status = "CONSUMED";
                _catalog.AddOrUpdate(offer);

                return new OkObjectResult(new
                {
                    Mensagem = "Contrato criado com sucesso.",
                    ContratoId = idContrato,
                    Oferta = offer.Nome,
                    ValorFinanciado = command.Request.ValorSolicitado,
                    Parcelas = command.Request.QuantidadeParcelas,
                    TipoPagamento = tipoPagamento,
                    Garantias = offer.Garantias
                });
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                return new BadRequestObjectResult($"Erro na contratação: {ex.Message}");
            }
        }
    }

    public class ObterDetalhesContratoHandler : BaseClientesHandler
    {
        public IActionResult Handle(ObterDetalhesContratoCommand command)
        {
            try
            {
                using var conn = new NpgsqlConnection(ConnectionString);
                conn.Open();

                AtualizarParcelasEVincularStatusDosContratos(conn);

                const string sqlContrato = @"SELECT c.id_contrato, c.id_cliente, c.conta_desembolso_id, c.valor_financiado, c.taxa_juros_mensal, c.quantidade_parcelas, c.tipo_amortizacao, to_jsonb(c) ->> 'tipo_pagamento' AS tipo_pagamento, to_jsonb(c) ->> 'status' AS status, to_jsonb(c) ->> 'contrato_gerado_texto' AS contrato_gerado_texto, (to_jsonb(c) ->> 'contrato_gerado_em')::timestamptz AS contrato_gerado_em, (to_jsonb(c) ->> 'assinado_em')::timestamptz AS assinado_em, (to_jsonb(c) ->> 'desembolso_autorizado_em')::timestamptz AS desembolso_autorizado_em FROM contratos c WHERE c.id_contrato = @id";
                using var cmdContrato = new NpgsqlCommand(sqlContrato, conn);
                cmdContrato.Parameters.AddWithValue("id", command.ContratoId);
                using var reader = cmdContrato.ExecuteReader();

                if (!reader.Read())
                {
                    return new NotFoundObjectResult("Contrato não encontrado.");
                }

                var contrato = new ContratoDetalhesResponse
                {
                    IdContrato = reader.GetInt32(0),
                    IdCliente = reader.GetInt32(1),
                    ContaDesembolsoId = reader.IsDBNull(2) ? null : reader.GetInt32(2),
                    ValorFinanciado = reader.GetDecimal(3),
                    TaxaJurosMensal = reader.GetDecimal(4),
                    QuantidadeParcelas = reader.GetInt32(5),
                    TipoAmortizacao = reader.GetString(6),
                    TipoPagamento = NormalizarTipoPagamento(reader.IsDBNull(7) ? null : reader.GetString(7)),
                    Status = NormalizarStatusContrato(reader.IsDBNull(8) ? null : reader.GetString(8)),
                    ContratoGeradoTexto = reader.IsDBNull(9) ? null : reader.GetString(9),
                    ContratoGeradoEm = reader.IsDBNull(10) ? null : reader.GetDateTime(10),
                    AssinadoEm = reader.IsDBNull(11) ? null : reader.GetDateTime(11),
                    DesembolsoAutorizadoEm = reader.IsDBNull(12) ? null : reader.GetDateTime(12)
                };

                reader.Close();

                const string sqlParcelas = @"SELECT num_parcela, data_vencimento, valor_amortizacao, valor_juros, valor_total_parcela FROM parcelas WHERE id_contrato = @id ORDER BY num_parcela";
                using var cmdParcelas = new NpgsqlCommand(sqlParcelas, conn);
                cmdParcelas.Parameters.AddWithValue("id", command.ContratoId);
                using var parcelasReader = cmdParcelas.ExecuteReader();
                while (parcelasReader.Read())
                {
                    contrato.Parcelas.Add(new SimulacaoParcela
                    {
                        Numero = parcelasReader.GetInt32(0),
                        DataVencimento = parcelasReader.GetDateTime(1),
                        ValorAmortizacao = parcelasReader.GetDecimal(2),
                        ValorJuros = parcelasReader.GetDecimal(3),
                        ValorTotalParcela = parcelasReader.GetDecimal(4)
                    });
                }

                return new OkObjectResult(contrato);
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Erro ao buscar detalhes: {ex.Message}");
            }
        }
    }

    public class AtualizarStatusContratoHandler : BaseClientesHandler
    {
        public IActionResult Handle(AtualizarStatusContratoCommand command)
        {
            try
            {
                using var conn = new NpgsqlConnection(ConnectionString);
                conn.Open();

                if (!ContratoStatus.Todos.Contains(command.Status, StringComparer.OrdinalIgnoreCase))
                {
                    return new BadRequestObjectResult("Status inválido.");
                }

                const string sql = "UPDATE contratos SET status = @status WHERE id_contrato = @id";
                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("status", command.Status);
                cmd.Parameters.AddWithValue("id", command.ContratoId);
                var linhas = cmd.ExecuteNonQuery();

                if (linhas == 0)
                {
                    return new NotFoundObjectResult("Contrato não encontrado.");
                }

                return new OkObjectResult(new { Mensagem = "Status atualizado com sucesso." });
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Erro ao atualizar status: {ex.Message}");
            }
        }
    }

    public class AssinarContratoHandler : BaseClientesHandler
    {
        public IActionResult Handle(AssinarContratoCommand command)
        {
            try
            {
                using var conn = new NpgsqlConnection(ConnectionString);
                conn.Open();

                                var dataOperacional = ObterDataOperacional(conn);

                const string sql = @"
                    UPDATE contratos c
                    SET status = @novoStatus,
                                                assinado_em = @dataOperacional
                    WHERE c.id_contrato = @idContrato
                      AND c.id_cliente = @idCliente
                      AND LOWER(COALESCE(to_jsonb(c) ->> 'status', '')) = LOWER(@statusAtual)
                    RETURNING c.id_contrato";

                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("novoStatus", ContratoStatus.AguardandoDesembolso);
                cmd.Parameters.AddWithValue("idContrato", command.ContratoId);
                cmd.Parameters.AddWithValue("idCliente", command.CustomerId);
                cmd.Parameters.AddWithValue("statusAtual", ContratoStatus.PendenteAssinatura);
                cmd.Parameters.AddWithValue("dataOperacional", dataOperacional);

                var result = cmd.ExecuteScalar();
                if (result is null)
                {
                    return new BadRequestObjectResult("Contrato não encontrado para esse cliente ou status atual não permite assinatura.");
                }

                return new OkObjectResult(new
                {
                    Mensagem = "Contrato assinado com sucesso.",
                    ContratoId = command.ContratoId,
                    NovoStatus = ContratoStatus.AguardandoDesembolso
                });
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Erro ao assinar contrato: {ex.Message}");
            }
        }
    }

    public class AutorizarDesembolsoHandler : BaseClientesHandler
    {
        public IActionResult Handle(AutorizarDesembolsoCommand command)
        {
            using var conn = new NpgsqlConnection(ConnectionString);
            conn.Open();
            using var trans = conn.BeginTransaction();

            try
            {
                var dataOperacional = ObterDataOperacional(conn, trans);

                const string sqlBusca = @"
                                        SELECT id_cliente, valor_financiado, conta_desembolso_id
                    FROM contratos c
                    WHERE c.id_contrato = @idContrato
                      AND LOWER(COALESCE(to_jsonb(c) ->> 'status', '')) = LOWER(@statusAtual)
                    FOR UPDATE";

                using var cmdBusca = new NpgsqlCommand(sqlBusca, conn, trans);
                cmdBusca.Parameters.AddWithValue("idContrato", command.ContratoId);
                cmdBusca.Parameters.AddWithValue("statusAtual", ContratoStatus.AguardandoDesembolso);
                using var reader = cmdBusca.ExecuteReader();

                if (!reader.Read())
                {
                    return new BadRequestObjectResult("Contrato não está aguardando desembolso ou não existe.");
                }

                var idCliente = reader.GetInt32(0);
                var valor = reader.GetDecimal(1);
                var contaDesembolsoId = reader.IsDBNull(2) ? (int?)null : reader.GetInt32(2);
                reader.Close();

                if (!contaDesembolsoId.HasValue)
                {
                    const string sqlContaFallback = "SELECT id_conta FROM contas WHERE id_cliente = @idCliente ORDER BY id_conta LIMIT 1";
                    using var cmdContaFallback = new NpgsqlCommand(sqlContaFallback, conn, trans);
                    cmdContaFallback.Parameters.AddWithValue("idCliente", idCliente);
                    var fallbackId = cmdContaFallback.ExecuteScalar();
                    if (fallbackId is null)
                    {
                        return new BadRequestObjectResult("Cliente não possui conta ativa para desembolso.");
                    }

                    contaDesembolsoId = Convert.ToInt32(fallbackId);
                }

                const string sqlCreditarConta = @"
                    UPDATE contas
                    SET saldo = saldo + @valor
                    WHERE id_conta = @idConta";
                using var cmdConta = new NpgsqlCommand(sqlCreditarConta, conn, trans);
                cmdConta.Parameters.AddWithValue("valor", valor);
                cmdConta.Parameters.AddWithValue("idConta", contaDesembolsoId.Value);

                if (cmdConta.ExecuteNonQuery() == 0)
                {
                    return new BadRequestObjectResult("Cliente não possui conta ativa para desembolso.");
                }

                const string sqlAtualizarStatus = @"
                    UPDATE contratos
                    SET status = @novoStatus,
                        desembolso_autorizado_em = @dataOperacional
                    WHERE id_contrato = @idContrato
                    RETURNING id_cliente, valor_financiado";
                using var cmdStatus = new NpgsqlCommand(sqlAtualizarStatus, conn, trans);
                cmdStatus.Parameters.AddWithValue("novoStatus", ContratoStatus.Desembolsado);
                cmdStatus.Parameters.AddWithValue("idContrato", command.ContratoId);
                cmdStatus.Parameters.AddWithValue("dataOperacional", dataOperacional);
                using var readerStatus = cmdStatus.ExecuteReader();
                if (!readerStatus.Read())
                {
                    return new BadRequestObjectResult("Não foi possível finalizar o desembolso do contrato.");
                }
                readerStatus.Close();

                const string sqlSaldoConta = "SELECT id_conta, saldo FROM contas WHERE id_conta = @idConta LIMIT 1";
                using var cmdSaldoConta = new NpgsqlCommand(sqlSaldoConta, conn, trans);
                cmdSaldoConta.Parameters.AddWithValue("idConta", contaDesembolsoId.Value);
                using var readerConta = cmdSaldoConta.ExecuteReader();
                if (readerConta.Read())
                {
                    var idConta = readerConta.GetInt32(0);
                    var saldoAtual = readerConta.GetDecimal(1);
                    var saldoAnterior = saldoAtual - valor;
                    readerConta.Close();

                    RegistrarMovimentacaoConta(
                        conn,
                        idCliente,
                        idConta,
                        "DESEMBOLSO_AUTORIZADO",
                        valor,
                        saldoAnterior,
                        saldoAtual,
                        dataOperacional,
                        "Desembolso autorizado no painel administrativo.",
                        command.ContratoId,
                        null,
                        trans);
                }
                else
                {
                    readerConta.Close();
                }

                trans.Commit();
                return new OkObjectResult(new
                {
                    Mensagem = "Desembolso autorizado com sucesso.",
                    ContratoId = command.ContratoId,
                    NovoStatus = ContratoStatus.Desembolsado
                });
            }
            catch (Exception ex)
            {
                trans.Rollback();
                return new BadRequestObjectResult($"Erro ao autorizar desembolso: {ex.Message}");
            }
        }
    }

    public class CriarOfertaHandler
    {
        private readonly InMemoryCreditCatalog _catalog;

        public CriarOfertaHandler(InMemoryCreditCatalog catalog)
        {
            _catalog = catalog;
        }

        public IActionResult Handle(CriarOfertaCommand command)
        {
            if (command.Oferta.ClienteId <= 0)
            {
                return new BadRequestObjectResult("Selecione um cliente válido para a oferta.");
            }

            var oferta = _catalog.AddOrUpdate(command.Oferta);
            return new OkObjectResult(oferta);
        }
    }

    public class ListarOfertasHandler
    {
        private readonly InMemoryCreditCatalog _catalog;

        public ListarOfertasHandler(InMemoryCreditCatalog catalog)
        {
            _catalog = catalog;
        }

        public IActionResult Handle(ListarOfertasCommand command)
        {
            var requestsByOffer = _catalog.Requests
                .Where(r => string.Equals(r.Status, "APROVADO", StringComparison.OrdinalIgnoreCase))
                .GroupBy(r => r.OfertaId)
                .ToDictionary(group => group.Key, _ => true);

            var ofertas = _catalog.Offers
                .Select(offer =>
                {
                    var status = offer.Ativa
                        ? "ACTIVE"
                        : requestsByOffer.ContainsKey(offer.Id)
                            ? "CONSUMED"
                            : "INACTIVE";

                    offer.Status = status;
                    return offer;
                })
                .AsEnumerable();

            if (command.CustomerId.HasValue)
            {
                ofertas = ofertas.Where(o => o.ClienteId == command.CustomerId.Value);
            }

            if (!command.IncluirInativas)
            {
                ofertas = ofertas.Where(o => o.Ativa);
            }

            return new OkObjectResult(ofertas.ToList());
        }
    }

    public class ListarSolicitacoesAdminHandler
    {
        private readonly InMemoryCreditCatalog _catalog;

        public ListarSolicitacoesAdminHandler(InMemoryCreditCatalog catalog)
        {
            _catalog = catalog;
        }

        public IActionResult Handle(ListarSolicitacoesAdminCommand command)
        {
            return new OkObjectResult(_catalog.Requests.OrderByDescending(r => r.CriadoEm).ToList());
        }
    }
}
