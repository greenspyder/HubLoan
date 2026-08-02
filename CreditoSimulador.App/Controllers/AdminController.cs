using CreditoSimulador.App.Commands;
using CreditoSimulador.App.Handlers;
using CreditoSimulador.App.Models;
using Microsoft.AspNetCore.Mvc;

namespace CreditoSimulador.App.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly CriarOfertaHandler _criarOfertaHandler;
        private readonly ListarOfertasHandler _listarOfertasHandler;
        private readonly ListarSolicitacoesAdminHandler _listarSolicitacoesHandler;

        public AdminController(
            CriarOfertaHandler criarOfertaHandler,
            ListarOfertasHandler listarOfertasHandler,
            ListarSolicitacoesAdminHandler listarSolicitacoesHandler)
        {
            _criarOfertaHandler = criarOfertaHandler;
            _listarOfertasHandler = listarOfertasHandler;
            _listarSolicitacoesHandler = listarSolicitacoesHandler;
        }

        [HttpGet("ofertas")]
        public IActionResult ListarOfertas()
        {
            return _listarOfertasHandler.Handle(new ListarOfertasCommand());
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
    }
}
