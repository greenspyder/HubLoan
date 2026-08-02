using CreditoSimulador.App.Commands;
using CreditoSimulador.App.Handlers;
using CreditoSimulador.App.Models;
using Microsoft.AspNetCore.Mvc;

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
        private readonly ListarOfertasHandler _listarOfertasHandler;

        public ClientesController(
            ListarClientesHandler listarClientesHandler,
            ListarContratosHandler listarContratosHandler,
            ListarParcelasHandler listarParcelasHandler,
            ProcessarContratoHandler processarContratoHandler,
            PagarParcelaHandler pagarParcelaHandler,
            SimularCreditoHandler simularCreditoHandler,
            ContratarCreditoHandler contratarCreditoHandler,
            ObterDetalhesContratoHandler obterDetalhesContratoHandler,
            ListarOfertasHandler listarOfertasHandler)
        {
            _listarClientesHandler = listarClientesHandler;
            _listarContratosHandler = listarContratosHandler;
            _listarParcelasHandler = listarParcelasHandler;
            _processarContratoHandler = processarContratoHandler;
            _pagarParcelaHandler = pagarParcelaHandler;
            _simularCreditoHandler = simularCreditoHandler;
            _contratarCreditoHandler = contratarCreditoHandler;
            _obterDetalhesContratoHandler = obterDetalhesContratoHandler;
            _listarOfertasHandler = listarOfertasHandler;
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
    }
}
