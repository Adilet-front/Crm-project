export type OperationType = 'income' | 'expense' | 'transfer';

export interface OperationRecord {
  id: string;
  date: string;
  type: OperationType;
  description: string;
  project: string;
  counterparty: string;
  account: string;
  amount: number;
}
