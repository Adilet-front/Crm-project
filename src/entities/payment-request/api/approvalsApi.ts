import { assertApiAccess, type ApiActor } from '@/shared/api/access';

export interface PaymentApprovalRow {
  initiator: string;
  amount: string;
  purpose: string;
  status: string;
}

const PAYMENT_APPROVAL_ROWS: PaymentApprovalRow[] = [
  {
    initiator: 'pm.petrov',
    amount: '100 000 ₽',
    purpose: 'Оплата подрядчика за этап дизайна',
    status: 'На рассмотрении',
  },
  {
    initiator: 'finance.ivanova',
    amount: '34 500 ₽',
    purpose: 'Продление корпоративных лицензий',
    status: 'Новая',
  },
  {
    initiator: 'pm.sidorov',
    amount: '58 000 ₽',
    purpose: 'Реклама проекта в соцсетях',
    status: 'Одобрено',
  },
];

export const listPaymentApprovals = (actor: ApiActor) => {
  assertApiAccess(actor, 'approvals:read');
  return PAYMENT_APPROVAL_ROWS;
};

export const approveAllPaymentApprovals = (actor: ApiActor) => {
  assertApiAccess(actor, 'approvals:write');
  return true;
};

export const rejectAllPaymentApprovals = (actor: ApiActor) => {
  assertApiAccess(actor, 'approvals:write');
  return true;
};
