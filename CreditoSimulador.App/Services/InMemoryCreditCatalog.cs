using CreditoSimulador.App.Data;
using CreditoSimulador.App.Models;
using Microsoft.EntityFrameworkCore;
using CreditOfferEntityData = CreditoSimulador.App.Data.CreditOfferEntity;
using CreditLimitRequestEntityData = CreditoSimulador.App.Data.CreditLimitRequestEntity;

namespace CreditoSimulador.App.Services
{
    public class InMemoryCreditCatalog
    {
        private readonly AppDbContext _dbContext;

        public InMemoryCreditCatalog(AppDbContext dbContext)
        {
            _dbContext = dbContext;
            EnsureSeedData();
        }

        public IReadOnlyList<CreditOffer> Offers => _dbContext.CreditOffers
            .AsNoTracking()
            .OrderBy(o => o.Nome)
            .Select(MapToModel)
            .ToList();

        public IReadOnlyList<CreditLimitRequest> Requests => _dbContext.CreditLimitRequests
            .AsNoTracking()
            .OrderByDescending(r => r.CriadoEm)
            .Select(MapToRequestModel)
            .ToList();

        public CreditOffer? GetById(string? id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return _dbContext.CreditOffers
                    .AsNoTracking()
                    .Where(o => o.Ativa)
                    .OrderBy(o => o.Nome)
                    .Select(MapToModel)
                    .FirstOrDefault();
            }

            return _dbContext.CreditOffers
                .AsNoTracking()
                .Where(o => o.Id == id && o.Ativa)
                .Select(MapToModel)
                .FirstOrDefault();
        }

        public CreditOffer AddOrUpdate(CreditOffer offer)
        {
            var entity = _dbContext.CreditOffers.FirstOrDefault(o => o.Id == offer.Id);
            if (entity is null)
            {
                entity = new CreditOfferEntityData
                {
                    Id = string.IsNullOrWhiteSpace(offer.Id) ? Guid.NewGuid().ToString() : offer.Id
                };
                _dbContext.CreditOffers.Add(entity);
            }

            entity.Nome = offer.Nome;
            entity.Descricao = offer.Descricao;
            entity.ValorMinimo = offer.ValorMinimo;
            entity.ValorMaximo = offer.ValorMaximo;
            entity.ParcelasMinimas = offer.ParcelasMinimas;
            entity.ParcelasMaximas = offer.ParcelasMaximas;
            entity.CarenciaMinimaMeses = offer.CarenciaMinimaMeses;
            entity.CarenciaMaximaMeses = offer.CarenciaMaximaMeses;
            entity.DiaVencimentoMinimo = offer.DiaVencimentoMinimo;
            entity.DiaVencimentoMaximo = offer.DiaVencimentoMaximo;
            entity.TaxaJurosMensal = offer.TaxaJurosMensal;
            entity.TipoAmortizacao = offer.TipoAmortizacao;
            entity.Garantias = string.Join(";", offer.Garantias);
            entity.Ativa = offer.Ativa;
            entity.LimiteMaximoCliente = offer.LimiteMaximoCliente;

            _dbContext.SaveChanges();
            return MapToModel(entity);
        }

        public void AddRequest(CreditLimitRequest request)
        {
            var entity = new CreditLimitRequestEntityData
            {
                Id = string.IsNullOrWhiteSpace(request.Id) ? Guid.NewGuid().ToString() : request.Id,
                ClienteId = request.ClienteId,
                OfertaId = request.OfertaId,
                ValorSolicitado = request.ValorSolicitado,
                QuantidadeParcelas = request.QuantidadeParcelas,
                DiaVencimento = request.DiaVencimento,
                CarenciaMeses = request.CarenciaMeses,
                Status = request.Status,
                CriadoEm = request.CriadoEm,
                Garantias = string.Join(";", request.Garantias)
            };

            _dbContext.CreditLimitRequests.Add(entity);
            _dbContext.SaveChanges();
        }

        private void EnsureSeedData()
        {
            if (_dbContext.CreditOffers.Any())
            {
                return;
            }
        }

        private static CreditOffer MapToModel(CreditOfferEntityData entity) => new()
        {
            Id = entity.Id,
            Nome = entity.Nome,
            Descricao = entity.Descricao,
            ValorMinimo = entity.ValorMinimo,
            ValorMaximo = entity.ValorMaximo,
            ParcelasMinimas = entity.ParcelasMinimas,
            ParcelasMaximas = entity.ParcelasMaximas,
            CarenciaMinimaMeses = entity.CarenciaMinimaMeses,
            CarenciaMaximaMeses = entity.CarenciaMaximaMeses,
            DiaVencimentoMinimo = entity.DiaVencimentoMinimo,
            DiaVencimentoMaximo = entity.DiaVencimentoMaximo,
            TaxaJurosMensal = entity.TaxaJurosMensal,
            TipoAmortizacao = entity.TipoAmortizacao,
            Garantias = string.IsNullOrWhiteSpace(entity.Garantias)
                ? new List<string>()
                : entity.Garantias.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
            Ativa = entity.Ativa,
            LimiteMaximoCliente = entity.LimiteMaximoCliente
        };

        private static CreditLimitRequest MapToRequestModel(CreditLimitRequestEntityData entity) => new()
        {
            Id = entity.Id,
            ClienteId = entity.ClienteId,
            OfertaId = entity.OfertaId,
            ValorSolicitado = entity.ValorSolicitado,
            QuantidadeParcelas = entity.QuantidadeParcelas,
            DiaVencimento = entity.DiaVencimento,
            CarenciaMeses = entity.CarenciaMeses,
            Status = entity.Status,
            CriadoEm = entity.CriadoEm,
            Garantias = string.IsNullOrWhiteSpace(entity.Garantias)
                ? new List<string>()
                : entity.Garantias.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
        };
    }
}
