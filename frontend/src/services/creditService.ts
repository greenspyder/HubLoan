import type {
  AdminContract,
  Client,
  ClientContractParcel,
  ContractActionResponse,
  ContractTemplate,
  ContractDetails,
  ContractSummary,
  CreateContractTemplateRequest,
  LimitRequest,
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

export async function listClientOffers(): Promise<Offer[]> {
  const [clientOffers, adminOffers] = await Promise.all([
    requestJson<Offer[]>("/clientes/ofertas"),
    requestJson<Offer[]>("/admin/ofertas"),
  ]);

  return clientOffers.length > 0 ? clientOffers : adminOffers;
}

export async function listClients(): Promise<Client[]> {
  const data = await requestJson<Array<{ id?: number; idCliente?: number; nome?: string; limite?: number; limiteGlobal?: number }>>("/clientes");

  return data.map((client) => ({
    id: client.id ?? client.idCliente ?? 0,
    nome: client.nome ?? "Cliente",
    limite: client.limite ?? client.limiteGlobal ?? 0,
  }));
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