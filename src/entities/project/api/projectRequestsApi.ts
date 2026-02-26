import { PROJECT_OPTIONS } from '@/entities/project/model/mockProjects';
import type { ProjectOption } from '@/entities/project/model/types';
import { isReadOnlyRole } from '@/entities/user/model/access';
import { assertApiAccess, type ApiActor } from '@/shared/api/access';
import { ForbiddenError } from '@/shared/api/errors';

export type ProjectRequestStatus = 'new' | 'review' | 'approved' | 'rejected' | 'paid';

export type ProjectRequestAction = 'actions' | 'view' | 'pending_payment' | 'none';

export interface ProjectRequestRecord {
  id: string;
  initiator: string;
  date: string;
  amount: number;
  purpose: string;
  project: string;
  projectId: string;
  status: ProjectRequestStatus;
  action: ProjectRequestAction;
}

export interface CreateProjectRequestPayload {
  amount: number;
  projectId: string;
  purpose: string;
  desiredPaymentDate?: string;
}

interface ProjectRequestEntity extends ProjectRequestRecord {
  responsiblePmIdentifier: string;
}

const PROJECT_REQUESTS: ProjectRequestEntity[] = [
  {
    id: 'rq-1001',
    initiator: 'Морозов А.В.',
    date: '20.02.2026',
    amount: 1_500_000,
    purpose: 'Закупка оборудования для проекта',
    project: 'Проект "Альфа"',
    projectId: 'alpha',
    status: 'new',
    action: 'actions',
    responsiblePmIdentifier: '20011',
  },
  {
    id: 'rq-1002',
    initiator: 'Иванова М.С.',
    date: '19.02.2026',
    amount: 850_000,
    purpose: 'Оплата подрядчика по договору',
    project: 'Проект "Бета"',
    projectId: 'beta',
    status: 'review',
    action: 'actions',
    responsiblePmIdentifier: '20011',
  },
  {
    id: 'rq-1003',
    initiator: 'Петров И.П.',
    date: '18.02.2026',
    amount: 340_000,
    purpose: 'Оплата маркетинговых услуг',
    project: 'Проект "Гамма"',
    projectId: 'gamma',
    status: 'approved',
    action: 'pending_payment',
    responsiblePmIdentifier: '20017',
  },
  {
    id: 'rq-1004',
    initiator: 'Сидорова Е.А.',
    date: '17.02.2026',
    amount: 120_000,
    purpose: 'Аренда офиса на квартал',
    project: 'Общие расходы',
    projectId: 'operations',
    status: 'rejected',
    action: 'view',
    responsiblePmIdentifier: '20011',
  },
  {
    id: 'rq-1005',
    initiator: 'Морозов А.В.',
    date: '15.02.2026',
    amount: 2_300_000,
    purpose: 'Предоплата поставщику',
    project: 'Проект "Альфа"',
    projectId: 'alpha',
    status: 'paid',
    action: 'none',
    responsiblePmIdentifier: '20011',
  },
  {
    id: 'rq-1006',
    initiator: 'Кузнецова Н.А.',
    date: '14.02.2026',
    amount: 460_000,
    purpose: 'Продление лицензий ПО',
    project: 'Проект "Бета"',
    projectId: 'beta',
    status: 'review',
    action: 'actions',
    responsiblePmIdentifier: '20011',
  },
  {
    id: 'rq-1007',
    initiator: 'Шевченко О.П.',
    date: '13.02.2026',
    amount: 210_000,
    purpose: 'Рекламная кампания',
    project: 'Проект "Гамма"',
    projectId: 'gamma',
    status: 'approved',
    action: 'pending_payment',
    responsiblePmIdentifier: '20017',
  },
  {
    id: 'rq-1008',
    initiator: 'Иванова М.С.',
    date: '12.02.2026',
    amount: 90_000,
    purpose: 'Транспортные расходы',
    project: 'Общие расходы',
    projectId: 'operations',
    status: 'rejected',
    action: 'view',
    responsiblePmIdentifier: '20011',
  },
  {
    id: 'rq-1009',
    initiator: 'Петров И.П.',
    date: '11.02.2026',
    amount: 730_000,
    purpose: 'Оплата работ подрядчика',
    project: 'Проект "Альфа"',
    projectId: 'alpha',
    status: 'paid',
    action: 'none',
    responsiblePmIdentifier: '20011',
  },
  {
    id: 'rq-1010',
    initiator: 'Сидорова Е.А.',
    date: '10.02.2026',
    amount: 1_180_000,
    purpose: 'Поставка материалов',
    project: 'Проект "Бета"',
    projectId: 'beta',
    status: 'new',
    action: 'actions',
    responsiblePmIdentifier: '20011',
  },
  {
    id: 'rq-1011',
    initiator: 'Кузнецова Н.А.',
    date: '09.02.2026',
    amount: 270_000,
    purpose: 'Консультационные услуги',
    project: 'Проект "Гамма"',
    projectId: 'gamma',
    status: 'review',
    action: 'actions',
    responsiblePmIdentifier: '20017',
  },
];

const normalizeIdentifier = (identifier: string) => identifier.trim().toLowerCase();

const isAssignedToPm = (pmIdentifier: string, responsiblePmIdentifier: string) =>
  normalizeIdentifier(pmIdentifier) === normalizeIdentifier(responsiblePmIdentifier);

const normalizeRecord = (record: ProjectRequestEntity): ProjectRequestRecord => ({
  id: record.id,
  initiator: record.initiator,
  date: record.date,
  amount: record.amount,
  purpose: record.purpose,
  project: record.project,
  projectId: record.projectId,
  status: record.status,
  action: record.action,
});

const canPmOperateProject = (pmIdentifier: string, project: ProjectOption) =>
  isAssignedToPm(pmIdentifier, project.responsiblePmIdentifier);

export const listProjectRequests = (actor: ApiActor): ProjectRequestRecord[] => {
  assertApiAccess(actor, 'project_requests:read');

  if (actor.role !== 'pm') {
    return PROJECT_REQUESTS.map(normalizeRecord);
  }

  return PROJECT_REQUESTS.filter((request) =>
    isAssignedToPm(actor.identifier, request.responsiblePmIdentifier)
  ).map(normalizeRecord);
};

export const listProjectOptions = (actor: ApiActor): ProjectOption[] => {
  assertApiAccess(actor, 'project_requests:read');

  if (actor.role !== 'pm') {
    return PROJECT_OPTIONS;
  }

  return PROJECT_OPTIONS.filter((project) => canPmOperateProject(actor.identifier, project));
};

export const createProjectRequest = (
  actor: ApiActor,
  payload: CreateProjectRequestPayload
): ProjectRequestRecord => {
  assertApiAccess(actor, 'project_requests:write');

  if (isReadOnlyRole(actor.role)) {
    throw new ForbiddenError();
  }

  const project = PROJECT_OPTIONS.find((item) => item.id === payload.projectId);
  if (!project) {
    throw new Error('Проект не найден');
  }

  if (actor.role === 'pm' && !canPmOperateProject(actor.identifier, project)) {
    throw new ForbiddenError();
  }

  return {
    id: `rq-${Date.now()}`,
    initiator: actor.identifier,
    date: new Date().toLocaleDateString('ru-RU'),
    amount: payload.amount,
    purpose: payload.purpose,
    project: project.name,
    projectId: project.id,
    status: 'new',
    action: 'actions',
  };
};
