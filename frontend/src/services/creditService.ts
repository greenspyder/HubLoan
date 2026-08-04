import type {
  AccountMovement,
  AdminAccount,
  AdminContract,
  Client,
  ClientContractParcel,
  ContractActionResponse,
  ContractTemplate,
  ContractDetails,
  ContractSummary,
  CreateContractTemplateRequest,
  LimitRequest,
  OperationalDateState,
  Offer,
  SimulationRequest,
  SimulationResponse,
} from "../types/credit";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Falha na requisição: ${path}`);
  }

  return (await response.json()) as T;
}

export async function listClientOffers(customerId: number): Promise<Offer[]> {
  return requestJson<Offer[]>(`/clientes/ofertas?customerId=${customerId}`);
}

export async function listAdminOffers(): Promise<Offer[]> {
  return requestJson<Offer[]>("/admin/ofertas");
}

export async function listClients(): Promise<Client[]> {
  const data = await requestJson<Array<{ id?: number; idCliente?: number; nome?: string; limite?: number; limiteGlobal?: number; saldoConta?: number; totalContas?: number }>>("/clientes");

  return data.map((client) => ({
    id: client.id ?? client.idCliente ?? 0,
    nome: client.nome ?? "Cliente",
    limite: client.limite ?? client.limiteGlobal ?? 0,
    saldoConta: client.saldoConta ?? 0,
    totalContas: client.totalContas ?? 0,
  }));
}

export async function listAdminAccounts(customerId?: number): Promise<AdminAccount[]> {
  const path = customerId ? `/admin/contas?customerId=${customerId}` : "/admin/contas";
  return requestJson<AdminAccount[]>(path);
}

export async function listClientAccounts(customerId: number): Promise<AdminAccount[]> {
  return requestJson<AdminAccount[]>(`/clientes/contas?customerId=${customerId}`);
}

export async function createAdminAccount(clienteId: number, saldoInicial: number): Promise<void> {
  await requestJson<void>("/admin/contas", {
    method: "POST",
    body: JSON.stringify({ clienteId, saldoInicial }),
  });
}

export async function depositAdminAccount(idConta: number, valor: number): Promise<void> {
  await requestJson<void>("/admin/contas/deposito", {
    method: "POST",
    body: JSON.stringify({ idConta, valor }),
  });
}

export async function getOperationalDate(): Promise<OperationalDateState> {
  return requestJson<OperationalDateState>("/admin/data-operacional");
}

export async function setOperationalDate(dataAtual: string | null): Promise<void> {
  await requestJson<void>("/admin/data-operacional", {
    method: "POST",
    body: JSON.stringify({ dataAtual }),
  });
}

export async function listAdminMovements(clienteId?: number, limit = 100): Promise<AccountMovement[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (clienteId) {
    params.set("clienteId", String(clienteId));
  }

  return requestJson<AccountMovement[]>(`/admin/movimentacoes?${params.toString()}`);
}

export async function listClientMovements(customerId: number, limit = 100): Promise<AccountMovement[]> {
  const params = new URLSearchParams({ customerId: String(customerId), limit: String(limit) });
  return requestJson<AccountMovement[]>(`/clientes/movimentacoes?${params.toString()}`);
}

export async function listAdminContracts(): Promise<AdminContract[]> {
  return requestJson<AdminContract[]>("/admin/contratos");
}

export async function listAdminRequests(): Promise<LimitRequest[]> {
  return requestJson<LimitRequest[]>("/admin/solicitacoes");
}

export async function listContractTemplates(): Promise<ContractTemplate[]> {
  return requestJson<ContractTemplate[]>("/admin/contract-templates");
}

export async function createContractTemplate(payload: CreateContractTemplateRequest): Promise<ContractTemplate> {
  return requestJson<ContractTemplate>("/admin/contract-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listClientContracts(clientId: number): Promise<ContractSummary[]> {
  return requestJson<ContractSummary[]>(`/clientes/contratos?customerId=${clientId}`);
}

export async function listClientParcels(clientId: number): Promise<ClientContractParcel[]> {
  return requestJson<ClientContractParcel[]>(`/clientes/parcelas?customerId=${clientId}`);
}

export async function getContractDetails(contractId: number): Promise<ContractDetails> {
  return requestJson<ContractDetails>(`/clientes/contratos/${contractId}`);
}

export async function createOffer(payload: Record<string, unknown>): Promise<void> {
  await requestJson<void>("/admin/ofertas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function simulateCredit(payload: SimulationRequest): Promise<SimulationResponse> {
  return requestJson<SimulationResponse>("/clientes/simular", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function contractCredit(payload: SimulationRequest): Promise<ContractActionResponse> {
  return requestJson<ContractActionResponse>("/clientes/contratar", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function signContract(contractId: number, customerId: number): Promise<ContractActionResponse> {
  return requestJson<ContractActionResponse>(`/clientes/contratos/${contractId}/assinar?customerId=${customerId}`, {
    method: "POST",
  });
}

export async function authorizeDisbursement(contractId: number): Promise<ContractActionResponse> {
  return requestJson<ContractActionResponse>(`/admin/contratos/${contractId}/autorizar-desembolso`, {
    method: "POST",
  });
}

export async function downloadContractDocx(contractId: number, customerId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/clientes/contratos/${contractId}/documento-docx?customerId=${customerId}`);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Não foi possível baixar o DOCX.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `contrato-${contractId}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}