import type {
  AdminDataSnapshot,
  AdminMailMessage,
  AdminUser,
  AuditLogEntry,
  BankAccount,
  HandbookEntry,
  LegalEntity,
} from './types';

const BASE_ISO = '2026-02-26T10:00:00.000Z';

const makeInviteLink = (token: string) => `/auth/setup-password/${token}`;

const makeInviteBody = (fullName: string, inviteLink: string) =>
  [
    `Здравствуйте, ${fullName}!`,
    '',
    'Вас пригласили в CRM Finance.',
    'Для активации учетной записи перейдите по ссылке и установите пароль:',
    inviteLink,
    '',
    'Ссылка действует 48 часов.',
  ].join('\n');

const USERS: AdminUser[] = [
  {
    id: 'u_owner',
    name: 'Александр Смирнов',
    email: 'owner@company.com',
    employeeId: '001',
    role: 'owner',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
    lastLoginAt: '2026-02-26T07:24:00.000Z',
  },
  {
    id: 'u_fin',
    name: 'Иван Петров',
    email: 'finmanager@company.com',
    employeeId: '002',
    role: 'financial_manager',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
    lastLoginAt: '2026-02-26T06:55:00.000Z',
  },
  {
    id: 'u_pm',
    name: 'Елена Соколова',
    email: 'pm@company.com',
    employeeId: '003',
    role: 'pm',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
    lastLoginAt: '2026-02-25T14:41:00.000Z',
  },
  {
    id: 'u_admin',
    name: 'Дмитрий Tech',
    email: 'admin@company.com',
    employeeId: '004',
    role: 'admin',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
    lastLoginAt: '2026-02-26T08:08:00.000Z',
  },
  {
    id: 'u_invited_anna',
    name: 'Анна Кузнецова',
    email: 'anna.k@company.com',
    employeeId: '005',
    role: 'financial_manager',
    status: 'invited',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
];

const INVITE_TOKEN = 'invite_anna_20260226';

const OUTBOX: AdminMailMessage[] = [
  {
    id: 'mail_1',
    inviteId: 'inv_anna_1',
    to: 'anna.k@company.com',
    subject: 'Приглашение в CRM Finance',
    body: makeInviteBody('Анна Кузнецова', makeInviteLink(INVITE_TOKEN)),
    sentAt: '2026-02-26T08:05:00.000Z',
    inviteLink: makeInviteLink(INVITE_TOKEN),
  },
];

const LEGAL_ENTITIES: LegalEntity[] = [
  {
    id: 'le_1',
    name: 'ООО "ГлавСтрой"',
    inn: '7701234567',
    type: 'ООО',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
  {
    id: 'le_2',
    name: 'ООО "Горизонт Девелопмент"',
    inn: '7709876543',
    type: 'ООО',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
  {
    id: 'le_3',
    name: 'ИП Иванов А.В.',
    inn: '500123456789',
    type: 'ИП',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
];

const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'ba_1',
    bankName: 'ПАО Сбербанк',
    accountNumber: '40702810100000000001',
    ownerEntityId: 'le_1',
    currency: 'RUB',
    balance: 8_500_000,
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
  {
    id: 'ba_2',
    bankName: 'ПАО ВТБ',
    accountNumber: '40702810200000000002',
    ownerEntityId: 'le_2',
    currency: 'RUB',
    balance: 5_200_000,
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
  {
    id: 'ba_3',
    bankName: 'АО Т-Банк',
    accountNumber: '40702810300000000003',
    ownerEntityId: 'le_3',
    currency: 'RUB',
    balance: 1_900_000,
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
];

const HANDBOOKS: HandbookEntry[] = [
  {
    id: 'hb_1',
    name: 'Статьи ДДС: Выручка',
    category: 'Финансы',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: '2026-02-24T06:10:00.000Z',
  },
  {
    id: 'hb_2',
    name: 'Статьи ДДС: Материалы',
    category: 'Финансы',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: '2026-02-24T06:12:00.000Z',
  },
  {
    id: 'hb_3',
    name: 'Типы проектов: Строительство',
    category: 'Проекты',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: '2026-02-23T15:40:00.000Z',
  },
  {
    id: 'hb_4',
    name: 'Контрагенты: Поставщики',
    category: 'Справочник',
    status: 'active',
    createdAt: BASE_ISO,
    updatedAt: '2026-02-23T13:20:00.000Z',
  },
];

const LOGS: AuditLogEntry[] = [
  {
    id: 'log_1',
    timestamp: '2026-02-26T08:05:00.000Z',
    actor: 'Дмитрий Tech',
    action: 'user.invite_sent',
    entityType: 'user',
    entityId: 'u_invited_anna',
    summary: 'Отправлено приглашение пользователю Анна Кузнецова',
    payload: {
      email: 'anna.k@company.com',
      role: 'financial_manager',
      employeeId: '005',
    },
  },
  {
    id: 'log_2',
    timestamp: '2026-02-24T08:15:42.000Z',
    actor: 'Дмитрий Tech',
    action: 'user.updated',
    entityType: 'user',
    entityId: 'u_pm',
    summary: 'Обновлены данные пользователя Елена Соколова',
    payload: {
      role: 'pm',
      email: 'pm@company.com',
    },
  },
  {
    id: 'log_3',
    timestamp: '2026-02-24T07:12:08.000Z',
    actor: 'Дмитрий Tech',
    action: 'handbook.updated',
    entityType: 'handbook',
    entityId: 'hb_1',
    summary: 'Обновлена запись справочника Статьи ДДС: Выручка',
    payload: {
      category: 'Финансы',
    },
  },
];

export const SEED_PENDING_INVITE_TOKEN = INVITE_TOKEN;

export const INITIAL_ADMIN_SNAPSHOT: AdminDataSnapshot = {
  users: USERS,
  invites: [
    {
      id: 'inv_anna_1',
      userId: 'u_invited_anna',
      token: INVITE_TOKEN,
      email: 'anna.k@company.com',
      sentAt: '2026-02-26T08:05:00.000Z',
      expiresAt: '2026-02-28T08:05:00.000Z',
      resendCount: 0,
      status: 'pending',
    },
  ],
  outbox: OUTBOX,
  legalEntities: LEGAL_ENTITIES,
  bankAccounts: BANK_ACCOUNTS,
  handbooks: HANDBOOKS,
  logs: LOGS,
};

export const makeInviteEmailPayload = (fullName: string, token: string) => {
  const inviteLink = makeInviteLink(token);
  return {
    subject: 'Приглашение в CRM Finance',
    body: makeInviteBody(fullName, inviteLink),
    inviteLink,
  };
};

const fallbackClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const cloneAdminSnapshot = (snapshot: AdminDataSnapshot): AdminDataSnapshot => {
  if (typeof structuredClone === 'function') {
    return structuredClone(snapshot);
  }
  return fallbackClone(snapshot);
};

export const buildSeedAdminSnapshot = (): AdminDataSnapshot => cloneAdminSnapshot(INITIAL_ADMIN_SNAPSHOT);
