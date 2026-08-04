using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CreditoSimulador.App.Data;

public class CreditOfferEntity
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("cliente_id")]
    public int ClienteId { get; set; }

    [Required]
    [Column("nome")]
    [MaxLength(200)]
    public string Nome { get; set; } = string.Empty;

    [Column("descricao")]
    public string Descricao { get; set; } = string.Empty;

    [Column("valor_minimo")]
    public decimal ValorMinimo { get; set; }

    [Column("valor_maximo")]
    public decimal ValorMaximo { get; set; }

    [Column("parcelas_minimas")]
    public int ParcelasMinimas { get; set; }

    [Column("parcelas_maximas")]
    public int ParcelasMaximas { get; set; }

    [Column("carencia_minima_meses")]
    public int CarenciaMinimaMeses { get; set; }

    [Column("carencia_maxima_meses")]
    public int CarenciaMaximaMeses { get; set; }

    [Column("dia_vencimento_minimo")]
    public int DiaVencimentoMinimo { get; set; } = 1;

    [Column("dia_vencimento_maximo")]
    public int DiaVencimentoMaximo { get; set; } = 28;

    [Column("taxa_juros_mensal")]
    public decimal TaxaJurosMensal { get; set; }

    [Column("tipo_amortizacao")]
    [MaxLength(50)]
    public string TipoAmortizacao { get; set; } = "PRICE";

    [Column("garantias")]
    public string Garantias { get; set; } = string.Empty;

    [Column("ativa")]
    public bool Ativa { get; set; } = true;

    [Column("limite_maximo_cliente")]
    public decimal LimiteMaximoCliente { get; set; }
}

public class CreditLimitRequestEntity
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("cliente_id")]
    public int ClienteId { get; set; }

    [Column("oferta_id")]
    public string OfertaId { get; set; } = string.Empty;

    [Column("valor_solicitado")]
    public decimal ValorSolicitado { get; set; }

    [Column("quantidade_parcelas")]
    public int QuantidadeParcelas { get; set; }

    [Column("dia_vencimento")]
    public int DiaVencimento { get; set; }

    [Column("carencia_meses")]
    public int CarenciaMeses { get; set; }

    [Column("status")]
    [MaxLength(50)]
    public string Status { get; set; } = "PENDENTE";

    [Column("criado_em")]
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    [Column("garantias")]
    public string Garantias { get; set; } = string.Empty;
}
