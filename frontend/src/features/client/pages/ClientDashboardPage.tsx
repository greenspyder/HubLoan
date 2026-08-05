import { useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { StatusChip } from "../../../components/ui/status-chip";
import { listClientContracts, listClientMovements, listClientOffers, listClientParcels, listClients } from "../../../services/creditService";
import type { AccountMovement, Client, ClientContractParcel, ContractSummary, Offer } from "../../../types/credit";
import { useImpersonation } from "../../../app/contexts/ImpersonationContext";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ClientDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { impersonatedClientId } = useImpersonation();
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [parcels, setParcels] = useState<ClientContractParcel[]>([]);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "offers" | "contracts" | "movements">("overview");

  const selectedClient = useMemo(() => clients.find((client) => client.id === impersonatedClientId) ?? null, [clients, impersonatedClientId]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "overview" || tab === "offers" || tab === "contracts" || tab === "movements") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("contratado") === "1") {
      setMessage("Oferta contratada com sucesso. A oferta foi consumida e removida da lista disponível.");
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("contratado");
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const loadData = async () => {
      if (impersonatedClientId === null) {
        return;
      }

      setLoadingData(true);

      try {
        const [clientsData, contractsData, parcelsData, offersData, movementsData] = await Promise.all([
          listClients(),
          listClientContracts(impersonatedClientId),
          listClientParcels(impersonatedClientId),
          listClientOffers(impersonatedClientId),
          listClientMovements(impersonatedClientId, 40),
        ]);

        setClients(clientsData);
        setContracts(contractsData);
        setParcels(parcelsData);
        setOffers(offersData);
        setMovements(movementsData);
      } finally {
        setLoadingData(false);
      }
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

  const tabButtonClass = (tab: "overview" | "offers" | "contracts" | "movements") =>
    `rounded-full px-4 py-2 text-sm font-medium transition-all duration-150 ${
      activeTab === tab
        ? "bg-indigo-600 text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.6)]"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
    }`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Contratos ativos</p>
            {loadingData ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{contracts.length}</p>}
            <div className="mt-2 h-1 w-8 rounded-full bg-indigo-400" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Parcelas atrasadas</p>
            {loadingData ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-3 text-3xl font-bold tracking-tight text-rose-600">{overdueParcels.length}</p>}
            <div className="mt-2 h-1 w-8 rounded-full bg-rose-400" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Ofertas disponíveis</p>
            {loadingData ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{offers.length}</p>}
            <div className="mt-2 h-1 w-8 rounded-full bg-emerald-400" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Área do cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {message ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div> : null}
          {loadingData ? (
            <div className="rounded-[20px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-3 h-8 w-56" />
              <Skeleton className="mt-2 h-4 w-44" />
            </div>
          ) : selectedClient ? (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-500">Cliente selecionado</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{selectedClient.nome}</p>
              <div className="mt-3 grid gap-1.5 text-sm text-slate-600">
                <p>Limite global: <span className="font-semibold text-slate-800">{formatCurrency(selectedClient.limite)}</span></p>
                <p>Contas ativas: <span className="font-semibold text-slate-800">{selectedClient.totalContas ?? 0}</span></p>
                <p>Saldo total em contas: <span className="font-semibold text-emerald-700">{formatCurrency(selectedClient.saldoConta)}</span></p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button type="button" className={tabButtonClass("overview")} onClick={() => setActiveTab("overview")}>Visão geral</button>
            <button type="button" className={tabButtonClass("offers")} onClick={() => setActiveTab("offers")}>Ofertas</button>
            <button type="button" className={tabButtonClass("contracts")} onClick={() => setActiveTab("contracts")}>Contratos</button>
            <button type="button" className={tabButtonClass("movements")} onClick={() => setActiveTab("movements")}>Extrato</button>
          </div>

          {activeTab === "overview" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">Ofertas</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{offers.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Contratos</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{contracts.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Movimentações</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{movements.length}</p>
              </div>
            </div>
          ) : null}

          {activeTab === "contracts" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Contratos do cliente</p>
                <p className="text-sm text-slate-600">Resumo das operações do cliente impersonado.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{contracts.length} contrato(s)</span>
            </div>

            {loadingData ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={`contract-skeleton-${index}`} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-2 h-4 w-52" />
                    <div className="mt-4 flex gap-2">
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contracts.length === 0 ? (
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
          ) : null}

          {activeTab === "offers" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Ofertas disponíveis</p>
                  <p className="text-sm text-slate-600">Escolha uma oferta para simular e contratar.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{offers.length} oferta(s)</span>
              </div>

              {loadingData ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={`offer-skeleton-${index}`} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="mt-2 h-4 w-60" />
                      <Skeleton className="mt-4 h-4 w-52" />
                      <Skeleton className="mt-2 h-4 w-48" />
                      <Skeleton className="mt-4 h-9 w-40" />
                    </div>
                  ))}
                </div>
              ) : offers.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma oferta disponível.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {offers.map((offer) => (
                    <div key={offer.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_20px_-4px_rgba(15,23,42,0.07)] transition-all duration-200 hover:border-indigo-200 hover:shadow-[0_4px_24px_-4px_rgba(99,102,241,0.14)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{offer.nome}</p>
                          <p className="mt-0.5 text-sm text-slate-500">{offer.descricao}</p>
                        </div>
                        <StatusChip status={offer.ativa ? "Ativa" : "Inativa"} />
                      </div>
                      <div className="mt-4 grid gap-1.5 text-sm text-slate-600">
                        <p>Valor: <span className="font-medium text-slate-800">{formatCurrency(offer.valorMinimo)} a {formatCurrency(offer.valorMaximo)}</span></p>
                        <p>Parcelas: <span className="font-medium text-slate-800">{offer.parcelasMinimas} a {offer.parcelasMaximas}</span></p>
                        <p>Garantias: <span className="font-medium text-slate-700">{offer.garantias.join(", ")}</span></p>
                      </div>
                      <Button
                        className="mt-4 w-full"
                        onClick={() => navigate(`/cliente/ofertas/${offer.id}/simulacao`)}
                      >
                        Simular esta oferta
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "movements" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Extrato recente da conta</p>
                  <p className="text-sm text-slate-600">Acompanhe as movimentações mais recentes.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{movements.length} registro(s)</span>
              </div>
              {loadingData ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : movements.length === 0 ? (
                <p className="text-sm text-slate-500">Ainda não há movimentações para este cliente.</p>
              ) : (
                    <div className="space-y-2">
                  {movements.map((movement) => (
                    <div key={movement.idMovimentacao} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{movement.tipo}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(movement.saldoAnterior)} → <span className="font-medium text-slate-700">{formatCurrency(movement.saldoAtual)}</span></p>
                        <p className="text-xs text-slate-400">{new Date(movement.dataOperacional).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <p className={`shrink-0 text-sm font-bold ${movement.valor >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {movement.valor >= 0 ? "+" : ""}{formatCurrency(movement.valor)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}