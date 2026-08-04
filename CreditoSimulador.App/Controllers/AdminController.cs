using CreditoSimulador.App.Commands;
using CreditoSimulador.App.Handlers;
using CreditoSimulador.App.Models;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

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

        public AdminController(
            IConfiguration configuration,
            CriarOfertaHandler criarOfertaHandler,
            ListarOfertasHandler listarOfertasHandler,
            ListarSolicitacoesAdminHandler listarSolicitacoesHandler)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? "Host=localhost;Username=postgres;Password=13531;Database=postgres";
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
    }
}
