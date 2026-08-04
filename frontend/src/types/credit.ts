export type Offer = {
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
  limiteMaximoCliente: number;
};

export type Client = {
  id: number;
  nome: string;
  limite: number;
};

export type ContractSummary = {
  id: number;
  idCliente: number;
  valorFinanciado: number;
  taxaJurosMensal: number;
  quantidadeParcelas: number;
  tipoAmortizacao: string;
  status: string;
};

export type ContractParcel = {
  numero: number;
  dataVencimento: string;
  valorTotalParcela: number;
};

export type ContractDetails = {
  idContrato: number;
  idCliente: number;
  valorFinanciado: number;
  taxaJurosMensal: number;
  quantidadeParcelas: number;
  tipoAmortizacao: string;
  status: string;
  valorTotalPago?: number;
  parcelas: ContractParcel[];
};

export type AdminContract = {
  idContrato: number;
  idCliente: number;
  valorFinanciado: number;
  quantidadeParcelas: number;
  tipoAmortizacao: string;
  status: string;
};

export type LimitRequest = {
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

export type SimulationRequest = {
  clienteId: number;
  valorSolicitado: number;
  quantidadeParcelas: number;
  diaVencimento: number;
  carenciaMeses: number;
  ofertaId: string;
};

export type SimulationResponse = {
  aprovado: boolean;
  mensagem: string;
  oferta: Offer;
  valorSolicitado: number;
  quantidadeParcelas: number;
  diaVencimento: number;
  carenciaMeses: number;
  valorParcela: number;
  parcelas: Array<{
    numero: number;
    dataVencimento: string;
    valorAmortizacao: number;
    valorJuros: number;
    valorTotalParcela: number;
  }>;
};

export type ContractActionResponse = {
  Mensagem?: string;
  Contrato?: number;
  ValorDesembolsado?: number;
};