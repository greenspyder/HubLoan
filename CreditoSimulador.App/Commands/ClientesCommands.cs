using CreditoSimulador.App.Models;

namespace CreditoSimulador.App.Commands
{
    public class ListarClientesCommand
    {
        public int? CustomerId { get; init; }
    }

    public class ListarContratosCommand
    {
        public int CustomerId { get; init; }
    }

    public class ListarParcelasCommand
    {
        public int CustomerId { get; init; }
    }

    public class ProcessarContratoCommand
    {
    }

    public class PagarParcelaCommand
    {
        public int ContratoId { get; init; }
        public int NumeroParcela { get; init; }
    }

    public class SimularCreditoCommand
    {
        public SimulacaoCreditoRequest Request { get; init; } = new();
    }

    public class ContratarCreditoCommand
    {
        public ContratarCreditoRequest Request { get; init; } = new();
    }

    public class ObterDetalhesContratoCommand
    {
        public int ContratoId { get; init; }
    }

    public class CriarOfertaCommand
    {
        public CreditOffer Oferta { get; init; } = new();
    }

    public class ListarOfertasCommand
    {
    }

    public class ListarSolicitacoesAdminCommand
    {
    }
}
