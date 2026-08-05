import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, detectAlertVariant } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ContractWorkflow } from "../../../components/ui/contract-workflow";
import { Skeleton } from "../../../components/ui/skeleton";
import { StatusChip } from "../../../components/ui/status-chip";
import { authorizeDisbursement, getContractDetails, listClientParcels } from "../../../services/creditService";
import type { ClientContractParcel, ContractDetails } from "../../../types/credit";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function AdminContractDetailsPage() {
  const navigate = useNavigate();
  const { contractId } = useParams();
  const [details, setDetails] = useState<ContractDetails | null>(null);
  const [contractParcels, setContractParcels] = useState<ClientContractParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [message, setMessage] = useState("");

  const statusByParcela = useMemo(() => {
    return contractParcels.reduce<Record<number, string>>((acc, parcel) => {
      acc[parcel.numeroParcela] = parcel.statusPagamento;
      return acc;
    }, {});
  }, [contractParcels]);

  const loadDetails = async () => {
    const parsedContractId = Number(contractId);
    if (!Number.isFinite(parsedContractId)) {
      setMessage("Contrato inválido.");
      setLoading(false);
      return;
    }

    try {
      const data = await getContractDetails(parsedContractId);
      const parcelData = await listClientParcels(data.idCliente);
      setDetails(data);
      setContractParcels(parcelData.filter((parcel) => parcel.idContrato === data.idContrato));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar os detalhes da operação.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetails();
  }, [contractId]);

  const handleAuthorizeDisbursement = async () => {
    if (!details) {
      return;
    }

    setAuthorizing(true);
    setMessage("");

    try {
      await authorizeDisbursement(details.idContrato);
      await loadDetails();
      setMessage("Desembolso autorizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível autorizar o desembolso.");
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Operação</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Detalhes do contrato</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")}>Voltar ao administrativo</Button>
      </div>

      {message ? <Alert variant={detectAlertVariant(message)}>{message}</Alert> : null}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Resumo da operação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-9 w-52" />
              <Skeleton className="h-4 w-60" />
              <div className="grid gap-3 md:grid-cols-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Parcelas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`parcel-skeleton-${index}`} className="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[auto_1fr_auto] md:items-center">
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
        <div className="space-y-6">
          <ContractWorkflow status={details.status} />

          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Resumo da operação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <StatusChip status={details.status} />
                <p className="mt-4 text-2xl font-semibold text-slate-900">{formatCurrency(details.valorFinanciado)}</p>
                <p className="text-sm text-slate-500">Contrato #{details.idContrato} • Cliente #{details.idCliente}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Taxa mensal</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{(details.taxaJurosMensal * 100).toFixed(2)}%</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Parcelas</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{details.quantidadeParcelas}</p>
                </div>
              </div>
              <p>Amortização: {details.tipoAmortizacao}</p>
              <p>Conta de desembolso: {details.contaDesembolsoId ? `#${details.contaDesembolsoId}` : "Não definida"}</p>
              {typeof details.valorTotalPago === "number" && details.valorTotalPago > 0 ? <p>Valor total pago: {formatCurrency(details.valorTotalPago)}</p> : null}
              {details.desembolsoAutorizadoEm ? <p>Desembolso autorizado em: {formatDate(details.desembolsoAutorizadoEm)}</p> : null}
              {details.status.trim().toLowerCase() === "aguardando desembolso" ? (
                <Button onClick={handleAuthorizeDisbursement} disabled={authorizing}>
                  {authorizing ? "Autorizando..." : "Autorizar desembolso"}
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parcelas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {details.parcelas.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma parcela encontrada.</p>
              ) : (
                details.parcelas.map((parcela) => (
                  <div key={parcela.numero} className="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm md:grid-cols-[auto_1fr_auto] md:items-center">
                    <div>
                      <p className="font-semibold text-slate-900">Parcela {parcela.numero}</p>
                      <p className="text-xs text-slate-500">Vencimento {formatDate(parcela.dataVencimento)}</p>
                    </div>
                    <div className="text-slate-600">{formatCurrency(parcela.valorTotalParcela)}</div>
                    <div className="text-right">
                      <StatusChip status={statusByParcela[parcela.numero] ?? "Pendente"} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}