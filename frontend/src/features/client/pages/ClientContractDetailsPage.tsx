import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { StatusChip } from "../../../components/ui/status-chip";
import { getContractDetails, listClientContracts, listClientParcels, signContract } from "../../../services/creditService";
import type { ClientContractParcel, ContractDetails, ContractSummary } from "../../../types/credit";
import { useImpersonation } from "../../../app/contexts/ImpersonationContext";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function isOverdue(parcel: ClientContractParcel) {
  const normalized = parcel.statusPagamento.trim().toLowerCase();
  return normalized.includes("atras") || normalized.includes("venc");
}

export function ClientContractDetailsPage() {
  const navigate = useNavigate();
  const { contractId } = useParams();
  const { impersonatedClientId } = useImpersonation();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [parcels, setParcels] = useState<ClientContractParcel[]>([]);
  const [details, setDetails] = useState<ContractDetails | null>(null);
  const [loadingBaseData, setLoadingBaseData] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [signing, setSigning] = useState(false);
  const [message, setMessage] = useState("");

  const selectedContract = useMemo(() => {
    const parsedContractId = Number(contractId);
    return contracts.find((contract) => contract.id === parsedContractId) ?? null;
  }, [contractId, contracts]);

  useEffect(() => {
    const loadData = async () => {
      if (impersonatedClientId === null) {
        return;
      }

      setLoadingBaseData(true);

      try {
        const [contractsData, parcelsData] = await Promise.all([
          listClientContracts(impersonatedClientId),
          listClientParcels(impersonatedClientId),
        ]);

        setContracts(contractsData);
        setParcels(parcelsData);
      } finally {
        setLoadingBaseData(false);
      }
    };

    void loadData().catch((error: Error) => setMessage(error.message));
  }, [impersonatedClientId]);

  useEffect(() => {
    const loadDetails = async () => {
      if (selectedContract === null) {
        setDetails(null);
        return;
      }

      setLoadingDetails(true);

      try {
        const data = await getContractDetails(selectedContract.id);
        if (data.idCliente !== impersonatedClientId) {
          throw new Error("Você só pode visualizar contratos do cliente impersonado.");
        }

        setDetails(data);
      } finally {
        setLoadingDetails(false);
      }
    };

    void loadDetails().catch((error: Error) => setMessage(error.message));
  }, [impersonatedClientId, selectedContract]);

  const handleSignContract = async () => {
    if (impersonatedClientId === null || details === null) {
      return;
    }

    setSigning(true);
    setMessage("");

    try {
      await signContract(details.idContrato, impersonatedClientId);
      const updatedDetails = await getContractDetails(details.idContrato);
      setDetails(updatedDetails);

      const updatedContracts = await listClientContracts(impersonatedClientId);
      setContracts(updatedContracts);

      setMessage("Contrato assinado. Status avançado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível assinar o contrato.");
    } finally {
      setSigning(false);
    }
  };

  if (impersonatedClientId === null) {
    return <Navigate to="/admin" replace />;
  }

  if (loadingBaseData) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Resumo da operação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-9 w-52" />
              <div className="grid gap-3 md:grid-cols-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Parcelas e vencimentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`parcel-loading-${index}`} className="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div>
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="mt-2 h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!contractId || selectedContract === null) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-600">Contrato não encontrado para o cliente atual.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/cliente")}>Voltar para o cliente</Button>
        </CardContent>
      </Card>
    );
  }

  const contractParcels = parcels.filter((parcel) => parcel.idContrato === selectedContract.id);
  const overdueParcels = contractParcels.filter(isOverdue);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Cliente</p>
          <h1 className="text-3xl font-semibold text-slate-900">Detalhes do contrato #{selectedContract.id}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/cliente")}>Voltar para as ofertas</Button>
      </div>

      {message ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div> : null}

      {loadingDetails ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Resumo da operação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-9 w-52" />
              <div className="grid gap-3 md:grid-cols-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Parcelas e vencimentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`parcel-details-loading-${index}`} className="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div>
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="mt-2 h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : details ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Resumo da operação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <StatusChip status={details.status} />
                <p className="mt-4 text-2xl font-semibold text-slate-900">{formatCurrency(details.valorFinanciado)}</p>
                <p className="text-sm text-slate-500">Cliente #{details.idCliente}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Parcelas</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{details.quantidadeParcelas}</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Taxa</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{(details.taxaJurosMensal * 100).toFixed(2)}%</p>
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <p>Amortização: {details.tipoAmortizacao}</p>
                <p className="mt-1">Valor total pago: {typeof details.valorTotalPago === "number" ? formatCurrency(details.valorTotalPago) : "Não informado"}</p>
                {details.contratoGeradoEm ? <p className="mt-1">Contrato gerado em: {formatDate(details.contratoGeradoEm)}</p> : null}
                {details.assinadoEm ? <p className="mt-1">Assinado em: {formatDate(details.assinadoEm)}</p> : null}
              </div>

              {details.contratoGeradoTexto ? (
                <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contrato</p>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">{details.contratoGeradoTexto}</p>
                </div>
              ) : null}

              {details.status.trim().toLowerCase() === "pendente assinatura" ? (
                <Button onClick={handleSignContract} disabled={signing}>
                  {signing ? "Assinando contrato..." : "Assinar contrato"}
                </Button>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-rose-500">Parcelas atrasadas</p>
                  <p className="mt-2 text-3xl font-semibold text-rose-700">{overdueParcels.length}</p>
                </div>
                <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">Parcelas em dia</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-700">{Math.max(contractParcels.length - overdueParcels.length, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parcelas e vencimentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contractParcels.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma parcela encontrada para este contrato.</p>
              ) : (
                contractParcels.map((parcel) => (
                  <div key={parcel.id} className="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm md:grid-cols-[auto_1fr_auto] md:items-center">
                    <div>
                      <p className="font-semibold text-slate-900">Parcela {parcel.numeroParcela}</p>
                      <p className="text-xs text-slate-500">Vencimento {formatDate(parcel.dataVencimento)}</p>
                    </div>
                    <div className="text-slate-600">{formatCurrency(parcel.valorTotalParcela)}</div>
                    <div className="text-right">
                      <StatusChip status={parcel.statusPagamento} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}