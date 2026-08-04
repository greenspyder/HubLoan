namespace CreditoSimulador.App.Models
{
    public class CreditOffer
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Nome { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public decimal ValorMinimo { get; set; }
        public decimal ValorMaximo { get; set; }
        public int ParcelasMinimas { get; set; }
        public int ParcelasMaximas { get; set; }
        public int CarenciaMinimaMeses { get; set; }
        public int CarenciaMaximaMeses { get; set; }
        public int DiaVencimentoMinimo { get; set; } = 1;
        public int DiaVencimentoMaximo { get; set; } = 28;
        public decimal TaxaJurosMensal { get; set; }
        public string TipoAmortizacao { get; set; } = "PRICE";
        public List<string> Garantias { get; set; } = new();
        public bool Ativa { get; set; } = true;
        public decimal LimiteMaximoCliente { get; set; }
    }

    public class SimulacaoCreditoRequest
    {
        public int ClienteId { get; set; }
        public decimal ValorSolicitado { get; set; }
        public int QuantidadeParcelas { get; set; }
        public int DiaVencimento { get; set; }
        public int CarenciaMeses { get; set; }
        public string? OfertaId { get; set; }
    }

    public class SimulacaoCreditoResponse
    {
        public bool Aprovado { get; set; }
        public string Mensagem { get; set; } = string.Empty;
        public CreditOffer? Oferta { get; set; }
        public decimal ValorSolicitado { get; set; }
        public int QuantidadeParcelas { get; set; }
        public int DiaVencimento { get; set; }
        public int CarenciaMeses { get; set; }
        public decimal ValorParcela { get; set; }
        public List<SimulacaoParcela> Parcelas { get; set; } = new();
    }

    public class SimulacaoParcela
    {
        public int Numero { get; set; }
        public DateTime DataVencimento { get; set; }
        public decimal ValorAmortizacao { get; set; }
        public decimal ValorJuros { get; set; }
        public decimal ValorTotalParcela { get; set; }
    }

    public class ContratarCreditoRequest
    {
        public int ClienteId { get; set; }
        public decimal ValorSolicitado { get; set; }
        public int QuantidadeParcelas { get; set; }
        public int DiaVencimento { get; set; }
        public int CarenciaMeses { get; set; }
        public string? OfertaId { get; set; }
        public string TipoPagamento { get; set; } = "Débito em conta";
    }

    public class CreditLimitRequest
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public int ClienteId { get; set; }
        public string OfertaId { get; set; } = string.Empty;
        public decimal ValorSolicitado { get; set; }
        public int QuantidadeParcelas { get; set; }
        public int DiaVencimento { get; set; }
        public int CarenciaMeses { get; set; }
        public string Status { get; set; } = "PENDENTE";
        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
        public List<string> Garantias { get; set; } = new();
    }

    public class ContratoDetalhesResponse
    {
        public int IdContrato { get; set; }
        public int IdCliente { get; set; }
        public decimal ValorFinanciado { get; set; }
        public decimal TaxaJurosMensal { get; set; }
        public int QuantidadeParcelas { get; set; }
        public string TipoAmortizacao { get; set; } = string.Empty;
        public string TipoPagamento { get; set; } = "Débito em conta";
        public string Status { get; set; } = "ATIVO";
        public decimal ValorTotalPago { get; set; }
        public string? ContratoGeradoTexto { get; set; }
        public DateTime? ContratoGeradoEm { get; set; }
        public DateTime? AssinadoEm { get; set; }
        public DateTime? DesembolsoAutorizadoEm { get; set; }
        public List<SimulacaoParcela> Parcelas { get; set; } = new();
    }

    public class ContractTemplateRequest
    {
        public string Nome { get; set; } = string.Empty;
        public string Conteudo { get; set; } = string.Empty;
        public bool Ativo { get; set; } = true;
    }

    public class ContractTemplateResponse
    {
        public string IdTemplate { get; set; } = string.Empty;
        public string Nome { get; set; } = string.Empty;
        public string Conteudo { get; set; } = string.Empty;
        public bool Ativo { get; set; }
        public DateTime CriadoEm { get; set; }
        public DateTime? AtualizadoEm { get; set; }
    }
}
