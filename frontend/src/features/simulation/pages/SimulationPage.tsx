import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { listClients, listClientOffers, contractCredit, simulateCredit } from "../../../services/creditService";
import type { Client, Offer, SimulationResponse } from "../../../types/credit";
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
  const [offers, setOffers] = useState<Offer[]>([]);
  const [step, setStep] = useState<SimulationStep>(1);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [acceptedConditions, setAcceptedConditions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contracting, setContracting] = useState(false);
  const [message, setMessage] = useState("");
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

      const [clientsData, offersData] = await Promise.all([listClients(), listClientOffers()]);
      setClients(clientsData);
      setOffers(offersData);
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
      const response = await contractCredit(currentPayload);
      setMessage(response.Mensagem ?? "Contratação concluída com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível contratar a oferta.");
    } finally {
      setContracting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Simulação</p>
          <h1 className="text-3xl font-semibold text-slate-900">{selectedOffer.nome}</h1>
          {selectedClient ? <p className="mt-1 text-sm text-slate-600">Cliente #{selectedClient.id} • {selectedClient.nome}</p> : null}
        </div>
        <Button variant="outline" onClick={() => navigate("/cliente")}>Voltar para ofertas</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { number: 1, title: "Valores" },
          { number: 2, title: "Garantias e condições" },
          { number: 3, title: "Resumo e contratação" },
        ].map((item) => (
          <div key={item.number} className={`rounded-2xl border px-4 py-3 ${step === item.number ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500"}`}>
            <p className="text-xs uppercase tracking-[0.2em]">Etapa {item.number}</p>
            <p className="mt-1 text-sm font-medium">{item.title}</p>
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

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Limites da oferta</p>
              <p>Valor: {formatCurrency(selectedOffer.valorMinimo)} a {formatCurrency(selectedOffer.valorMaximo)}</p>
              <p>Parcelas: {selectedOffer.parcelasMinimas} a {selectedOffer.parcelasMaximas}</p>
              <p>Carência: {selectedOffer.carenciaMinimaMeses} a {selectedOffer.carenciaMaximaMeses} meses</p>
              <p>Vencimento: dia {selectedOffer.diaVencimentoMinimo} ao dia {selectedOffer.diaVencimentoMaximo}</p>
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
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {selectedOffer.garantias.map((garantia) => <li key={garantia}>{garantia}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-800">Condições da oferta</p>
                <p>Taxa mensal: {(selectedOffer.taxaJurosMensal * 100).toFixed(2)}%</p>
                <p>Amortização: {selectedOffer.tipoAmortizacao}</p>
                <p>Condição de limite máximo por cliente: {formatCurrency(selectedOffer.limiteMaximoCliente)}</p>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
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
              <p>Valor solicitado: {formatCurrency(simulation.valorSolicitado)}</p>
              <p>Parcelas: {simulation.quantidadeParcelas}</p>
              <p>Dia de vencimento: {simulation.diaVencimento}</p>
              <p>Carência: {simulation.carenciaMeses} meses</p>
              <p className="font-medium text-slate-900">Primeira parcela estimada: {formatCurrency(simulation.valorParcela)}</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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
              <p>Status: {simulation.aprovado ? "Aprovado" : "Não aprovado"}</p>
              <p>Valor solicitado: {formatCurrency(simulation.valorSolicitado)}</p>
              <p>Quantidade de parcelas: {simulation.quantidadeParcelas}</p>
              <p>Dia de vencimento: {simulation.diaVencimento}</p>
              <p>Carência: {simulation.carenciaMeses} meses</p>
              <p>Valor da parcela: {formatCurrency(simulation.valorParcela)}</p>
              <p>Oferta: {simulation.oferta.nome}</p>
              <div className="flex flex-wrap gap-3 pt-3">
                <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                <Button onClick={() => void handleContract()} disabled={contracting || !simulation.aprovado}>
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
                <div key={parcela.numero} className="grid grid-cols-3 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <span>Parcela {parcela.numero}</span>
                  <span>{formatDate(parcela.dataVencimento)}</span>
                  <span className="text-right">{formatCurrency(parcela.valorTotalParcela)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}