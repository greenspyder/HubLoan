import { useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { listClientContracts, listClientOffers, listClients } from "../../../services/creditService";
import type { Client, ContractSummary, Offer } from "../../../types/credit";
import { useImpersonation } from "../../../app/contexts/ImpersonationContext";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ClientDashboardPage() {
  const navigate = useNavigate();
  const { impersonatedClientId } = useImpersonation();
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [message, setMessage] = useState("");

  const selectedClient = useMemo(() => clients.find((client) => client.id === impersonatedClientId) ?? null, [clients, impersonatedClientId]);

  useEffect(() => {
    const loadData = async () => {
      if (impersonatedClientId === null) {
        return;
      }

      const [clientsData, contractsData, offersData] = await Promise.all([
        listClients(),
        listClientContracts(impersonatedClientId),
        listClientOffers(),
      ]);

      setClients(clientsData);
      setContracts(contractsData);
      setOffers(offersData);
    };

    void loadData().catch((error: Error) => setMessage(error.message));
  }, [impersonatedClientId]);

  if (impersonatedClientId === null) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle>Cliente em impersonação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {message ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div> : null}
          {selectedClient ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Cliente selecionado</p>
              <p className="text-lg font-semibold">{selectedClient.nome}</p>
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
                  <div key={contract.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">Contrato #{contract.id}</p>
                        <p className="text-sm text-slate-600">{formatCurrency(contract.valorFinanciado)} • {contract.quantidadeParcelas} parcelas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">{contract.status}</p>
                        <p className="text-xs text-slate-500">{contract.tipoAmortizacao}</p>
                      </div>
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
              <div key={offer.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{offer.nome}</p>
                    <p className="text-sm text-slate-600">{offer.descricao}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Ativa</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                  <p>Valor: {formatCurrency(offer.valorMinimo)} a {formatCurrency(offer.valorMaximo)}</p>
                  <p>Parcelas: {offer.parcelasMinimas} a {offer.parcelasMaximas}</p>
                  <p>Garantias: {offer.garantias.join(", ")}</p>
                </div>
                <Button
                  className="mt-4"
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
  );
}