using CreditoSimulador.App.Commands;
using CreditoSimulador.App.Data;
using CreditoSimulador.App.Handlers;
using CreditoSimulador.App.Models;
using CreditoSimulador.App.Services;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace CreditoSimulador.App.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ClientesController : ControllerBase
    {
        private readonly ListarClientesHandler _listarClientesHandler;
        private readonly ListarContratosHandler _listarContratosHandler;
        private readonly ListarParcelasHandler _listarParcelasHandler;
        private readonly ProcessarContratoHandler _processarContratoHandler;
        private readonly PagarParcelaHandler _pagarParcelaHandler;
        private readonly SimularCreditoHandler _simularCreditoHandler;
        private readonly ContratarCreditoHandler _contratarCreditoHandler;
        private readonly ObterDetalhesContratoHandler _obterDetalhesContratoHandler;
        private readonly AtualizarStatusContratoHandler _atualizarStatusContratoHandler;
        private readonly AssinarContratoHandler _assinarContratoHandler;
        private readonly ListarOfertasHandler _listarOfertasHandler;
        private readonly ContractDocxService _contractDocxService;
        private readonly string _connectionString;

        public ClientesController(
            ListarClientesHandler listarClientesHandler,
            ListarContratosHandler listarContratosHandler,
            ListarParcelasHandler listarParcelasHandler,
            ProcessarContratoHandler processarContratoHandler,
            PagarParcelaHandler pagarParcelaHandler,
            SimularCreditoHandler simularCreditoHandler,
            ContratarCreditoHandler contratarCreditoHandler,
            ObterDetalhesContratoHandler obterDetalhesContratoHandler,
            AtualizarStatusContratoHandler atualizarStatusContratoHandler,
            AssinarContratoHandler assinarContratoHandler,
            ListarOfertasHandler listarOfertasHandler,
            ContractDocxService contractDocxService,
            IConfiguration configuration)
        {
            _listarClientesHandler = listarClientesHandler;
            _listarContratosHandler = listarContratosHandler;
            _listarParcelasHandler = listarParcelasHandler;
            _processarContratoHandler = processarContratoHandler;
            _pagarParcelaHandler = pagarParcelaHandler;
            _simularCreditoHandler = simularCreditoHandler;
            _contratarCreditoHandler = contratarCreditoHandler;
            _obterDetalhesContratoHandler = obterDetalhesContratoHandler;
            _atualizarStatusContratoHandler = atualizarStatusContratoHandler;
            _assinarContratoHandler = assinarContratoHandler;
            _listarOfertasHandler = listarOfertasHandler;
            _contractDocxService = contractDocxService;
            _connectionString = ConnectionStringResolver.Resolve(configuration);
        }

        [HttpGet]
        public IActionResult ListarClientes([FromQuery] int? customerId = null)
        {
            return _listarClientesHandler.Handle(new ListarClientesCommand { CustomerId = customerId });
        }

        [HttpGet("ofertas")]
        public IActionResult ListarOfertas([FromQuery] int customerId)
        {
            return _listarOfertasHandler.Handle(new ListarOfertasCommand
            {
                CustomerId = customerId,
                IncluirInativas = false
            });
        }

        [HttpGet("contas")]
        public IActionResult ListarContasCliente([FromQuery] int customerId)
        {
            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                const string sql = @"
                    SELECT ct.id_conta, ct.id_cliente, c.nome, ct.saldo
                    FROM contas ct
                    INNER JOIN clientes c ON c.id_cliente = ct.id_cliente
                    WHERE ct.id_cliente = @customerId
                    ORDER BY ct.id_conta";

                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("customerId", customerId);
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
                return BadRequest($"Erro ao listar contas do cliente: {ex.Message}");
            }
        }

        [HttpGet("contratos")]
        public IActionResult ListarContratos([FromQuery] int customerId)
        {
            return _listarContratosHandler.Handle(new ListarContratosCommand { CustomerId = customerId });
        }

        [HttpGet("parcelas")]
        public IActionResult ListarParcelas([FromQuery] int customerId)
        {
            return _listarParcelasHandler.Handle(new ListarParcelasCommand { CustomerId = customerId });
        }

        [HttpGet("movimentacoes")]
        public IActionResult ListarMovimentacoes([FromQuery] int customerId, [FromQuery] int limit = 100)
        {
            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                if (limit <= 0 || limit > 200)
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
                    WHERE id_cliente = @customerId
                    ORDER BY id_movimentacao DESC
                    LIMIT @limit";

                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("customerId", customerId);
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
                return BadRequest($"Erro ao listar movimentações: {ex.Message}");
            }
        }

        [HttpPost("processar")]
        public IActionResult ProcessarContrato()
        {
            return _processarContratoHandler.Handle(new ProcessarContratoCommand());
        }

        [HttpPost("pagar-parcela")]
        public IActionResult PagarParcela([FromQuery] int contratoId, [FromQuery] int numeroParcela)
        {
            return _pagarParcelaHandler.Handle(new PagarParcelaCommand
            {
                ContratoId = contratoId,
                NumeroParcela = numeroParcela
            });
        }

        [HttpPost("simular")]
        public IActionResult SimularCredito([FromBody] SimulacaoCreditoRequest request)
        {
            return _simularCreditoHandler.Handle(new SimularCreditoCommand { Request = request });
        }

        [HttpPost("contratar")]
        public IActionResult ContratarCredito([FromBody] ContratarCreditoRequest request)
        {
            return _contratarCreditoHandler.Handle(new ContratarCreditoCommand { Request = request });
        }

        [HttpGet("contratos/{contratoId:int}")]
        public IActionResult ObterDetalhesContrato(int contratoId)
        {
            return _obterDetalhesContratoHandler.Handle(new ObterDetalhesContratoCommand { ContratoId = contratoId });
        }

        [HttpPost("contratos/{contratoId:int}/status")]
        public IActionResult AtualizarStatusContrato(int contratoId, [FromForm] string status)
        {
            return _atualizarStatusContratoHandler.Handle(new AtualizarStatusContratoCommand
            {
                ContratoId = contratoId,
                Status = status
            });
        }

        [HttpPost("contratos/{contratoId:int}/assinar")]
        public IActionResult AssinarContrato(int contratoId, [FromQuery] int customerId)
        {
            return _assinarContratoHandler.Handle(new AssinarContratoCommand
            {
                ContratoId = contratoId,
                CustomerId = customerId
            });
        }

        [HttpGet("contratos/{contratoId:int}/documento-docx")]
        public IActionResult BaixarDocumentoContrato(int contratoId, [FromQuery] int customerId)
        {
            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                conn.Open();

                const string sql = @"
                    SELECT c.id_cliente,
                          to_jsonb(c) ->> 'contrato_gerado_texto' AS contrato_gerado_texto,
                          c.contrato_gerado_em
                    FROM contratos c
                    WHERE c.id_contrato = @id";

                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", contratoId);
                using var reader = cmd.ExecuteReader();

                if (!reader.Read())
                {
                    return NotFound("Contrato não encontrado.");
                }

                var idCliente = reader.GetInt32(0);
                if (idCliente != customerId)
                {
                    return BadRequest("Você não tem permissão para baixar este contrato.");
                }

                var textoContrato = reader.IsDBNull(1) ? null : reader.GetString(1);
                if (string.IsNullOrWhiteSpace(textoContrato))
                {
                    return BadRequest("Contrato ainda não foi gerado para assinatura.");
                }

                var dataGeracao = reader.IsDBNull(2) ? (DateTime?)null : reader.GetDateTime(2);

                var bytes = _contractDocxService.BuildContractDocument($"Contrato #{contratoId}", textoContrato, dataGeracao);
                return File(
                    bytes,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    $"contrato-{contratoId}.docx");
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao gerar download do contrato: {ex.Message}");
            }
        }
    }
}
