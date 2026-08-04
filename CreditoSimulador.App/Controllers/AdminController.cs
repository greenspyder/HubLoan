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
        private readonly AutorizarDesembolsoHandler _autorizarDesembolsoHandler;

        public AdminController(
            IConfiguration configuration,
            CriarOfertaHandler criarOfertaHandler,
            ListarOfertasHandler listarOfertasHandler,
            ListarSolicitacoesAdminHandler listarSolicitacoesHandler,
            AutorizarDesembolsoHandler autorizarDesembolsoHandler)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? "Host=localhost;Username=postgres;Password=13531;Database=postgres";
            _criarOfertaHandler = criarOfertaHandler;
            _listarOfertasHandler = listarOfertasHandler;
            _listarSolicitacoesHandler = listarSolicitacoesHandler;
            _autorizarDesembolsoHandler = autorizarDesembolsoHandler;
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
    }
}
