import { useEffect, useMemo, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

type Offer = {
  id: string;
  nome: string;
  descricao: string;
  valorMinimo: number;
  valorMaximo: number;
  parcelasMinimas: number;
  parcelasMaximas: number;
  carenciaMinimaMeses: number;
  carenciaMaximaMeses: number;
  diaVencimentoMinimo: number;
  diaVencimentoMaximo: number;
  taxaJurosMensal: number;
  tipoAmortizacao: string;
  garantias: string[];
  ativa: boolean;
};

type SimulationResponse = {
  aprovado: boolean;
  mensagem: string;
  valorSolicitado: number;
  quantidadeParcelas: number;
  diaVencimento: number;
  carenciaMeses: number;
  valorParcela: number;
  parcelas: Array<{ numero: number; dataVencimento: string; valorTotalParcela: number }>;
  oferta?: Offer;
};

type ContractDetails = {
  idContrato: number;
  idCliente: number;
  valorFinanciado: number;
  quantidadeParcelas: number;
  tipoAmortizacao: string;
  status: string;
  parcelas: Array<{ numero: number; dataVencimento: string; valorTotalParcela: number }>;
};

type LimitRequest = {
  id: string;
  clienteId: number;
  ofertaId: string;
  valorSolicitado: number;
  quantidadeParcelas: number;
  diaVencimento: number;
  carenciaMeses: number;
  status: string;
  garantias: string[];
  criadoEm: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function App() {
  const [activeView, setActiveView] = useState<"client" | "admin">("client");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [requests, setRequests] = useState<LimitRequest[]>([]);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [contractDetails, setContractDetails] = useState<ContractDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [customerForm, setCustomerForm] = useState({
    clienteId: 1,
    valorSolicitado: 5000,
    quantidadeParcelas: 12,
    diaVencimento: 10,
    carenciaMeses: 1,
    ofertaId: "",
  });
  const [adminForm, setAdminForm] = useState({
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
  });

  const selectedOffer = useMemo(() => {
    if (!offers.length) {
      return null;
    }

    return offers.find((offer) => offer.id === customerForm.ofertaId) ?? offers[0] ?? null;
  }, [customerForm.ofertaId, offers]);

  const loadOffers = async () => {
    try {
      const [clientOffersResponse, adminOffersResponse] = await Promise.all([
        fetch(`${API_BASE}/clientes/ofertas`),
        fetch(`${API_BASE}/admin/ofertas`),
      ]);

      const clientOffers = clientOffersResponse.ok ? ((await clientOffersResponse.json()) as Offer[]) : [];
      const adminOffers = adminOffersResponse.ok ? ((await adminOffersResponse.json()) as Offer[]) : [];
      const mergedOffers = clientOffers.length > 0 ? clientOffers : adminOffers;

      setOffers(mergedOffers);
      if (mergedOffers.length > 0 && !customerForm.ofertaId) {
        setCustomerForm((prev) => ({ ...prev, ofertaId: mergedOffers[0].id }));
      }
    } catch {
      setMessage("Não foi possível carregar as ofertas no momento.");
    }
  };

  const loadRequests = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/solicitacoes`);
      if (response.ok) {
        const data = (await response.json()) as LimitRequest[];
        setRequests(data);
      }
    } catch {
      setMessage("Não foi possível carregar as solicitações administrativas.");
    }
  };

  useEffect(() => {
    void loadOffers();
    void loadRequests();
  }, []);

  const handleCustomerChange = (field: string, value: string | number) => {
    setCustomerForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSimulate = async () => {
    setLoading(true);
    setMessage("");
    setSimulation(null);

    try {
      const payload = {
        clienteId: customerForm.clienteId,
        valorSolicitado: customerForm.valorSolicitado,
        quantidadeParcelas: customerForm.quantidadeParcelas,
        diaVencimento: customerForm.diaVencimento,
        carenciaMeses: customerForm.carenciaMeses,
        ofertaId: customerForm.ofertaId || selectedOffer?.id || "",
      };

      const response = await fetch(`${API_BASE}/clientes/simular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as SimulationResponse & { message?: string; error?: string };
      setSimulation(data);
      setMessage(data.mensagem || data.message || (response.ok ? "Simulação concluída." : "Falha na simulação."));
    } catch {
      setMessage("Erro ao enviar a simulação para a API.");
    } finally {
      setLoading(false);
    }
  };

  const handleContract = async () => {
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        clienteId: customerForm.clienteId,
        valorSolicitado: customerForm.valorSolicitado,
        quantidadeParcelas: customerForm.quantidadeParcelas,
        diaVencimento: customerForm.diaVencimento,
        carenciaMeses: customerForm.carenciaMeses,
        ofertaId: customerForm.ofertaId || selectedOffer?.id || "",
      };

      const response = await fetch(`${API_BASE}/clientes/contratar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { mensagem?: string; message?: string; contratoId?: number; error?: string };
      if (response.ok && data.contratoId) {
        const detailsResponse = await fetch(`${API_BASE}/clientes/contratos/${data.contratoId}`);
        const details = (await detailsResponse.json()) as ContractDetails;
        setContractDetails(details);
        setMessage(data.mensagem || `Contrato criado com sucesso: #${data.contratoId}`);
        await loadRequests();
      } else {
        setMessage(data.message || data.error || data.mensagem || "Não foi possível contratar.");
      }
    } catch {
      setMessage("Erro ao contratar com a API.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/admin/ofertas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: adminForm.nome,
          descricao: adminForm.descricao,
          valorMinimo: adminForm.valorMinimo,
          valorMaximo: adminForm.valorMaximo,
          parcelasMinimas: adminForm.parcelasMinimas,
          parcelasMaximas: adminForm.parcelasMaximas,
          carenciaMinimaMeses: adminForm.carenciaMinimaMeses,
          carenciaMaximaMeses: adminForm.carenciaMaximaMeses,
          diaVencimentoMinimo: adminForm.diaVencimentoMinimo,
          diaVencimentoMaximo: adminForm.diaVencimentoMaximo,
          taxaJurosMensal: adminForm.taxaJurosMensal,
          tipoAmortizacao: adminForm.tipoAmortizacao,
          garantias: adminForm.garantias.split(",").map((item) => item.trim()).filter(Boolean),
          ativa: adminForm.ativa,
          limiteMaximoCliente: adminForm.limiteMaximoCliente,
        }),
      });

      if (response.ok) {
        await loadOffers();
        await loadRequests();
        setMessage("Oferta criada com sucesso.");
      } else {
        setMessage("Falha ao criar oferta.");
      }
    } catch {
      setMessage("Erro ao criar a oferta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-2xl bg-slate-900 p-8 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">HubLoan</p>
          <h1 className="mt-3 text-4xl font-semibold">Portal de crédito e administração</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Simule e contrate crédito com regras aprovadas pela equipe administrativa e acompanhe o status do contrato.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant={activeView === "client" ? "default" : "outline"} className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setActiveView("client")}>
              Plataforma do cliente
            </Button>
            <Button variant={activeView === "admin" ? "default" : "outline"} className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setActiveView("admin")}>
              Plataforma administrativa
            </Button>
          </div>
        </header>

        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {activeView === "client" ? (
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle>Simulação de crédito</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {selectedOffer ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Oferta selecionada</p>
                        <p className="text-lg font-semibold">{selectedOffer.nome}</p>
                        <p className="mt-1 text-sm text-slate-600">{selectedOffer.descricao}</p>
                      </div>
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white">
                        {selectedOffer.tipoAmortizacao}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-slate-500">Faixa de valor</p>
                        <p className="font-semibold">{formatCurrency(selectedOffer.valorMinimo)} a {formatCurrency(selectedOffer.valorMaximo)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Parcelas</p>
                        <p className="font-semibold">{selectedOffer.parcelasMinimas} a {selectedOffer.parcelasMaximas}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Vencimento</p>
                        <p className="font-semibold">Dia {selectedOffer.diaVencimentoMinimo} a {selectedOffer.diaVencimentoMaximo}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Garantias</p>
                        <p className="font-semibold">{selectedOffer.garantias.join(", ")}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Cliente</span>
                    <Input type="number" value={customerForm.clienteId} onChange={(event) => handleCustomerChange("clienteId", Number(event.target.value))} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Oferta</span>
                    <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm" value={customerForm.ofertaId || selectedOffer?.id || ""} onChange={(event) => handleCustomerChange("ofertaId", event.target.value)}>
                      {offers.map((offer) => (
                        <option key={offer.id} value={offer.id}>
                          {offer.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Valor desejado</span>
                    <Input type="number" value={customerForm.valorSolicitado} onChange={(event) => handleCustomerChange("valorSolicitado", Number(event.target.value))} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Parcelas</span>
                    <Input type="number" value={customerForm.quantidadeParcelas} onChange={(event) => handleCustomerChange("quantidadeParcelas", Number(event.target.value))} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Dia de vencimento</span>
                    <Input type="number" value={customerForm.diaVencimento} onChange={(event) => handleCustomerChange("diaVencimento", Number(event.target.value))} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Carência (meses)</span>
                    <Input type="number" value={customerForm.carenciaMeses} onChange={(event) => handleCustomerChange("carenciaMeses", Number(event.target.value))} />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSimulate} disabled={loading}>
                    {loading ? "Processando..." : "Simular crédito"}
                  </Button>
                  <Button variant="outline" onClick={handleContract} disabled={loading}>
                    Contratar
                  </Button>
                </div>

                {simulation ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-800">Resultado da simulação</p>
                    <p className="mt-2 text-sm text-slate-600">{simulation.mensagem}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-slate-500">Valor solicitado</p>
                        <p className="font-semibold">{formatCurrency(simulation.valorSolicitado)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Valor da parcela</p>
                        <p className="font-semibold">{formatCurrency(simulation.valorParcela)}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {simulation.parcelas.slice(0, 4).map((parcela) => (
                        <div key={parcela.numero} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                          <span>Parcela {parcela.numero}</span>
                          <span>{formatDate(parcela.dataVencimento)}</span>
                          <span>{formatCurrency(parcela.valorTotalParcela)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {contractDetails ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">Contrato #{contractDetails.idContrato}</p>
                    <p className="mt-2 text-sm text-emerald-700">Status: {contractDetails.status}</p>
                    <p className="text-sm text-emerald-700">Parcela inicial: {formatDate(contractDetails.parcelas[0]?.dataVencimento ?? new Date())}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ofertas disponíveis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {offers.map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{offer.nome}</p>
                        <p className="text-sm text-slate-600">{offer.descricao}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        Ativa
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <p>Valor: {formatCurrency(offer.valorMinimo)} a {formatCurrency(offer.valorMaximo)}</p>
                      <p>Parcelas: {offer.parcelasMinimas} a {offer.parcelasMaximas}</p>
                      <p>Garantias: {offer.garantias.join(", ")}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de oferta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Nome da oferta</span>
                    <Input value={adminForm.nome} onChange={(event) => setAdminForm({ ...adminForm, nome: event.target.value })} />
                  </label>
                  <label className="space-y-2 text-sm md:col-span-2">
                    <span className="font-medium">Descrição</span>
                    <Textarea value={adminForm.descricao} onChange={(event) => setAdminForm({ ...adminForm, descricao: event.target.value })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Valor mínimo</span>
                    <Input type="number" value={adminForm.valorMinimo} onChange={(event) => setAdminForm({ ...adminForm, valorMinimo: Number(event.target.value) })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Valor máximo</span>
                    <Input type="number" value={adminForm.valorMaximo} onChange={(event) => setAdminForm({ ...adminForm, valorMaximo: Number(event.target.value) })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Parcelas mín.</span>
                    <Input type="number" value={adminForm.parcelasMinimas} onChange={(event) => setAdminForm({ ...adminForm, parcelasMinimas: Number(event.target.value) })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Parcelas máx.</span>
                    <Input type="number" value={adminForm.parcelasMaximas} onChange={(event) => setAdminForm({ ...adminForm, parcelasMaximas: Number(event.target.value) })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Carência mín.</span>
                    <Input type="number" value={adminForm.carenciaMinimaMeses} onChange={(event) => setAdminForm({ ...adminForm, carenciaMinimaMeses: Number(event.target.value) })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Carência máx.</span>
                    <Input type="number" value={adminForm.carenciaMaximaMeses} onChange={(event) => setAdminForm({ ...adminForm, carenciaMaximaMeses: Number(event.target.value) })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Dia de vencimento mín.</span>
                    <Input type="number" value={adminForm.diaVencimentoMinimo} onChange={(event) => setAdminForm({ ...adminForm, diaVencimentoMinimo: Number(event.target.value) })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Dia de vencimento máx.</span>
                    <Input type="number" value={adminForm.diaVencimentoMaximo} onChange={(event) => setAdminForm({ ...adminForm, diaVencimentoMaximo: Number(event.target.value) })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Taxa mensal</span>
                    <Input type="number" step="0.001" value={adminForm.taxaJurosMensal} onChange={(event) => setAdminForm({ ...adminForm, taxaJurosMensal: Number(event.target.value) })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Tipo de amortização</span>
                    <Input value={adminForm.tipoAmortizacao} onChange={(event) => setAdminForm({ ...adminForm, tipoAmortizacao: event.target.value })} />
                  </label>
                  <label className="space-y-2 text-sm md:col-span-2">
                    <span className="font-medium">Garantias</span>
                    <Textarea value={adminForm.garantias} onChange={(event) => setAdminForm({ ...adminForm, garantias: event.target.value })} />
                  </label>
                </div>
                <Button onClick={handleCreateOffer} disabled={loading}>
                  Criar oferta
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Solicitações recebidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">Cliente #{request.clienteId}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{request.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Oferta: {request.ofertaId}</p>
                    <p className="text-sm text-slate-600">Valor: {formatCurrency(request.valorSolicitado)}</p>
                    <p className="text-sm text-slate-600">Garantias: {request.garantias.join(", ")}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
