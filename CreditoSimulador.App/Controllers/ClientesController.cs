using CreditoSimulador.App.Commands;
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
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? "Host=localhost;Username=postgres;Password=13531;Database=postgres";
        }

        [HttpGet]
        public IActionResult ListarClientes([FromQuery] int? customerId = null)
        {
            return _listarClientesHandler.Handle(new ListarClientesCommand { CustomerId = customerId });
        }

        [HttpGet("ofertas")]
        public IActionResult ListarOfertas()
        {
            return _listarOfertasHandler.Handle(new ListarOfertasCommand());
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
                           to_jsonb(c) ->> 'contrato_gerado_texto' AS contrato_gerado_texto
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

                var bytes = _contractDocxService.BuildContractDocument($"Contrato #{contratoId}", textoContrato);
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
