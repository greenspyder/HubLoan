import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { StatusChip } from "../../../components/ui/status-chip";
import { contractCredit, listClientAccounts, listClientOffers, listClients, simulateCredit } from "../../../services/creditService";
import type { AdminAccount, Client, Offer, SimulationResponse } from "../../../types/credit";
import { useImpersonation } from "../../../app/contexts/ImpersonationContext";

type SimulationStep = 1 | 2 | 3;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function SimulationPage() {
  const navigate = useNavigate();
  const { offerId } = useParams();
  const { impersonatedClientId } = useImpersonation();
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [step, setStep] = useState<SimulationStep>(1);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [acceptedConditions, setAcceptedConditions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contracting, setContracting] = useState(false);
  const [message, setMessage] = useState("");
  const [contaDesembolsoId, setContaDesembolsoId] = useState<number>(0);
  const [form, setForm] = useState({
    valorSolicitado: 0,
    quantidadeParcelas: 0,
    diaVencimento: 0,
    carenciaMeses: 0,
  });

  const selectedClient = useMemo(() => clients.find((client) => client.id === impersonatedClientId) ?? null, [clients, impersonatedClientId]);
  const selectedOffer = useMemo(() => offers.find((offer) => offer.id === offerId) ?? null, [offerId, offers]);

  useEffect(() => {
    const loadData = async () => {
      if (impersonatedClientId === null) {
        return;
      }

      const [clientsData, offersData, accountsData] = await Promise.all([
        listClients(),
        listClientOffers(impersonatedClientId),
        listClientAccounts(impersonatedClientId),
      ]);
      setClients(clientsData);
      setOffers(offersData);
      setAccounts(accountsData);

      if (accountsData.length > 0) {
        setContaDesembolsoId(accountsData[0].idConta);
      }
    };

    void loadData().catch((error: Error) => setMessage(error.message));
  }, [impersonatedClientId]);

  useEffect(() => {
    if (!selectedOffer) {
      return;
    }

    setForm({
      valorSolicitado: Math.min(Math.max(selectedOffer.valorMinimo, 5000), selectedOffer.valorMaximo),
      quantidadeParcelas: selectedOffer.parcelasMinimas,
      diaVencimento: selectedOffer.diaVencimentoMinimo,
      carenciaMeses: selectedOffer.carenciaMinimaMeses,
    });
  }, [selectedOffer]);

  if (impersonatedClientId === null) {
    return <Navigate to="/admin" replace />;
  }

  if (!selectedOffer) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-600">Oferta não encontrada.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/cliente")}>Voltar para o cliente</Button>
        </CardContent>
      </Card>
    );
  }

  const currentPayload = {
    clienteId: impersonatedClientId,
    contaDesembolsoId,
    ofertaId: selectedOffer.id,
    valorSolicitado: form.valorSolicitado,
    quantidadeParcelas: form.quantidadeParcelas,
    diaVencimento: form.diaVencimento,
    carenciaMeses: form.carenciaMeses,
  };

  const handleSimulate = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await simulateCredit(currentPayload);
      setSimulation(response);
      setStep(2);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar a simulação.");
    } finally {
      setLoading(false);
    }
  };

  const handleContract = async () => {
    setContracting(true);
    setMessage("");

    try {
      await contractCredit(currentPayload);
      navigate("/cliente?tab=offers&contratado=1", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível contratar a oferta.");
    } finally {
      setContracting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 via-[#180e3a] to-slate-900 p-6 text-white shadow-[0_24px_50px_-28px_rgba(15,23,42,0.9)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-indigo-400/80">Simulação premium</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{selectedOffer.nome}</h1>
            {selectedClient ? <p className="mt-2 text-sm text-slate-300">Cliente #{selectedClient.id} · {selectedClient.nome}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip status={simulation?.aprovado ? "Aprovado" : step === 3 ? "Em análise" : "Rascunho"} className="border-white/20 bg-white/10 text-white" />
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate("/cliente")}>Voltar para ofertas</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { number: 1, title: "Valores" },
          { number: 2, title: "Garantias e condições" },
          { number: 3, title: "Resumo e contratação" },
        ].map((item) => (
          <div key={item.number} className={`rounded-2xl border px-4 py-3 transition-all duration-200 ${step === item.number ? "border-indigo-600 bg-indigo-600 text-white shadow-[0_8px_20px_-6px_rgba(99,102,241,0.7)]" : step > item.number ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">Etapa {item.number}</p>
            <p className="mt-1 text-sm font-semibold">{item.title}</p>
          </div>
        ))}
      </div>

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Escolha os valores da simulação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Valor solicitado</span>
                <Input type="number" value={form.valorSolicitado} min={selectedOffer.valorMinimo} max={selectedOffer.valorMaximo} onChange={(event) => setForm({ ...form, valorSolicitado: Number(event.target.value) })} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Quantidade de parcelas</span>
                <Input type="number" value={form.quantidadeParcelas} min={selectedOffer.parcelasMinimas} max={selectedOffer.parcelasMaximas} onChange={(event) => setForm({ ...form, quantidadeParcelas: Number(event.target.value) })} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Dia de vencimento</span>
                <Input type="number" value={form.diaVencimento} min={selectedOffer.diaVencimentoMinimo} max={selectedOffer.diaVencimentoMaximo} onChange={(event) => setForm({ ...form, diaVencimento: Number(event.target.value) })} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Carência em meses</span>
                <Input type="number" value={form.carenciaMeses} min={selectedOffer.carenciaMinimaMeses} max={selectedOffer.carenciaMaximaMeses} onChange={(event) => setForm({ ...form, carenciaMeses: Number(event.target.value) })} />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Valor</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(selectedOffer.valorMinimo)} a {formatCurrency(selectedOffer.valorMaximo)}</p>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Parcelas</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{selectedOffer.parcelasMinimas} a {selectedOffer.parcelasMaximas}</p>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Carência</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{selectedOffer.carenciaMinimaMeses} a {selectedOffer.carenciaMaximaMeses} meses</p>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Vencimento</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Dia {selectedOffer.diaVencimentoMinimo} ao {selectedOffer.diaVencimentoMaximo}</p>
              </div>
            </div>

            <Button onClick={() => void handleSimulate()} disabled={loading}>
              {loading ? "Calculando..." : "Simular com estes valores"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 && simulation ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Garantias e condições</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-800">Garantias exigidas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedOffer.garantias.map((garantia) => <StatusChip key={garantia} status={garantia} />)}
                </div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-800">Condições da oferta</p>
                <p>Taxa mensal: {(selectedOffer.taxaJurosMensal * 100).toFixed(2)}%</p>
                <p>Amortização: {selectedOffer.tipoAmortizacao}</p>
                <p>Condição de limite máximo por cliente: {formatCurrency(selectedOffer.limiteMaximoCliente)}</p>
              </div>
              <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <input type="checkbox" checked={acceptedConditions} onChange={(event) => setAcceptedConditions(event.target.checked)} />
                Li e aceito as condições e garantias da oferta.
              </label>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <Button onClick={() => setStep(3)} disabled={!acceptedConditions}>Ver resumo da simulação</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prévia da simulação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Valor</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(simulation.valorSolicitado)}</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Parcela estimada</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(simulation.valorParcela)}</p>
                </div>
              </div>
              <p>Parcelas: {simulation.quantidadeParcelas}</p>
              <p>Dia de vencimento: {simulation.diaVencimento}</p>
              <p>Carência: {simulation.carenciaMeses} meses</p>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-800">Mensagem da análise</p>
                <p className="mt-1">{simulation.mensagem}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {step === 3 && simulation ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Resumo final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <StatusChip status={simulation.aprovado ? "Aprovado" : "Reprovado"} />
              <p className="pt-2">Valor solicitado: {formatCurrency(simulation.valorSolicitado)}</p>
              <p>Quantidade de parcelas: {simulation.quantidadeParcelas}</p>
              <p>Dia de vencimento: {simulation.diaVencimento}</p>
              <p>Carência: {simulation.carenciaMeses} meses</p>
              <p>Valor da parcela: {formatCurrency(simulation.valorParcela)}</p>
              <p>Oferta: {simulation.oferta.nome}</p>

              <label className="space-y-2 text-sm block pt-2">
                <span className="font-medium">Conta para desembolso</span>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  value={contaDesembolsoId}
                  onChange={(event) => setContaDesembolsoId(Number(event.target.value))}
                >
                  {accounts.length === 0 ? <option value={0}>Nenhuma conta disponível</option> : null}
                  {accounts.map((account) => (
                    <option key={account.idConta} value={account.idConta}>
                      Conta #{account.idConta} • Saldo {formatCurrency(account.saldo)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-3 pt-3">
                <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                <Button onClick={() => void handleContract()} disabled={contracting || !simulation.aprovado || contaDesembolsoId <= 0}>
                  {contracting ? "Contratando..." : "Contratar agora"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parcelas da simulação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {simulation.parcelas.map((parcela) => (
                <div key={parcela.numero} className="grid grid-cols-3 items-center rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <span className="font-medium text-slate-900">Parcela {parcela.numero}</span>
                  <span>{formatDate(parcela.dataVencimento)}</span>
                  <span className="text-right font-medium">{formatCurrency(parcela.valorTotalParcela)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}