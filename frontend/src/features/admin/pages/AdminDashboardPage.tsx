import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { createOffer, listAdminContracts, listAdminRequests } from "../../../services/creditService";
import type { AdminContract, LimitRequest } from "../../../types/credit";
import { useImpersonation } from "../../../app/contexts/ImpersonationContext";

const defaultOfferForm = {
  nome: "Nova oferta",
  descricao: "Oferta para clientes com boa renda",
  valorMinimo: 1000,
  valorMaximo: 30000,
  parcelasMinimas: 6,
  parcelasMaximas: 24,
  carenciaMinimaMeses: 0,
  carenciaMaximaMeses: 3,
  diaVencimentoMinimo: 1,
  diaVencimentoMaximo: 28,
  taxaJurosMensal: 0.015,
  tipoAmortizacao: "PRICE",
  garantias: "RG, CPF, Comprovante de renda",
  ativa: true,
  limiteMaximoCliente: 30000,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { impersonateClient } = useImpersonation();
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [requests, setRequests] = useState<LimitRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(defaultOfferForm);

  const refreshData = async () => {
    const [contractsData, requestsData] = await Promise.all([listAdminContracts(), listAdminRequests()]);
    setContracts(contractsData);
    setRequests(requestsData);
  };

  useEffect(() => {
    void refreshData().catch((error: Error) => setMessage(error.message));
  }, []);

  const handleCreateOffer = async () => {
    setLoading(true);
    setMessage("");

    try {
      await createOffer({
        nome: form.nome,
        descricao: form.descricao,
        valorMinimo: form.valorMinimo,
        valorMaximo: form.valorMaximo,
        parcelasMinimas: form.parcelasMinimas,
        parcelasMaximas: form.parcelasMaximas,
        carenciaMinimaMeses: form.carenciaMinimaMeses,
        carenciaMaximaMeses: form.carenciaMaximaMeses,
        diaVencimentoMinimo: form.diaVencimentoMinimo,
        diaVencimentoMaximo: form.diaVencimentoMaximo,
        taxaJurosMensal: form.taxaJurosMensal,
        tipoAmortizacao: form.tipoAmortizacao,
        garantias: form.garantias.split(",").map((item) => item.trim()).filter(Boolean),
        ativa: form.ativa,
        limiteMaximoCliente: form.limiteMaximoCliente,
      });

      await refreshData();
      setMessage("Oferta criada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar oferta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle>Configuração de oferta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Nome da oferta</span>
              <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">Descrição</span>
              <Textarea value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Valor mínimo</span>
              <Input type="number" value={form.valorMinimo} onChange={(event) => setForm({ ...form, valorMinimo: Number(event.target.value) })} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Valor máximo</span>
              <Input type="number" value={form.valorMaximo} onChange={(event) => setForm({ ...form, valorMaximo: Number(event.target.value) })} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Parcelas mín.</span>
              <Input type="number" value={form.parcelasMinimas} onChange={(event) => setForm({ ...form, parcelasMinimas: Number(event.target.value) })} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Parcelas máx.</span>
              <Input type="number" value={form.parcelasMaximas} onChange={(event) => setForm({ ...form, parcelasMaximas: Number(event.target.value) })} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Carência mín.</span>
              <Input type="number" value={form.carenciaMinimaMeses} onChange={(event) => setForm({ ...form, carenciaMinimaMeses: Number(event.target.value) })} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Carência máx.</span>
              <Input type="number" value={form.carenciaMaximaMeses} onChange={(event) => setForm({ ...form, carenciaMaximaMeses: Number(event.target.value) })} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Dia de vencimento mín.</span>
              <Input type="number" value={form.diaVencimentoMinimo} onChange={(event) => setForm({ ...form, diaVencimentoMinimo: Number(event.target.value) })} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Dia de vencimento máx.</span>
              <Input type="number" value={form.diaVencimentoMaximo} onChange={(event) => setForm({ ...form, diaVencimentoMaximo: Number(event.target.value) })} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Taxa mensal</span>
              <Input type="number" step="0.001" value={form.taxaJurosMensal} onChange={(event) => setForm({ ...form, taxaJurosMensal: Number(event.target.value) })} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Tipo de amortização</span>
              <Input value={form.tipoAmortizacao} onChange={(event) => setForm({ ...form, tipoAmortizacao: event.target.value })} />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">Garantias</span>
              <Textarea value={form.garantias} onChange={(event) => setForm({ ...form, garantias: event.target.value })} />
            </label>
          </div>
          <Button onClick={handleCreateOffer} disabled={loading}>
            Criar oferta
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contratos do administrativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contracts.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum contrato cadastrado ainda.</p>
            ) : (
              contracts.map((contract) => (
                <div key={contract.idContrato} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Contrato #{contract.idContrato}</p>
                      <p className="text-sm text-slate-600">Cliente #{contract.idCliente} • {contract.quantidadeParcelas} parcelas</p>
                      <p className="text-sm text-slate-600">Valor: {formatCurrency(contract.valorFinanciado)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">{contract.status}</p>
                      <p className="text-xs text-slate-500">{contract.tipoAmortizacao}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        impersonateClient(contract.idCliente);
                        navigate("/cliente");
                      }}
                    >
                      Impersonar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/admin/contratos/${contract.idContrato}`)}>
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solicitações recebidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma solicitação encontrada.</p>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">Cliente #{request.clienteId}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{request.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Oferta: {request.ofertaId}</p>
                  <p className="text-sm text-slate-600">Valor: {formatCurrency(request.valorSolicitado)}</p>
                  <p className="text-sm text-slate-600">Garantias: {request.garantias.join(", ")}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}