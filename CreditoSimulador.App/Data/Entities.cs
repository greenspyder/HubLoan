using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CreditoSimulador.App.Data;

public class Cliente
{
    [Key]
    [Column("id_cliente")]
    public int IdCliente { get; set; }

    [Required]
    [Column("nome")]
    [MaxLength(200)]
    public string Nome { get; set; } = string.Empty;

    [Column("limite_global")]
    public decimal LimiteGlobal { get; set; }
}

public class Conta
{
    [Key]
    [Column("id_conta")]
    public int IdConta { get; set; }

    [Column("id_cliente")]
    public int IdCliente { get; set; }

    [Column("saldo")]
    public decimal Saldo { get; set; }

    public Cliente? Cliente { get; set; }
}

public class Contrato
{
    [Key]
    [Column("id_contrato")]
    public int IdContrato { get; set; }

    [Column("valor_financiado")]
    public decimal ValorFinanciado { get; set; }

    [Column("taxa_juros_mensal")]
    public decimal TaxaJurosMensal { get; set; }

    [Column("quantidade_parcelas")]
    public int QuantidadeParcelas { get; set; }

    [Column("tipo_amortizacao")]
    [MaxLength(50)]
    public string TipoAmortizacao { get; set; } = string.Empty;

    [Column("tipo_pagamento")]
    [MaxLength(50)]
    public string? TipoPagamento { get; set; }

    [Column("id_cliente")]
    public int IdCliente { get; set; }

    [Column("conta_desembolso_id")]
    public int? ContaDesembolsoId { get; set; }

    [Column("desembolso_autorizado_em")]
    public DateTime? DesembolsoAutorizadoEm { get; set; }

    public ICollection<Parcela> Parcelas { get; set; } = new List<Parcela>();
}

public class Parcela
{
    [Key]
    [Column("id_parcela")]
    public int IdParcela { get; set; }

    [Column("id_contrato")]
    public int IdContrato { get; set; }

    [Column("num_parcela")]
    public int NumParcela { get; set; }

    [Column("data_vencimento")]
    public DateTime DataVencimento { get; set; }

    [Column("valor_amortizacao")]
    public decimal ValorAmortizacao { get; set; }

    [Column("valor_juros")]
    public decimal ValorJuros { get; set; }

    [Column("valor_total_parcela")]
    public decimal ValorTotalParcela { get; set; }

    [Column("status_pagamento")]
    [MaxLength(20)]
    public string? StatusPagamento { get; set; }

    public Contrato? Contrato { get; set; }
}
