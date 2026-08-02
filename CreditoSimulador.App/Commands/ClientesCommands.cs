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
}
