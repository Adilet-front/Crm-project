export type PaymentRequestStatus =
  | 'new'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'paid';

export interface PaymentRequestRecord {
  id: string;
  initiator: string;
  amount: number;
  purpose: string;
  status: PaymentRequestStatus;
}
