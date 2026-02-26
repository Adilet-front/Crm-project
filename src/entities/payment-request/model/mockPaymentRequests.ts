import type { PaymentRequestStatus } from './types';

export interface PaymentRequestPreview {
  id: string;
  amount: number;
  status: PaymentRequestStatus;
}

export const DASHBOARD_PAYMENT_REQUESTS: PaymentRequestPreview[] = [
  {
    id: 'ZYV-1023',
    amount: 125000,
    status: 'approved',
  },
  {
    id: 'ZYV-1024',
    amount: 89500,
    status: 'review',
  },
  {
    id: 'ZYV-1025',
    amount: 340000,
    status: 'review',
  },
];
