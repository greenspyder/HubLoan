using Microsoft.EntityFrameworkCore;

namespace CreditoSimulador.App.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Conta> Contas => Set<Conta>();
    public DbSet<Contrato> Contratos => Set<Contrato>();
    public DbSet<Parcela> Parcelas => Set<Parcela>();
    public DbSet<CreditOfferEntity> CreditOffers => Set<CreditOfferEntity>();
    public DbSet<CreditLimitRequestEntity> CreditLimitRequests => Set<CreditLimitRequestEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Cliente>(entity =>
        {
            entity.ToTable("clientes");
            entity.HasKey(e => e.IdCliente);
            entity.Property(e => e.IdCliente).HasColumnName("id_cliente").ValueGeneratedOnAdd();
            entity.Property(e => e.Nome).HasColumnName("nome").HasMaxLength(200).IsRequired();
            entity.Property(e => e.LimiteGlobal).HasColumnName("limite_global").HasPrecision(12, 2).IsRequired();
        });

        modelBuilder.Entity<Conta>(entity =>
        {
            entity.ToTable("contas");
            entity.HasKey(e => e.IdConta);
            entity.Property(e => e.IdConta).HasColumnName("id_conta").ValueGeneratedOnAdd();
            entity.Property(e => e.IdCliente).HasColumnName("id_cliente").IsRequired();
            entity.Property(e => e.Saldo).HasColumnName("saldo").HasPrecision(12, 2).IsRequired();
            entity.HasOne(e => e.Cliente)
                .WithMany()
                .HasForeignKey(e => e.IdCliente)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Contrato>(entity =>
        {
            entity.ToTable("contratos");
            entity.HasKey(e => e.IdContrato);
            entity.Property(e => e.IdContrato).HasColumnName("id_contrato").ValueGeneratedOnAdd();
            entity.Property(e => e.ValorFinanciado).HasColumnName("valor_financiado").HasPrecision(12, 2).IsRequired();
            entity.Property(e => e.TaxaJurosMensal).HasColumnName("taxa_juros_mensal").HasPrecision(12, 6).IsRequired();
            entity.Property(e => e.QuantidadeParcelas).HasColumnName("quantidade_parcelas").IsRequired();
            entity.Property(e => e.TipoAmortizacao).HasColumnName("tipo_amortizacao").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TipoPagamento).HasColumnName("tipo_pagamento").HasMaxLength(50);
            entity.Property(e => e.IdCliente).HasColumnName("id_cliente").IsRequired();
        });

        modelBuilder.Entity<Parcela>(entity =>
        {
            entity.ToTable("parcelas");
            entity.HasKey(e => e.IdParcela);
            entity.Property(e => e.IdParcela).HasColumnName("id_parcela").ValueGeneratedOnAdd();
            entity.Property(e => e.IdContrato).HasColumnName("id_contrato").IsRequired();
            entity.Property(e => e.NumParcela).HasColumnName("num_parcela").IsRequired();
            entity.Property(e => e.DataVencimento).HasColumnName("data_vencimento").HasColumnType("date").IsRequired();
            entity.Property(e => e.ValorAmortizacao).HasColumnName("valor_amortizacao").HasPrecision(12, 2).IsRequired();
            entity.Property(e => e.ValorJuros).HasColumnName("valor_juros").HasPrecision(12, 2).IsRequired();
            entity.Property(e => e.ValorTotalParcela).HasColumnName("valor_total_parcela").HasPrecision(12, 2).IsRequired();
            entity.Property(e => e.StatusPagamento).HasColumnName("status_pagamento").HasMaxLength(20);
            entity.HasOne(e => e.Contrato)
                .WithMany(c => c.Parcelas)
                .HasForeignKey(e => e.IdContrato)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CreditOfferEntity>(entity =>
        {
            entity.ToTable("credit_offers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Nome).HasColumnName("nome").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Descricao).HasColumnName("descricao");
            entity.Property(e => e.ValorMinimo).HasColumnName("valor_minimo").HasPrecision(12, 2).IsRequired();
            entity.Property(e => e.ValorMaximo).HasColumnName("valor_maximo").HasPrecision(12, 2).IsRequired();
            entity.Property(e => e.ParcelasMinimas).HasColumnName("parcelas_minimas").IsRequired();
            entity.Property(e => e.ParcelasMaximas).HasColumnName("parcelas_maximas").IsRequired();
            entity.Property(e => e.CarenciaMinimaMeses).HasColumnName("carencia_minima_meses").IsRequired();
            entity.Property(e => e.CarenciaMaximaMeses).HasColumnName("carencia_maxima_meses").IsRequired();
            entity.Property(e => e.DiaVencimentoMinimo).HasColumnName("dia_vencimento_minimo").IsRequired();
            entity.Property(e => e.DiaVencimentoMaximo).HasColumnName("dia_vencimento_maximo").IsRequired();
            entity.Property(e => e.TaxaJurosMensal).HasColumnName("taxa_juros_mensal").HasPrecision(12, 6).IsRequired();
            entity.Property(e => e.TipoAmortizacao).HasColumnName("tipo_amortizacao").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Garantias).HasColumnName("garantias");
            entity.Property(e => e.Ativa).HasColumnName("ativa").IsRequired();
            entity.Property(e => e.LimiteMaximoCliente).HasColumnName("limite_maximo_cliente").HasPrecision(12, 2).IsRequired();
        });

        modelBuilder.Entity<CreditLimitRequestEntity>(entity =>
        {
            entity.ToTable("credit_limit_requests");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ClienteId).HasColumnName("cliente_id").IsRequired();
            entity.Property(e => e.OfertaId).HasColumnName("oferta_id").HasMaxLength(100).IsRequired();
            entity.Property(e => e.ValorSolicitado).HasColumnName("valor_solicitado").HasPrecision(12, 2).IsRequired();
            entity.Property(e => e.QuantidadeParcelas).HasColumnName("quantidade_parcelas").IsRequired();
            entity.Property(e => e.DiaVencimento).HasColumnName("dia_vencimento").IsRequired();
            entity.Property(e => e.CarenciaMeses).HasColumnName("carencia_meses").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.CriadoEm).HasColumnName("criado_em").IsRequired();
            entity.Property(e => e.Garantias).HasColumnName("garantias");
        });
    }
}
