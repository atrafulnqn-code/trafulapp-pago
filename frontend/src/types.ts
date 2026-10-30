export enum PaymentSystem {
  TASAS = 'TASAS',
  PATENTE = 'PATENTE',
  OTRAS = 'OTRAS',
  AGUA = 'AGUA', // Added AGUA enum member
  POLIDEPORTIVO = 'POLIDEPORTIVO'
}

/** Pausa temporal de trámites públicos (botones de Home y rutas /pagar /plan-de-pago). */
export const PUBLIC_SERVICES_PAUSED = true;

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
  originalRecordId?: string;
}

export interface PaymentStep {
  id: number;
  name: string;
  description: string;
}