import { assertApiAccess, type ApiActor } from '@/shared/api/access';
import type { OperationType } from '../model/types';

export interface OperationRow {
  date: string;
  type: string;
  description: string;
  article: string;
  project: string;
  counterparty: string;
  account: string;
  amount: string;
}

export interface CreateOperationPayload {
  type: OperationType;
  amount: number;
  date: string;
  description: string;
  projectId?: string;
}

const OPERATION_ROWS: OperationRow[] = [
  {
    date: '2026-02-21',
    type: 'Расход',
    description: 'Оплата хостинга',
    article: 'Инфраструктура',
    project: 'Сайт Ромашка',
    counterparty: 'Hosting KG',
    account: 'РСК Банк',
    amount: '36 000 ₽',
  },
  {
    date: '2026-02-20',
    type: 'Приход',
    description: 'Оплата этапа 2',
    article: 'Выручка',
    project: 'Мобильное приложение Nova',
    counterparty: 'Nova LLC',
    account: 'РСК Банк',
    amount: '420 000 ₽',
  },
  {
    date: '2026-02-19',
    type: 'Перевод',
    description: 'Пополнение операционного счета',
    article: 'Перевод между счетами',
    project: '—',
    counterparty: '—',
    account: 'M-Bank',
    amount: '120 000 ₽',
  },
];

export const listOperations = (actor: ApiActor) => {
  assertApiAccess(actor, 'operations:read');
  return OPERATION_ROWS;
};

export const createOperation = (actor: ApiActor, payload: CreateOperationPayload) => {
  assertApiAccess(actor, 'operations:write');

  return {
    id: `op-${Date.now()}`,
    ...payload,
  };
};
