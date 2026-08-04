import { useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { StatusChip } from "../../../components/ui/status-chip";
import { listClientContracts, listClientOffers, listClientParcels, listClients } from "../../../services/creditService";
import type { Client, ClientContractParcel, ContractSummary, Offer } from "../../../types/credit";
import { useImpersonation } from "../../../app/contexts/ImpersonationContext";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ClientDashboardPage() {
  const navigate = useNavigate();
  const { impersonatedClientId } = useImpersonation();
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [parcels, setParcels] = useState<ClientContractParcel[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [message, setMessage] = useState("");

  const selectedClient = useMemo(() => clients.find((client) => client.id === impersonatedClientId) ?? null, [clients, impersonatedClientId]);

  useEffect(() => {
    const loadData = async () => {
      if (impersonatedClientId === null) {
        return;
      }

      const [clientsData, contractsData, parcelsData, offersData] = await Promise.all([
        listClients(),
        listClientContracts(impersonatedClientId),
        listClientParcels(impersonatedClientId),
        listClientOffers(),
      ]);

      setClients(clientsData);
      setContracts(contractsData);
      setParcels(parcelsData);
      setOffers(offersData);
    };

    void loadData().catch((error: Error) => setMessage(error.message));
  }, [impersonatedClientId]);

  if (impersonatedClientId === null) {
    return <Navigate to="/admin" replace />;
  }

  const overdueParcels = parcels.filter((parcel) => {
    const normalized = parcel.statusPagamento.trim().toLowerCase();
    return normalized.includes("atras") || normalized.includes("venc");
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Contratos ativos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{contracts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Parcelas atrasadas</p>
            <p className="mt-2 text-3xl font-semibold text-rose-600">{overdueParcels.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Ofertas disponíveis</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{offers.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle>Cliente em impersonação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {message ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div> : null}
          {selectedClient ? (
            <div className="rounded-[20px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <p className="text-sm font-semibold text-slate-800">Cliente selecionado</p>
              <p className="text-2xl font-semibold text-slate-900">{selectedClient.nome}</p>
              <p className="mt-1 text-sm text-slate-600">Limite global: {formatCurrency(selectedClient.limite)}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Contratos do cliente</p>
                <p className="text-sm text-slate-600">Resumo das operações do cliente impersonado.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{contracts.length} contrato(s)</span>
            </div>

            {contracts.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum contrato encontrado para este cliente.</p>
            ) : (
              <div className="space-y-3">
                {contracts.map((contract) => (
                  <div key={contract.id} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Contrato #{contract.id}</p>
                        <p className="text-sm text-slate-600">{formatCurrency(contract.valorFinanciado)} • {contract.quantidadeParcelas} parcelas</p>
                      </div>
                      <div className="text-right">
                        <StatusChip status={contract.status} />
                        <p className="mt-2 text-xs text-slate-500">{contract.tipoAmortizacao}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/cliente/contratos/${contract.id}`)}>
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ofertas disponíveis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {offers.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma oferta disponível.</p>
          ) : (
            offers.map((offer) => (
              <div key={offer.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{offer.nome}</p>
                    <p className="text-sm text-slate-600">{offer.descricao}</p>
                  </div>
                  <StatusChip status={offer.ativa ? "Ativa" : "Inativa"} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                  <p>Valor: {formatCurrency(offer.valorMinimo)} a {formatCurrency(offer.valorMaximo)}</p>
                  <p>Parcelas: {offer.parcelasMinimas} a {offer.parcelasMaximas}</p>
                  <p>Garantias: {offer.garantias.join(", ")}</p>
                </div>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => navigate(`/cliente/ofertas/${offer.id}/simulacao`) }
                >
                  Simular esta oferta
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}