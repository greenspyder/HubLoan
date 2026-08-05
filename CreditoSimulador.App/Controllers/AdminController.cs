using CreditoSimulador.App.Commands;
using CreditoSimulador.App.Data;
using CreditoSimulador.App.Handlers;
using CreditoSimulador.App.Models;
using CreditoSimulador.App.Services;
using Hangfire;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace CreditoSimulador.App.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly CriarOfertaHandler _criarOfertaHandler;
        private readonly ListarOfertasHandler _listarOfertasHandler;
        private readonly ListarSolicitacoesAdminHandler _listarSolicitacoesHandler;
        private readonly AutorizarDesembolsoHandler _autorizarDesembolsoHandler;
        private readonly IBackgroundJobClient _backgroundJobClient;

        public AdminController(
            IConfiguration configuration,
            CriarOfertaHandler criarOfertaHandler,
            ListarOfertasHandler listarOfertasHandler,
            ListarSolicitacoesAdminHandler listarSolicitacoesHandler,
            AutorizarDesembolsoHandler autorizarDesembolsoHandler,
            IBackgroundJobClient backgroundJobClient)
        {
            _connectionString = ConnectionStringResolver.Resolve(configuration);
            _criarOfertaHandler = criarOfertaHandler;
            _listarOfertasHandler = listarOfertasHandler;
            _listarSolicitacoesHandler = listarSolicitacoesHandler;
            _autorizarDesembolsoHandler = autorizarDesembolsoHandler;
            _backgroundJobClient = backgroundJobClient;
        }

        [HttpGet("ofertas")]
        public IActionResult ListarOfertas()
        {
            return _listarOfertasHandler.Handle(new ListarOfertasCommand
            {
                IncluirInativas = true
            });
        }

        [HttpPost("ofertas")]
        public IActionResult CriarOferta([FromBody] CreditOffer oferta)
        {
            return _criarOfertaHandler.Handle(new CriarOfertaCommand { Oferta = oferta });
        }

        [HttpGet("solicitacoes")]
        public IActionResult ListarSolicitacoes()
        {
            return _listarSolicitacoesHandler.Handle(new ListarSolicitacoesAdminCommand());
        }

        [HttpPost("clientes")]
        public IActionResult CriarCliente([FromBody] CriarClienteRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Nome))
            {
                return BadRequest(new { message = "Nome do cliente é obrigatório." });
            }

            if (request.LimiteGlobal < 0)
            {
                return BadRequest(new { message = "Limite do cliente não pode ser negativo." });
            }

            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                const string sql = @"
                    INSERT INTO clientes (nome, limite_global)
                    VALUES (@nome, @limiteGlobal)
                    RETURNING id_cliente, nome, limite_global";

                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("nome", request.Nome.Trim());
                cmd.Parameters.AddWithValue("limiteGlobal", request.LimiteGlobal);

                using var reader = cmd.ExecuteReader();
                if (!reader.Read())
                {
                    return BadRequest(new { message = "Não foi possível criar o cliente." });
                }

                return Ok(new
                {
                    id = reader.GetInt32(0),
                    nome = reader.GetString(1),
                    limite = reader.GetDecimal(2)
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("contract-templates")]
        public IActionResult ListarTemplatesContrato()
        {
            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                const string sql = @"
                    SELECT id_template, nome, conteudo, ativo, criado_em, atualizado_em
                    FROM contract_templates
                    ORDER BY criado_em DESC";

                using var cmd = new NpgsqlCommand(sql, conn);
                using var reader = cmd.ExecuteReader();

                var templates = new List<ContractTemplateResponse>();
                while (reader.Read())
                {
                    templates.Add(new ContractTemplateResponse
                    {
                        IdTemplate = reader.GetString(0),
                        Nome = reader.GetString(1),
                        Conteudo = reader.GetString(2),
                        Ativo = reader.GetBoolean(3),
                        CriadoEm = reader.GetDateTime(4),
                        AtualizadoEm = reader.IsDBNull(5) ? null : reader.GetDateTime(5)
                    });
                }

                return Ok(templates);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("contract-templates")]
        public IActionResult CriarTemplateContrato([FromBody] ContractTemplateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Nome) || string.IsNullOrWhiteSpace(request.Conteudo))
            {
                return BadRequest(new { message = "Nome e conteúdo do template são obrigatórios." });
            }

            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                const string sql = @"
                    INSERT INTO contract_templates (id_template, nome, conteudo, ativo, criado_em)
                    VALUES (@id, @nome, @conteudo, @ativo, NOW())
                    RETURNING id_template, nome, conteudo, ativo, criado_em";

                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", Guid.NewGuid().ToString());
                cmd.Parameters.AddWithValue("nome", request.Nome.Trim());
                cmd.Parameters.AddWithValue("conteudo", request.Conteudo.Trim());
                cmd.Parameters.AddWithValue("ativo", request.Ativo);

                using var reader = cmd.ExecuteReader();
                if (!reader.Read())
                {
                    return BadRequest(new { message = "Não foi possível criar o template." });
                }

                return Ok(new ContractTemplateResponse
                {
                    IdTemplate = reader.GetString(0),
                    Nome = reader.GetString(1),
                    Conteudo = reader.GetString(2),
                    Ativo = reader.GetBoolean(3),
                    CriadoEm = reader.GetDateTime(4)
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("contratos")]
        public IActionResult ListarContratosAdmin()
        {
            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                const string sql = @"
                    SELECT id_contrato, id_cliente, valor_financiado, quantidade_parcelas, tipo_amortizacao, status
                    FROM contratos
                    ORDER BY id_contrato DESC";

                using var cmd = new NpgsqlCommand(sql, conn);
                using var reader = cmd.ExecuteReader();

                var contratos = new List<object>();
                while (reader.Read())
                {
                    contratos.Add(new
                    {
                        idContrato = reader.GetInt32(0),
                        idCliente = reader.GetInt32(1),
                        valorFinanciado = reader.GetDecimal(2),
                        quantidadeParcelas = reader.GetInt32(3),
                        tipoAmortizacao = reader.GetString(4),
                        status = reader.IsDBNull(5) ? "geração de contratos" : reader.GetString(5)
                    });
                }

                return Ok(contratos);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("contratos/{contratoId:int}/autorizar-desembolso")]
        public IActionResult AutorizarDesembolso(int contratoId)
        {
            return _autorizarDesembolsoHandler.Handle(new AutorizarDesembolsoCommand
            {
                ContratoId = contratoId
            });
        }

        /// <summary>
        /// Executa o consumer de geração de contratos de forma síncrona.
        /// Útil em deploys onde o Hangfire não consegue inicializar (ex: Render free tier com Neon).
        /// </summary>
        [HttpPost("processar-contratos")]
        public IActionResult ProcessarContratosPendentes([FromServices] LoanContractGenerationConsumer consumer)
        {
            try
            {
                consumer.Execute();
                return Ok(new { message = "Processamento de contratos executado com sucesso." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("contas")]
        public IActionResult ListarContas([FromQuery] int? customerId = null)
        {
            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                const string sql = @"
                    SELECT ct.id_conta, ct.id_cliente, c.nome, ct.saldo
                    FROM contas ct
                    INNER JOIN clientes c ON c.id_cliente = ct.id_cliente
                    WHERE (@customerId::integer IS NULL OR ct.id_cliente = @customerId::integer)
                    ORDER BY c.nome";

                using var cmd = new NpgsqlCommand(sql, conn);
                var customerIdParam = cmd.Parameters.Add("customerId", NpgsqlDbType.Integer);
                customerIdParam.Value = customerId.HasValue ? customerId.Value : DBNull.Value;
                using var reader = cmd.ExecuteReader();

                var contas = new List<AdminAccountResponse>();
                while (reader.Read())
                {
                    contas.Add(new AdminAccountResponse
                    {
                        IdConta = reader.GetInt32(0),
                        ClienteId = reader.GetInt32(1),
                        NomeCliente = reader.GetString(2),
                        Saldo = reader.GetDecimal(3)
                    });
                }

                return Ok(contas);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("contas")]
        public IActionResult CriarConta([FromBody] CreateAccountRequest request)
        {
            if (request.ClienteId <= 0)
            {
                return BadRequest(new { message = "Cliente inválido." });
            }

            if (request.SaldoInicial < 0)
            {
                return BadRequest(new { message = "Saldo inicial não pode ser negativo." });
            }

            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();
                using var trans = conn.BeginTransaction();
                var dataOperacional = ObterDataOperacional(conn, trans);

                var possuiNumeroConta = ColunaExiste(conn, trans, "contas", "numero_conta");
                var tipoNumeroConta = possuiNumeroConta
                    ? ObterTipoColuna(conn, trans, "contas", "numero_conta")
                    : null;

                var sqlInsert = possuiNumeroConta
                    ? @"INSERT INTO contas (id_cliente, saldo, numero_conta)
                        VALUES (@idCliente, @saldo, @numeroConta)
                        RETURNING id_conta"
                    : @"INSERT INTO contas (id_cliente, saldo)
                        VALUES (@idCliente, @saldo)
                        RETURNING id_conta";

                using var cmdInsert = new NpgsqlCommand(sqlInsert, conn, trans);
                cmdInsert.Parameters.AddWithValue("idCliente", request.ClienteId);
                cmdInsert.Parameters.AddWithValue("saldo", request.SaldoInicial);
                if (possuiNumeroConta)
                {
                    var numeroConta = GerarNumeroConta(tipoNumeroConta, request.ClienteId);
                    cmdInsert.Parameters.AddWithValue("numeroConta", numeroConta);
                }
                var idConta = Convert.ToInt32(cmdInsert.ExecuteScalar());

                RegistrarMovimentacaoConta(
                    conn,
                    request.ClienteId,
                    idConta,
                    "ABERTURA_CONTA",
                    request.SaldoInicial,
                    0m,
                    request.SaldoInicial,
                    dataOperacional,
                    "Conta criada pelo administrador.",
                    null,
                    null,
                    trans);

                trans.Commit();

                return Ok(new { Mensagem = "Conta criada com sucesso.", IdConta = idConta });
            }
            catch (PostgresException ex) when (ex.SqlState == "23503")
            {
                return BadRequest(new { message = "Cliente não encontrado para criar conta." });
            }
            catch (PostgresException ex) when (ex.SqlState == "23502" && ex.Message.Contains("numero_conta", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Não foi possível gerar o número da conta. Verifique o schema da tabela contas." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("contas/deposito")]
        public IActionResult Depositar([FromBody] DepositAccountRequest request)
        {
            if (request.IdConta <= 0 || request.Valor <= 0)
            {
                return BadRequest(new { message = "Conta e valor de depósito devem ser válidos." });
            }

            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();
                using var trans = conn.BeginTransaction();
                var dataOperacional = ObterDataOperacional(conn, trans);

                const string sqlSaldoAtual = "SELECT id_conta, id_cliente, saldo FROM contas WHERE id_conta = @idConta FOR UPDATE";
                using var cmdSaldoAtual = new NpgsqlCommand(sqlSaldoAtual, conn, trans);
                cmdSaldoAtual.Parameters.AddWithValue("idConta", request.IdConta);
                using var readerSaldo = cmdSaldoAtual.ExecuteReader();
                if (!readerSaldo.Read())
                {
                    return BadRequest(new { message = "Conta do cliente não encontrada." });
                }
                var idConta = readerSaldo.GetInt32(0);
                var idCliente = readerSaldo.GetInt32(1);
                var saldoAnterior = readerSaldo.GetDecimal(2);
                readerSaldo.Close();

                const string sql = @"
                    UPDATE contas
                    SET saldo = saldo + @valor
                    WHERE id_conta = @idConta
                    RETURNING saldo";

                using var cmd = new NpgsqlCommand(sql, conn, trans);
                cmd.Parameters.AddWithValue("valor", request.Valor);
                cmd.Parameters.AddWithValue("idConta", request.IdConta);
                var saldoAtual = cmd.ExecuteScalar();
                if (saldoAtual is null)
                {
                    return BadRequest(new { message = "Conta do cliente não encontrada." });
                }

                var saldoAtualizado = Convert.ToDecimal(saldoAtual);
                RegistrarMovimentacaoConta(
                    conn,
                    idCliente,
                    idConta,
                    "DEPOSITO_ADMIN",
                    request.Valor,
                    saldoAnterior,
                    saldoAtualizado,
                    dataOperacional,
                    "Depósito realizado pelo administrador.",
                    null,
                    null,
                    trans);

                trans.Commit();

                return Ok(new { Mensagem = "Depósito realizado com sucesso.", SaldoAtual = saldoAtualizado });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("movimentacoes")]
        public IActionResult ListarMovimentacoes([FromQuery] int? clienteId = null, [FromQuery] int limit = 100)
        {
            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                if (limit <= 0 || limit > 300)
                {
                    limit = 100;
                }

                const string sql = @"
                    SELECT id_movimentacao,
                           id_cliente,
                           id_conta,
                           tipo,
                           valor,
                           saldo_anterior,
                           saldo_atual,
                           descricao,
                           id_contrato,
                           id_parcela,
                           data_operacional,
                           criado_em
                    FROM account_movements
                    WHERE (@clienteId::integer IS NULL OR id_cliente = @clienteId::integer)
                    ORDER BY id_movimentacao DESC
                    LIMIT @limit";

                using var cmd = new NpgsqlCommand(sql, conn);
                var clienteIdParam = cmd.Parameters.Add("clienteId", NpgsqlDbType.Integer);
                clienteIdParam.Value = clienteId.HasValue ? clienteId.Value : DBNull.Value;
                cmd.Parameters.AddWithValue("limit", limit);
                using var reader = cmd.ExecuteReader();

                var movimentos = new List<AccountMovementResponse>();
                while (reader.Read())
                {
                    movimentos.Add(new AccountMovementResponse
                    {
                        IdMovimentacao = reader.GetInt32(0),
                        ClienteId = reader.GetInt32(1),
                        IdConta = reader.GetInt32(2),
                        Tipo = reader.GetString(3),
                        Valor = reader.GetDecimal(4),
                        SaldoAnterior = reader.GetDecimal(5),
                        SaldoAtual = reader.GetDecimal(6),
                        Descricao = reader.IsDBNull(7) ? null : reader.GetString(7),
                        IdContrato = reader.IsDBNull(8) ? null : reader.GetInt32(8),
                        IdParcela = reader.IsDBNull(9) ? null : reader.GetInt32(9),
                        DataOperacional = reader.GetDateTime(10),
                        CriadoEm = reader.GetDateTime(11)
                    });
                }

                return Ok(movimentos);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("data-operacional")]
        public IActionResult ObterDataOperacional()
        {
            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                const string sql = @"
                    SELECT data_operacional
                    FROM operational_control
                    WHERE id = 1";

                using var cmd = new NpgsqlCommand(sql, conn);
                var result = cmd.ExecuteScalar();

                var possuiDataCustomizada = result is DateTime or DateOnly;
                var dataAtual = ConverterDataOperacional(result);

                return Ok(new OperationalDateResponse
                {
                    DataAtual = dataAtual,
                    UsandoDataCustomizada = possuiDataCustomizada
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("data-operacional")]
        public IActionResult AtualizarDataOperacional([FromBody] OperationalDateRequest request)
        {
            try
            {
                request ??= new OperationalDateRequest();

                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                const string sql = @"
                    INSERT INTO operational_control (id, data_operacional)
                    VALUES (1, @data)
                    ON CONFLICT (id)
                    DO UPDATE SET data_operacional = @data";

                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("data", request.DataAtual.HasValue ? request.DataAtual.Value.Date : (object)DBNull.Value);
                cmd.ExecuteNonQuery();

                // Run a one-off processing right after date change so users do not need to wait for the minutely trigger.
                _backgroundJobClient.Enqueue<LoanContractGenerationConsumer>(job => job.Execute());
                _backgroundJobClient.Enqueue<OverdueParcelAutoPaymentJob>(job => job.Execute());

                return Ok(new
                {
                    Mensagem = request.DataAtual.HasValue
                        ? "Data operacional atualizada com sucesso."
                        : "Data operacional voltou para o relógio do sistema.",
                    DataAtual = request.DataAtual?.Date
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private static DateTime ObterDataOperacional(NpgsqlConnection conn, NpgsqlTransaction transaction)
        {
            const string sql = "SELECT COALESCE((SELECT data_operacional FROM operational_control WHERE id = 1), CURRENT_DATE)";
            using var cmd = new NpgsqlCommand(sql, conn, transaction);
            var result = cmd.ExecuteScalar();
            return ConverterDataOperacional(result);
        }

        private static DateTime ConverterDataOperacional(object? result)
        {
            return result switch
            {
                DateTime parsed => parsed.Date,
                DateOnly parsed => parsed.ToDateTime(TimeOnly.MinValue),
                _ => DateTime.Today
            };
        }

        private static bool ColunaExiste(NpgsqlConnection conn, NpgsqlTransaction transaction, string tableName, string columnName)
        {
            const string sql = @"
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = @tableName
                      AND column_name = @columnName
                )";

            using var cmd = new NpgsqlCommand(sql, conn, transaction);
            cmd.Parameters.AddWithValue("tableName", tableName);
            cmd.Parameters.AddWithValue("columnName", columnName);
            var result = cmd.ExecuteScalar();
            return result is not null && Convert.ToBoolean(result);
        }

        private static string? ObterTipoColuna(NpgsqlConnection conn, NpgsqlTransaction transaction, string tableName, string columnName)
        {
            const string sql = @"
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = @tableName
                  AND column_name = @columnName";

            using var cmd = new NpgsqlCommand(sql, conn, transaction);
            cmd.Parameters.AddWithValue("tableName", tableName);
            cmd.Parameters.AddWithValue("columnName", columnName);
            return cmd.ExecuteScalar()?.ToString();
        }

        private static object GerarNumeroConta(string? tipoColuna, int clienteId)
        {
            var sequencia = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() % 1_000_000_000;
            var tipo = (tipoColuna ?? string.Empty).ToLowerInvariant();

            if (tipo.Contains("int") || tipo.Contains("numeric") || tipo.Contains("decimal"))
            {
                return (int)(sequencia % int.MaxValue);
            }

            return $"C{clienteId:D4}{sequencia:D9}";
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
    }
}
