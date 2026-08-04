namespace CreditoSimulador.App.Models
{
    public static class ContratoStatus
    {
        public const string GeracaoContratos = "geração de contratos";
        public const string PendenteAssinatura = "pendente assinatura";
        public const string AguardandoDesembolso = "aguardando desembolso";
        public const string Desembolsado = "desembolsado";
        public const string Atrasado = "atrasado";
        public const string Expirado = "expirado";

        public static readonly string[] Todos =
        [
            GeracaoContratos,
            PendenteAssinatura,
            AguardandoDesembolso,
            Desembolsado,
            Atrasado,
            Expirado
        ];
    }
}
