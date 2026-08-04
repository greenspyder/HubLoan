import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { StatusChip } from "../../../components/ui/status-chip";
import { getContractDetails } from "../../../services/creditService";
import type { ContractDetails } from "../../../types/credit";

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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadDetails = async () => {
      const parsedContractId = Number(contractId);
      if (!Number.isFinite(parsedContractId)) {
        setMessage("Contrato inválido.");
        setLoading(false);
        return;
      }

      try {
        const data = await getContractDetails(parsedContractId);
        setDetails(data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar os detalhes da operação.");
      } finally {
        setLoading(false);
      }
    };

    void loadDetails();
  }, [contractId]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Operação</p>
          <h1 className="text-3xl font-semibold text-slate-900">Detalhes do contrato</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")}>Voltar ao administrativo</Button>
      </div>

      {message ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div> : null}

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Carregando detalhes da operação...</CardContent>
        </Card>
      ) : details ? (
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
              {typeof details.valorTotalPago === "number" ? <p>Valor total pago: {formatCurrency(details.valorTotalPago)}</p> : null}
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
                      <StatusChip status="Em aberto" />
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