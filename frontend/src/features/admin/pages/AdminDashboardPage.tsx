import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Skeleton } from "../../../components/ui/skeleton";
import { StatusChip } from "../../../components/ui/status-chip";
import { Textarea } from "../../../components/ui/textarea";
import {
  authorizeDisbursement,
  createAdminAccount,
  createContractTemplate,
  createOffer,
  depositAdminAccount,
  listAdminAccounts,
  listAdminContracts,
  listAdminOffers,
  listAdminMovements,
  listAdminRequests,
  listClients,
  listContractTemplates,
} from "../../../services/creditService";
import type { AccountMovement, AdminContract, Client, ContractTemplate, LimitRequest, Offer } from "../../../types/credit";
import { useImpersonation } from "../../../app/contexts/ImpersonationContext";

const defaultOfferForm = {
  clienteId: 0,
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

const defaultTemplateForm = {
  nome: "Template padrão de empréstimo",
  conteudo: "Contrato de empréstimo entre {{cliente_nome}} e CreditoSimulador. Contrato #{{id_contrato}} no valor de R$ {{valor_financiado}}, taxa mensal {{taxa_juros_mensal}}, {{quantidade_parcelas}} parcelas, amortização {{tipo_amortizacao}} e pagamento via {{tipo_pagamento}}. Gerado em {{data_geracao}}.",
  ativo: true,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { impersonateClient, impersonatedClientId } = useImpersonation();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [requests, setRequests] = useState<LimitRequest[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [accounts, setAccounts] = useState<Array<{ idConta: number; clienteId: number; nomeCliente: string; saldo: number }>>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingAccountAction, setLoadingAccountAction] = useState(false);
  const [form, setForm] = useState(defaultOfferForm);
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm);
  const [createAccountClientId, setCreateAccountClientId] = useState<number | null>(null);
  const [createAccountInitialBalance, setCreateAccountInitialBalance] = useState<number>(0);
  const [depositAccountId, setDepositAccountId] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"overview" | "offers" | "contracts" | "operations" | "templates" | "requests">("overview");

  const refreshData = async (showSkeleton = false) => {
    if (showSkeleton) {
      setLoadingData(true);
    }

    try {
      const [clientsData, contractsData, requestsData, templatesData, movementsData, accountsData, offersData] = await Promise.all([
        listClients(),
        listAdminContracts(),
        listAdminRequests(),
        listContractTemplates(),
        listAdminMovements(undefined, 120),
        listAdminAccounts(),
        listAdminOffers(),
      ]);
      setClients(clientsData);
      setContracts(contractsData);
      setRequests(requestsData);
      setTemplates(templatesData);
      setMovements(movementsData);
      setAccounts(accountsData);
      setOffers(offersData);

      if (selectedClientId === null && clientsData.length > 0) {
        setSelectedClientId(clientsData[0].id);
      }

      if (createAccountClientId === null && clientsData.length > 0) {
        setCreateAccountClientId(clientsData[0].id);
      }

      if (form.clienteId === 0 && clientsData.length > 0) {
        setForm((current) => ({ ...current, clienteId: clientsData[0].id }));
      }

      if (depositAccountId === null && accountsData.length > 0) {
        setDepositAccountId(accountsData[0].idConta);
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    void refreshData(true).catch((error: Error) => setMessage(error.message));
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
        clienteId: form.clienteId,
      });

      await refreshData();
      setMessage("Oferta criada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar oferta.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.nome.trim() || !templateForm.conteudo.trim()) {
      setMessage("Informe nome e conteúdo do template para salvar.");
      return;
    }

    setSavingTemplate(true);
    setMessage("");

    try {
      await createContractTemplate({
        nome: templateForm.nome,
        conteudo: templateForm.conteudo,
        ativo: templateForm.ativo,
      });

      await refreshData();
      setMessage("Template de contrato criado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar template de contrato.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleAuthorizeDisbursement = async (contractId: number) => {
    setMessage("");
    try {
      await authorizeDisbursement(contractId);
      await refreshData();
      setMessage(`Desembolso do contrato #${contractId} autorizado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao autorizar desembolso.");
    }
  };

  const handleImpersonate = () => {
    if (selectedClientId === null) {
      setMessage("Selecione um cliente para impersonar.");
      return;
    }

    impersonateClient(selectedClientId);
    navigate("/cliente");
  };

  const handleCreateAccount = async () => {
    if (!createAccountClientId) {
      setMessage("Selecione um cliente para criar conta.");
      return;
    }

    setLoadingAccountAction(true);
    setMessage("");

    try {
      await createAdminAccount(createAccountClientId, createAccountInitialBalance);
      await refreshData();
      setMessage("Conta criada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar conta.");
    } finally {
      setLoadingAccountAction(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAccountId) {
      setMessage("Selecione uma conta para depósito.");
      return;
    }

    setLoadingAccountAction(true);
    setMessage("");

    try {
      await depositAdminAccount(depositAccountId, depositAmount);
      await refreshData();
      setMessage("Depósito realizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao depositar em conta.");
    } finally {
      setLoadingAccountAction(false);
    }
  };

  const tabButtonClass = (tab: "overview" | "offers" | "contracts" | "operations" | "templates" | "requests") =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      activeTab === tab ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
    }`;

  const statusToLabel = (offer: Offer) => {
    if (offer.status === "CONSUMED") {
      return "Consumida";
    }

    if (offer.status === "INACTIVE") {
      return "Inativa";
    }

    return "Ativa";
  };

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">Clientes</p><p className="mt-2 text-3xl font-semibold text-slate-900">{clients.length}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">Ofertas</p><p className="mt-2 text-3xl font-semibold text-slate-900">{offers.length}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">Contratos</p><p className="mt-2 text-3xl font-semibold text-slate-900">{contracts.length}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-slate-500">Solicitações</p><p className="mt-2 text-3xl font-semibold text-slate-900">{requests.length}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={tabButtonClass("overview")} onClick={() => setActiveTab("overview")}>Visão geral</button>
        <button type="button" className={tabButtonClass("offers")} onClick={() => setActiveTab("offers")}>Ofertas</button>
        <button type="button" className={tabButtonClass("contracts")} onClick={() => setActiveTab("contracts")}>Contratos</button>
        <button type="button" className={tabButtonClass("operations")} onClick={() => setActiveTab("operations")}>Operações</button>
        <button type="button" className={tabButtonClass("requests")} onClick={() => setActiveTab("requests")}>Solicitações</button>
        <button type="button" className={tabButtonClass("templates")} onClick={() => setActiveTab("templates")}>Templates</button>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Resumo de ofertas</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>Ativas: {offers.filter((offer) => offer.status === "ACTIVE" || (!offer.status && offer.ativa)).length}</p>
              <p>Consumidas: {offers.filter((offer) => offer.status === "CONSUMED").length}</p>
              <p>Inativas: {offers.filter((offer) => offer.status === "INACTIVE" || (!offer.ativa && offer.status !== "CONSUMED")).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ações rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={() => setActiveTab("offers")}>Criar nova oferta</Button>
              <Button variant="outline" onClick={() => setActiveTab("operations")}>Gerenciar operações</Button>
              <Button variant="outline" onClick={() => setActiveTab("contracts")}>Ver contratos</Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "offers" ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>Configuração de oferta</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Cliente da oferta</span>
                  <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" value={form.clienteId} onChange={(event) => setForm({ ...form, clienteId: Number(event.target.value) })}>
                    {clients.length === 0 ? <option value={0}>Nenhum cliente disponível</option> : null}
                    {clients.map((client) => <option key={`offer-client-${client.id}`} value={client.id}>#{client.id} - {client.nome}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm"><span className="font-medium">Nome da oferta</span><Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} /></label>
                <label className="space-y-2 text-sm md:col-span-2"><span className="font-medium">Descrição</span><Textarea value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium">Valor mínimo</span><Input type="number" value={form.valorMinimo} onChange={(event) => setForm({ ...form, valorMinimo: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium">Valor máximo</span><Input type="number" value={form.valorMaximo} onChange={(event) => setForm({ ...form, valorMaximo: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium">Parcelas mín.</span><Input type="number" value={form.parcelasMinimas} onChange={(event) => setForm({ ...form, parcelasMinimas: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium">Parcelas máx.</span><Input type="number" value={form.parcelasMaximas} onChange={(event) => setForm({ ...form, parcelasMaximas: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium">Carência mín.</span><Input type="number" value={form.carenciaMinimaMeses} onChange={(event) => setForm({ ...form, carenciaMinimaMeses: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium">Carência máx.</span><Input type="number" value={form.carenciaMaximaMeses} onChange={(event) => setForm({ ...form, carenciaMaximaMeses: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium">Dia de vencimento mín.</span><Input type="number" value={form.diaVencimentoMinimo} onChange={(event) => setForm({ ...form, diaVencimentoMinimo: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium">Dia de vencimento máx.</span><Input type="number" value={form.diaVencimentoMaximo} onChange={(event) => setForm({ ...form, diaVencimentoMaximo: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium">Taxa mensal</span><Input type="number" step="0.001" value={form.taxaJurosMensal} onChange={(event) => setForm({ ...form, taxaJurosMensal: Number(event.target.value) })} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium">Tipo de amortização</span><Input value={form.tipoAmortizacao} onChange={(event) => setForm({ ...form, tipoAmortizacao: event.target.value })} /></label>
                <label className="space-y-2 text-sm md:col-span-2"><span className="font-medium">Garantias</span><Textarea value={form.garantias} onChange={(event) => setForm({ ...form, garantias: event.target.value })} /></label>
              </div>
              <Button onClick={handleCreateOffer} disabled={loading}>Criar oferta</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Grid de ofertas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loadingData ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : offers.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma oferta cadastrada.</p>
              ) : (
                <div className="max-h-[640px] space-y-2 overflow-auto pr-1">
                  {offers.map((offer) => (
                    <div key={offer.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{offer.nome}</p>
                        <StatusChip status={statusToLabel(offer)} />
                      </div>
                      <p className="mt-1 text-slate-600">Cliente #{offer.clienteId} • {offer.tipoAmortizacao}</p>
                      <p className="mt-1 text-slate-600">{formatCurrency(offer.valorMinimo)} a {formatCurrency(offer.valorMaximo)} • {offer.parcelasMinimas}-{offer.parcelasMaximas} parcelas</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "operations" ? (
        <Card>
          <CardHeader><CardTitle>Operações administrativas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">Selecione um cliente para entrar na experiência do cliente sem depender de contrato específico.</p>
            <label className="space-y-2 text-sm"><span className="font-medium">Cliente</span><select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" value={selectedClientId ?? ""} onChange={(event) => setSelectedClientId(Number(event.target.value))}>{clients.length === 0 ? <option value="">Nenhum cliente disponível</option> : null}{clients.map((client) => <option key={client.id} value={client.id}>#{client.id} - {client.nome} ({formatCurrency(client.saldoConta)})</option>)}</select></label>
            {impersonatedClientId !== null ? <p className="text-xs text-slate-500">Impersonação ativa no cliente #{impersonatedClientId}</p> : null}
            <Button onClick={handleImpersonate} disabled={clients.length === 0}>Entrar na plataforma do cliente</Button>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">Gestão de conta</p>
              <label className="space-y-2 text-sm block"><span className="font-medium">Criar conta para cliente</span><select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" value={createAccountClientId ?? ""} onChange={(event) => setCreateAccountClientId(Number(event.target.value))}>{clients.map((client) => <option key={`create-${client.id}`} value={client.id}>#{client.id} - {client.nome}</option>)}</select></label>
              <label className="space-y-2 text-sm block"><span className="font-medium">Saldo inicial</span><Input type="number" min={0} value={createAccountInitialBalance} onChange={(event) => setCreateAccountInitialBalance(Number(event.target.value))} /></label>
              <Button onClick={handleCreateAccount} disabled={loadingAccountAction || clients.length === 0}>Criar conta</Button>
              <label className="space-y-2 text-sm block"><span className="font-medium">Depositar em conta</span><select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" value={depositAccountId ?? ""} onChange={(event) => setDepositAccountId(Number(event.target.value))}>{accounts.map((account) => <option key={`deposit-${account.idConta}`} value={account.idConta}>Conta #{account.idConta} • Cliente #{account.clienteId} - {account.nomeCliente} ({formatCurrency(account.saldo)})</option>)}</select></label>
              <label className="space-y-2 text-sm block"><span className="font-medium">Valor do depósito</span><Input type="number" min={0} value={depositAmount} onChange={(event) => setDepositAmount(Number(event.target.value))} /></label>
              <Button variant="outline" onClick={handleDeposit} disabled={loadingAccountAction || accounts.length === 0}>Depositar</Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">Extrato de movimentações</p>
              {loadingData ? <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : movements.length === 0 ? <p className="text-sm text-slate-500">Sem movimentações registradas.</p> : (
                <div className="max-h-64 space-y-2 overflow-auto pr-1">
                  {movements.filter((movement) => (selectedClientId ? movement.clienteId === selectedClientId : true)).slice(0, 30).map((movement) => (
                    <div key={movement.idMovimentacao} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2"><p className="font-semibold text-slate-800">{movement.tipo}</p><p className={movement.valor >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>{formatCurrency(movement.valor)}</p></div>
                      <p className="mt-1 text-slate-600">Cliente #{movement.clienteId} • Saldo: {formatCurrency(movement.saldoAnterior)} → {formatCurrency(movement.saldoAtual)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "contracts" ? (
        <Card>
          <CardHeader><CardTitle>Contratos do administrativo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loadingData ? Array.from({ length: 3 }).map((_, index) => <div key={`contract-skeleton-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><Skeleton className="h-5 w-44" /><Skeleton className="mt-3 h-4 w-56" /></div>) : contracts.length === 0 ? <p className="text-sm text-slate-500">Nenhum contrato cadastrado ainda.</p> : contracts.map((contract) => (
              <div key={contract.idContrato} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">Contrato #{contract.idContrato}</p><p className="text-sm text-slate-600">Cliente #{contract.idCliente} • {contract.quantidadeParcelas} parcelas</p><p className="text-sm text-slate-600">Valor: {formatCurrency(contract.valorFinanciado)}</p></div>
                  <div className="text-right"><StatusChip status={contract.status} /><p className="text-xs text-slate-500">{contract.tipoAmortizacao}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => navigate(`/admin/contratos/${contract.idContrato}`)}>Ver detalhes</Button>{contract.status.trim().toLowerCase() === "aguardando desembolso" ? <Button size="sm" onClick={() => void handleAuthorizeDisbursement(contract.idContrato)}>Autorizar desembolso</Button> : null}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "requests" ? (
        <Card>
          <CardHeader><CardTitle>Solicitações recebidas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loadingData ? Array.from({ length: 3 }).map((_, index) => <div key={`request-skeleton-${index}`} className="rounded-xl border border-slate-200 p-4"><Skeleton className="h-5 w-32" /></div>) : requests.length === 0 ? <p className="text-sm text-slate-500">Nenhuma solicitação encontrada.</p> : requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">Cliente #{request.clienteId}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{request.status}</span></div><p className="mt-2 text-sm text-slate-600">Oferta: {request.ofertaId}</p><p className="text-sm text-slate-600">Valor: {formatCurrency(request.valorSolicitado)}</p><p className="text-sm text-slate-600">Garantias: {request.garantias.join(", ")}</p></div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "templates" ? (
        <Card>
          <CardHeader><CardTitle>Templates de contrato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <label className="space-y-2 text-sm"><span className="font-medium">Nome do template</span><Input value={templateForm.nome} onChange={(event) => setTemplateForm({ ...templateForm, nome: event.target.value })} /></label>
              <label className="space-y-2 text-sm"><span className="font-medium">Conteúdo do contrato</span><Textarea value={templateForm.conteudo} onChange={(event) => setTemplateForm({ ...templateForm, conteudo: event.target.value })} /></label>
              <Button onClick={handleCreateTemplate} disabled={savingTemplate}>Salvar template</Button>
            </div>
            <div className="space-y-3">
              {loadingData ? Array.from({ length: 2 }).map((_, index) => <div key={`template-skeleton-${index}`} className="rounded-xl border border-slate-200 p-4"><Skeleton className="h-5 w-40" /></div>) : templates.length === 0 ? <p className="text-sm text-slate-500">Nenhum template cadastrado ainda.</p> : templates.map((template) => (
                <div key={template.idTemplate} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{template.nome}</p><StatusChip status={template.ativo ? "Ativo" : "Inativo"} /></div><p className="mt-2 line-clamp-3 text-sm text-slate-600">{template.conteudo}</p></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}