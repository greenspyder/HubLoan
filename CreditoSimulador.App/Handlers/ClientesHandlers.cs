using Credito.Calculos;
using CreditoSimulador.App.Commands;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace CreditoSimulador.App.Handlers
{
    public abstract class BaseClientesHandler
    {
        protected readonly string ConnectionString = "Host=localhost;Username=postgres;Password=13531;Database=postgres";
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
                    const string sqlFiltro = "SELECT id_cliente, nome, limite_global FROM clientes WHERE id_cliente = @id";
                    using var cmdFiltro = new NpgsqlCommand(sqlFiltro, conn);
                    cmdFiltro.Parameters.AddWithValue("id", command.CustomerId.Value);

                    using var readerFiltro = cmdFiltro.ExecuteReader();
                    if (readerFiltro.Read())
                    {
                        return new OkObjectResult(new
                        {
                            Cliente = new { Id = readerFiltro.GetInt32(0), Nome = readerFiltro.GetString(1), Limite = readerFiltro.GetDecimal(2) }
                        });
                    }

                    return new NotFoundObjectResult("Cliente para impersonation não encontrado.");
                }

                const string sqlTodos = "SELECT id_cliente, nome, limite_global FROM clientes ORDER BY nome";
                using var cmdTodos = new NpgsqlCommand(sqlTodos, conn);
                using var reader = cmdTodos.ExecuteReader();

                while (reader.Read())
                {
                    listaClientes.Add(new { Id = reader.GetInt32(0), Nome = reader.GetString(1), Limite = reader.GetDecimal(2) });
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

                const string sql = @"
            SELECT 
                id_contrato, 
                valor_financiado, 
                taxa_juros_mensal, 
                quantidade_parcelas, 
                tipo_amortizacao, 
                id_cliente
            FROM contratos 
            WHERE id_cliente = @id
            ORDER BY id_contrato DESC";

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
                        statusPagamento = reader.IsDBNull(7) ? "Pendente" : reader.GetString(7)
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
                        decimal limiteDisponivel = (decimal)cmdLimite.ExecuteScalar();

                        if (principal > limiteDisponivel)
                        {
                            return new BadRequestObjectResult($"Crédito Negado! O valor {principal:C2} excede o limite de {limiteDisponivel:C2} do cliente.");
                        }

                        Console.WriteLine($">>> LIMITE APROVADO: Limite de {limiteDisponivel:C2} para uma solicitação de {principal:C2}");
                    }

                    const string sqlDesembolso = "UPDATE contas SET saldo = saldo + @valor WHERE id_cliente = @idCliente";
                    using (var cmdDesembolso = new NpgsqlCommand(sqlDesembolso, conn))
                    {
                        cmdDesembolso.Parameters.AddWithValue("valor", principal);
                        cmdDesembolso.Parameters.AddWithValue("idCliente", idCliente);
                        int linhasAfetadas = cmdDesembolso.ExecuteNonQuery();

                        if (linhasAfetadas == 0)
                        {
                            return new BadRequestObjectResult("Cliente não possui conta ativa para desembolso.");
                        }
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
                        cmdInsert.Parameters["@data"].Value = DateTime.Now.AddMonths(p.Numero);
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
                const string sqlParc = "SELECT valor_total_parcela FROM parcelas WHERE id_contrato = @c AND num_parcela = @n AND status_pagamento = 'ABERTO'";
                using var cmdParc = new NpgsqlCommand(sqlParc, conn);
                cmdParc.Parameters.AddWithValue("c", command.ContratoId);
                cmdParc.Parameters.AddWithValue("n", command.NumeroParcela);
                var valor = (decimal?)cmdParc.ExecuteScalar();

                if (valor == null)
                {
                    return new BadRequestObjectResult("Parcela não encontrada ou já paga.");
                }

                const string sqlDebito = "UPDATE contas SET saldo = saldo - @v WHERE id_cliente = (SELECT id_cliente FROM contratos WHERE id_contrato = @c)";
                using var cmdDeb = new NpgsqlCommand(sqlDebito, conn);
                cmdDeb.Parameters.AddWithValue("v", valor);
                cmdDeb.Parameters.AddWithValue("c", command.ContratoId);
                cmdDeb.ExecuteNonQuery();

                const string sqlBaixa = "UPDATE parcelas SET status_pagamento = 'PAGO' WHERE id_contrato = @c AND num_parcela = @n";
                using var cmdBaixa = new NpgsqlCommand(sqlBaixa, conn);
                cmdBaixa.Parameters.AddWithValue("c", command.ContratoId);
                cmdBaixa.Parameters.AddWithValue("n", command.NumeroParcela);
                cmdBaixa.ExecuteNonQuery();

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
}
