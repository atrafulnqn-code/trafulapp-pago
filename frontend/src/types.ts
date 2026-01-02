
export enum PaymentSystem {
  TASAS = 'TASAS',
  PATENTE = 'PATENTE',
  OTRAS = 'OTRAS'
}

export interface Debt {
  id: string;
  period: string;
  description: string;
  dueDate: string;
  amount: number;
  surcharge: number;
}

export interface SearchResult {
  taxpayerName: string;
  referenceNumber: string;
  debts: Debt[];
}

export interface PaymentStep {
  id: number;
  name: string;
  description: string;
}
