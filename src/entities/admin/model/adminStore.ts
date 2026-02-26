import { create } from 'zustand';
import { canPerformAction } from '@/entities/user/model/access';
import {
  hasPasswordForUser,
  setAuthDirectoryPassword,
  setAuthDirectoryStatus,
  syncAuthDirectoryUsers,
  upsertAuthDirectoryUser,
} from '@/entities/user/model/mockAuthDirectory';
import { buildSeedAdminSnapshot, makeInviteEmailPayload } from './seed';
import {
  clearAdminSnapshot,
  readAdminSnapshot,
  writeAdminSnapshot,
} from './storage';
import {
  hasMinPasswordLength,
  MIN_PASSWORD_ERROR_MESSAGE,
} from '@/shared/lib/authValidation';
import type {
  AdminActor,
  AdminDataSnapshot,
  AdminInvite,
  AdminMailMessage,
  AdminUser,
  AdminUserStatus,
  AuditEntityType,
  AuditLogEntry,
  BankAccount,
  HandbookEntry,
  InviteValidationResult,
  LegalEntity,
  ManagedRecordStatus,
} from './types';

interface MutationResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface InviteUserInput {
  name: string;
  email: string;
  role: AdminUser['role'];
  employeeId?: string;
}

interface UpdateUserInput {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: AdminUser['role'];
}

interface CreateLegalEntityInput {
  name: string;
  inn: string;
  type: string;
}

interface UpdateLegalEntityInput extends CreateLegalEntityInput {
  id: string;
}

interface CreateBankAccountInput {
  bankName: string;
  accountNumber: string;
  ownerEntityId: string;
  currency: string;
  balance: number;
}

interface UpdateBankAccountInput extends CreateBankAccountInput {
  id: string;
}

interface CreateHandbookInput {
  name: string;
  category: string;
}

interface UpdateHandbookInput extends CreateHandbookInput {
  id: string;
}

interface AdminStoreState extends AdminDataSnapshot {
  inviteUser: (input: InviteUserInput, actor: AdminActor) => MutationResult<AdminUser>;
  resendInvite: (userId: string, actor: AdminActor) => MutationResult<AdminInvite>;
  updateUser: (input: UpdateUserInput, actor: AdminActor) => MutationResult<AdminUser>;
  changeUserStatus: (
    userId: string,
    nextStatus: AdminUserStatus,
    actor: AdminActor
  ) => MutationResult<AdminUser>;
  createLegalEntity: (
    input: CreateLegalEntityInput,
    actor: AdminActor
  ) => MutationResult<LegalEntity>;
  updateLegalEntity: (
    input: UpdateLegalEntityInput,
    actor: AdminActor
  ) => MutationResult<LegalEntity>;
  toggleLegalEntityStatus: (
    id: string,
    status: ManagedRecordStatus,
    actor: AdminActor
  ) => MutationResult<LegalEntity>;
  createBankAccount: (
    input: CreateBankAccountInput,
    actor: AdminActor
  ) => MutationResult<BankAccount>;
  updateBankAccount: (
    input: UpdateBankAccountInput,
    actor: AdminActor
  ) => MutationResult<BankAccount>;
  toggleBankAccountStatus: (
    id: string,
    status: ManagedRecordStatus,
    actor: AdminActor
  ) => MutationResult<BankAccount>;
  createHandbook: (
    input: CreateHandbookInput,
    actor: AdminActor
  ) => MutationResult<HandbookEntry>;
  updateHandbook: (
    input: UpdateHandbookInput,
    actor: AdminActor
  ) => MutationResult<HandbookEntry>;
  toggleHandbookStatus: (
    id: string,
    status: ManagedRecordStatus,
    actor: AdminActor
  ) => MutationResult<HandbookEntry>;
  validateInviteToken: (token: string) => InviteValidationResult;
  completeInviteSetup: (token: string, password: string) => MutationResult<AdminUser>;
  listLogs: () => AuditLogEntry[];
  resetToSeed: () => void;
}

type AdminCollections = Pick<
  AdminStoreState,
  'users' | 'invites' | 'outbox' | 'legalEntities' | 'bankAccounts' | 'handbooks' | 'logs'
>;

const INVITE_EXPIRES_HOURS = 48;

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeText = (value: string) => value.trim();

const nowIso = () => new Date().toISOString();

const sortLogsByTimeDesc = (logs: AuditLogEntry[]) =>
  [...logs].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

const ensureAdminWriteAccess = (actor: AdminActor): MutationResult<never> | null => {
  if (canPerformAction(actor.role, 'admin:write')) {
    return null;
  }

  return {
    ok: false,
    error: 'Недостаточно прав для выполнения админ-действия',
  };
};

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const toCollections = (state: AdminStoreState | AdminCollections): AdminDataSnapshot => ({
  users: state.users,
  invites: state.invites,
  outbox: state.outbox,
  legalEntities: state.legalEntities,
  bankAccounts: state.bankAccounts,
  handbooks: state.handbooks,
  logs: state.logs,
});

const pushAuditLog = (
  logs: AuditLogEntry[],
  actor: string,
  action: string,
  entityType: AuditEntityType,
  entityId: string,
  summary: string,
  payload: Record<string, unknown>
): AuditLogEntry[] => {
  const nextEntry: AuditLogEntry = {
    id: createId('log'),
    timestamp: nowIso(),
    actor,
    action,
    entityType,
    entityId,
    summary,
    payload,
  };

  return sortLogsByTimeDesc([nextEntry, ...logs]);
};

const statusLabel = (status: AdminUserStatus) => {
  if (status === 'active') {
    return 'активен';
  }
  if (status === 'inactive') {
    return 'неактивен';
  }
  return 'ожидает активации';
};

const managedStatusLabel = (status: ManagedRecordStatus) =>
  status === 'active' ? 'активна' : 'в архиве';

const resolveSeedSnapshot = (): AdminDataSnapshot => {
  const stored = readAdminSnapshot();
  const snapshot = stored ?? buildSeedAdminSnapshot();

  syncAuthDirectoryUsers(
    snapshot.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
    }))
  );

  if (!stored) {
    writeAdminSnapshot(snapshot);
  }

  return snapshot;
};

const getNextEmployeeId = (users: AdminUser[]) => {
  const maxId = users.reduce((maxValue, user) => {
    const parsed = Number(user.employeeId);
    if (!Number.isFinite(parsed)) {
      return maxValue;
    }

    return Math.max(maxValue, parsed);
  }, 0);

  return String(maxId + 1).padStart(3, '0');
};

const getInviteStatus = (invite: AdminInvite): AdminInvite['status'] => {
  if (invite.status === 'used' || invite.usedAt) {
    return 'used';
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return 'expired';
  }

  return 'pending';
};

const createInviteArtifacts = (
  user: AdminUser,
  resendCount: number
): { invite: AdminInvite; mail: AdminMailMessage } => {
  const sentAt = nowIso();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRES_HOURS * 60 * 60 * 1000).toISOString();
  const token = createId('invite');
  const invite = {
    id: createId('inv'),
    userId: user.id,
    token,
    email: user.email,
    sentAt,
    expiresAt,
    resendCount,
    status: 'pending',
  } satisfies AdminInvite;

  const emailPayload = makeInviteEmailPayload(user.name, token);
  const mail = {
    id: createId('mail'),
    inviteId: invite.id,
    to: user.email,
    subject: emailPayload.subject,
    body: emailPayload.body,
    sentAt,
    inviteLink: emailPayload.inviteLink,
  } satisfies AdminMailMessage;

  return { invite, mail };
};

const withPersist = (nextState: AdminCollections) => {
  writeAdminSnapshot(nextState);
  return nextState;
};

export const useAdminStore = create<AdminStoreState>((set, get) => {
  const initialSnapshot = resolveSeedSnapshot();

  return {
    ...initialSnapshot,

    inviteUser: (input, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const name = normalizeText(input.name);
      const email = normalizeEmail(input.email);
      const employeeId = normalizeText(input.employeeId ?? '') || getNextEmployeeId(get().users);

      if (!name || !email || !employeeId) {
        return { ok: false, error: 'Заполните обязательные поля' };
      }

      const hasEmailConflict = get()
        .users.some((user) => normalizeEmail(user.email) === email);

      if (hasEmailConflict) {
        return { ok: false, error: 'Пользователь с таким email уже существует' };
      }

      const hasEmployeeConflict = get()
        .users.some((user) => normalizeText(user.employeeId) === employeeId);

      if (hasEmployeeConflict) {
        return { ok: false, error: 'Пользователь с таким табельным номером уже существует' };
      }

      const timestamp = nowIso();
      const nextUser: AdminUser = {
        id: createId('user'),
        name,
        email,
        employeeId,
        role: input.role,
        status: 'invited',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const { invite, mail } = createInviteArtifacts(nextUser, 0);

      set((state) =>
        withPersist({
          users: [nextUser, ...state.users],
          invites: [invite, ...state.invites],
          outbox: [mail, ...state.outbox],
          legalEntities: state.legalEntities,
          bankAccounts: state.bankAccounts,
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            actor.name,
            'user.invite_sent',
            'user',
            nextUser.id,
            `Отправлено приглашение пользователю ${nextUser.name}`,
            {
              email: nextUser.email,
              role: nextUser.role,
              employeeId: nextUser.employeeId,
              inviteToken: invite.token,
            }
          ),
        })
      );

      upsertAuthDirectoryUser({
        id: nextUser.id,
        name: nextUser.name,
        email: nextUser.email,
        employeeId: nextUser.employeeId,
        role: nextUser.role,
        status: 'invited',
      });

      return { ok: true, data: nextUser };
    },

    resendInvite: (userId, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const user = get().users.find((candidate) => candidate.id === userId);
      if (!user) {
        return { ok: false, error: 'Пользователь не найден' };
      }

      if (user.status === 'active') {
        return { ok: false, error: 'Пользователь уже активирован, повторный инвайт не требуется' };
      }

      const pendingInvites = get().invites.filter(
        (invite) => invite.userId === user.id && getInviteStatus(invite) === 'pending'
      );
      const resendCount = pendingInvites[0]?.resendCount ?? 0;
      const { invite, mail } = createInviteArtifacts(user, resendCount + 1);

      set((state) =>
        withPersist({
          users: state.users,
          invites: [
            invite,
            ...state.invites.map((existingInvite) => {
              if (existingInvite.userId !== user.id) {
                return existingInvite;
              }

              if (getInviteStatus(existingInvite) === 'pending') {
                return {
                  ...existingInvite,
                  status: 'expired' as const,
                };
              }

              return existingInvite;
            }),
          ],
          outbox: [mail, ...state.outbox],
          legalEntities: state.legalEntities,
          bankAccounts: state.bankAccounts,
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            actor.name,
            'user.invite_resent',
            'invite',
            invite.id,
            `Повторно отправлено приглашение пользователю ${user.name}`,
            {
              userId: user.id,
              email: user.email,
              inviteToken: invite.token,
              resendCount: invite.resendCount,
            }
          ),
        })
      );

      return { ok: true, data: invite };
    },

    updateUser: (input, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const target = get().users.find((user) => user.id === input.id);
      if (!target) {
        return { ok: false, error: 'Пользователь не найден' };
      }

      const name = normalizeText(input.name);
      const email = normalizeEmail(input.email);
      const employeeId = normalizeText(input.employeeId);

      if (!name || !email || !employeeId) {
        return { ok: false, error: 'Заполните обязательные поля' };
      }

      const hasEmailConflict = get().users.some(
        (user) => user.id !== target.id && normalizeEmail(user.email) === email
      );
      if (hasEmailConflict) {
        return { ok: false, error: 'Пользователь с таким email уже существует' };
      }

      const hasEmployeeConflict = get().users.some(
        (user) => user.id !== target.id && normalizeText(user.employeeId) === employeeId
      );
      if (hasEmployeeConflict) {
        return { ok: false, error: 'Пользователь с таким табельным номером уже существует' };
      }

      const updatedUser: AdminUser = {
        ...target,
        name,
        email,
        employeeId,
        role: input.role,
        updatedAt: nowIso(),
      };

      set((state) =>
        withPersist({
          users: state.users.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities,
          bankAccounts: state.bankAccounts,
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            actor.name,
            'user.updated',
            'user',
            updatedUser.id,
            `Обновлены данные пользователя ${updatedUser.name}`,
            {
              email: updatedUser.email,
              employeeId: updatedUser.employeeId,
              role: updatedUser.role,
            }
          ),
        })
      );

      upsertAuthDirectoryUser({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        employeeId: updatedUser.employeeId,
        role: updatedUser.role,
        status: updatedUser.status,
      });

      return { ok: true, data: updatedUser };
    },

    changeUserStatus: (userId, nextStatus, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const target = get().users.find((user) => user.id === userId);
      if (!target) {
        return { ok: false, error: 'Пользователь не найден' };
      }

      if (target.id === actor.id && nextStatus === 'inactive') {
        return { ok: false, error: 'Нельзя деактивировать собственную учетную запись' };
      }

      if (target.role === 'admin' && target.status === 'active' && nextStatus === 'inactive') {
        const activeAdminsCount = get().users.filter(
          (user) => user.role === 'admin' && user.status === 'active'
        ).length;

        if (activeAdminsCount <= 1) {
          return { ok: false, error: 'Нельзя отключить последнего активного администратора' };
        }
      }

      if (nextStatus === 'active' && !hasPasswordForUser(target.id)) {
        return {
          ok: false,
          error: 'Пользователь не установил пароль. Отправьте приглашение повторно.',
        };
      }

      const updatedUser: AdminUser = {
        ...target,
        status: nextStatus,
        updatedAt: nowIso(),
      };

      set((state) =>
        withPersist({
          users: state.users.map((user) => (user.id === target.id ? updatedUser : user)),
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities,
          bankAccounts: state.bankAccounts,
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            actor.name,
            nextStatus === 'inactive' ? 'user.deactivated' : 'user.reactivated',
            'user',
            target.id,
            `Статус пользователя ${target.name}: ${statusLabel(nextStatus)}`,
            {
              previousStatus: target.status,
              nextStatus,
            }
          ),
        })
      );

      setAuthDirectoryStatus(target.id, nextStatus);

      return { ok: true, data: updatedUser };
    },

    createLegalEntity: (input, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const name = normalizeText(input.name);
      const inn = normalizeText(input.inn);
      const type = normalizeText(input.type);

      if (!name || !inn || !type) {
        return { ok: false, error: 'Заполните обязательные поля' };
      }

      if (get().legalEntities.some((entity) => entity.inn === inn)) {
        return { ok: false, error: 'Юрлицо с таким ИНН уже существует' };
      }

      const timestamp = nowIso();
      const entity: LegalEntity = {
        id: createId('le'),
        name,
        inn,
        type,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      set((state) =>
        withPersist({
          users: state.users,
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: [entity, ...state.legalEntities],
          bankAccounts: state.bankAccounts,
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            actor.name,
            'legal_entity.created',
            'legal_entity',
            entity.id,
            `Создано юрлицо ${entity.name}`,
            { inn: entity.inn, type: entity.type }
          ),
        })
      );

      return { ok: true, data: entity };
    },

    updateLegalEntity: (input, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const target = get().legalEntities.find((entity) => entity.id === input.id);
      if (!target) {
        return { ok: false, error: 'Юрлицо не найдено' };
      }

      const name = normalizeText(input.name);
      const inn = normalizeText(input.inn);
      const type = normalizeText(input.type);

      if (!name || !inn || !type) {
        return { ok: false, error: 'Заполните обязательные поля' };
      }

      const hasInnConflict = get().legalEntities.some(
        (entity) => entity.id !== input.id && entity.inn === inn
      );

      if (hasInnConflict) {
        return { ok: false, error: 'Юрлицо с таким ИНН уже существует' };
      }

      const updated: LegalEntity = {
        ...target,
        name,
        inn,
        type,
        updatedAt: nowIso(),
      };

      set((state) =>
        withPersist({
          users: state.users,
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities.map((entity) =>
            entity.id === updated.id ? updated : entity
          ),
          bankAccounts: state.bankAccounts,
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            actor.name,
            'legal_entity.updated',
            'legal_entity',
            updated.id,
            `Обновлено юрлицо ${updated.name}`,
            { inn: updated.inn, type: updated.type }
          ),
        })
      );

      return { ok: true, data: updated };
    },

    toggleLegalEntityStatus: (id, status, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const target = get().legalEntities.find((entity) => entity.id === id);
      if (!target) {
        return { ok: false, error: 'Юрлицо не найдено' };
      }

      const updated: LegalEntity = {
        ...target,
        status,
        updatedAt: nowIso(),
      };

      set((state) =>
        withPersist({
          users: state.users,
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities.map((entity) =>
            entity.id === id ? updated : entity
          ),
          bankAccounts: state.bankAccounts,
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            actor.name,
            status === 'archived' ? 'legal_entity.archived' : 'legal_entity.restored',
            'legal_entity',
            updated.id,
            `Юрлицо ${updated.name} теперь ${managedStatusLabel(status)}`,
            { status }
          ),
        })
      );

      return { ok: true, data: updated };
    },

    createBankAccount: (input, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const bankName = normalizeText(input.bankName);
      const accountNumber = normalizeText(input.accountNumber);
      const ownerEntityId = normalizeText(input.ownerEntityId);
      const currency = normalizeText(input.currency);
      const balance = Number(input.balance);

      if (!bankName || !accountNumber || !ownerEntityId || !currency) {
        return { ok: false, error: 'Заполните обязательные поля' };
      }

      if (!Number.isFinite(balance)) {
        return { ok: false, error: 'Некорректный остаток' };
      }

      const owner = get().legalEntities.find((entity) => entity.id === ownerEntityId);
      if (!owner) {
        return { ok: false, error: 'Юрлицо-владелец не найдено' };
      }

      if (get().bankAccounts.some((account) => account.accountNumber === accountNumber)) {
        return { ok: false, error: 'Счет с таким номером уже существует' };
      }

      const timestamp = nowIso();
      const account: BankAccount = {
        id: createId('ba'),
        bankName,
        accountNumber,
        ownerEntityId,
        currency,
        balance,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      set((state) =>
        withPersist({
          users: state.users,
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities,
          bankAccounts: [account, ...state.bankAccounts],
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            actor.name,
            'bank_account.created',
            'bank_account',
            account.id,
            `Создан банковский счет ${account.accountNumber}`,
            {
              ownerEntityId: account.ownerEntityId,
              currency: account.currency,
              balance: account.balance,
            }
          ),
        })
      );

      return { ok: true, data: account };
    },

    updateBankAccount: (input, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const target = get().bankAccounts.find((account) => account.id === input.id);
      if (!target) {
        return { ok: false, error: 'Банковский счет не найден' };
      }

      const bankName = normalizeText(input.bankName);
      const accountNumber = normalizeText(input.accountNumber);
      const ownerEntityId = normalizeText(input.ownerEntityId);
      const currency = normalizeText(input.currency);
      const balance = Number(input.balance);

      if (!bankName || !accountNumber || !ownerEntityId || !currency) {
        return { ok: false, error: 'Заполните обязательные поля' };
      }

      if (!Number.isFinite(balance)) {
        return { ok: false, error: 'Некорректный остаток' };
      }

      const owner = get().legalEntities.find((entity) => entity.id === ownerEntityId);
      if (!owner) {
        return { ok: false, error: 'Юрлицо-владелец не найдено' };
      }

      const hasAccountConflict = get().bankAccounts.some(
        (account) => account.id !== input.id && account.accountNumber === accountNumber
      );
      if (hasAccountConflict) {
        return { ok: false, error: 'Счет с таким номером уже существует' };
      }

      const updated: BankAccount = {
        ...target,
        bankName,
        accountNumber,
        ownerEntityId,
        currency,
        balance,
        updatedAt: nowIso(),
      };

      set((state) =>
        withPersist({
          users: state.users,
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities,
          bankAccounts: state.bankAccounts.map((account) =>
            account.id === updated.id ? updated : account
          ),
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            actor.name,
            'bank_account.updated',
            'bank_account',
            updated.id,
            `Обновлен банковский счет ${updated.accountNumber}`,
            {
              ownerEntityId: updated.ownerEntityId,
              currency: updated.currency,
              balance: updated.balance,
            }
          ),
        })
      );

      return { ok: true, data: updated };
    },

    toggleBankAccountStatus: (id, status, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const target = get().bankAccounts.find((account) => account.id === id);
      if (!target) {
        return { ok: false, error: 'Банковский счет не найден' };
      }

      const updated: BankAccount = {
        ...target,
        status,
        updatedAt: nowIso(),
      };

      set((state) =>
        withPersist({
          users: state.users,
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities,
          bankAccounts: state.bankAccounts.map((account) =>
            account.id === id ? updated : account
          ),
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            actor.name,
            status === 'archived' ? 'bank_account.archived' : 'bank_account.restored',
            'bank_account',
            updated.id,
            `Банковский счет ${updated.accountNumber} теперь ${managedStatusLabel(status)}`,
            { status }
          ),
        })
      );

      return { ok: true, data: updated };
    },

    createHandbook: (input, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const name = normalizeText(input.name);
      const category = normalizeText(input.category);

      if (!name || !category) {
        return { ok: false, error: 'Заполните обязательные поля' };
      }

      const hasConflict = get().handbooks.some(
        (handbook) =>
          handbook.name.toLowerCase() === name.toLowerCase() &&
          handbook.category.toLowerCase() === category.toLowerCase()
      );

      if (hasConflict) {
        return { ok: false, error: 'Такая запись справочника уже существует' };
      }

      const timestamp = nowIso();
      const handbook: HandbookEntry = {
        id: createId('hb'),
        name,
        category,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      set((state) =>
        withPersist({
          users: state.users,
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities,
          bankAccounts: state.bankAccounts,
          handbooks: [handbook, ...state.handbooks],
          logs: pushAuditLog(
            state.logs,
            actor.name,
            'handbook.created',
            'handbook',
            handbook.id,
            `Создана запись справочника ${handbook.name}`,
            { category: handbook.category }
          ),
        })
      );

      return { ok: true, data: handbook };
    },

    updateHandbook: (input, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const target = get().handbooks.find((handbook) => handbook.id === input.id);
      if (!target) {
        return { ok: false, error: 'Запись справочника не найдена' };
      }

      const name = normalizeText(input.name);
      const category = normalizeText(input.category);

      if (!name || !category) {
        return { ok: false, error: 'Заполните обязательные поля' };
      }

      const hasConflict = get().handbooks.some(
        (handbook) =>
          handbook.id !== input.id &&
          handbook.name.toLowerCase() === name.toLowerCase() &&
          handbook.category.toLowerCase() === category.toLowerCase()
      );

      if (hasConflict) {
        return { ok: false, error: 'Такая запись справочника уже существует' };
      }

      const updated: HandbookEntry = {
        ...target,
        name,
        category,
        updatedAt: nowIso(),
      };

      set((state) =>
        withPersist({
          users: state.users,
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities,
          bankAccounts: state.bankAccounts,
          handbooks: state.handbooks.map((handbook) =>
            handbook.id === updated.id ? updated : handbook
          ),
          logs: pushAuditLog(
            state.logs,
            actor.name,
            'handbook.updated',
            'handbook',
            updated.id,
            `Обновлена запись справочника ${updated.name}`,
            { category: updated.category }
          ),
        })
      );

      return { ok: true, data: updated };
    },

    toggleHandbookStatus: (id, status, actor) => {
      const accessError = ensureAdminWriteAccess(actor);
      if (accessError) {
        return accessError;
      }

      const target = get().handbooks.find((handbook) => handbook.id === id);
      if (!target) {
        return { ok: false, error: 'Запись справочника не найдена' };
      }

      const updated: HandbookEntry = {
        ...target,
        status,
        updatedAt: nowIso(),
      };

      set((state) =>
        withPersist({
          users: state.users,
          invites: state.invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities,
          bankAccounts: state.bankAccounts,
          handbooks: state.handbooks.map((handbook) =>
            handbook.id === id ? updated : handbook
          ),
          logs: pushAuditLog(
            state.logs,
            actor.name,
            status === 'archived' ? 'handbook.archived' : 'handbook.restored',
            'handbook',
            updated.id,
            `Запись справочника ${updated.name} теперь ${managedStatusLabel(status)}`,
            { status }
          ),
        })
      );

      return { ok: true, data: updated };
    },

    validateInviteToken: (token) => {
      const normalized = normalizeText(token);
      if (!normalized) {
        return { status: 'invalid' };
      }

      const invite = get().invites.find((candidate) => candidate.token === normalized);
      if (!invite) {
        return { status: 'invalid' };
      }

      const resolvedStatus = getInviteStatus(invite);
      const user = get().users.find((candidate) => candidate.id === invite.userId);

      if (!user) {
        return { status: 'invalid' };
      }

      if (resolvedStatus === 'pending') {
        return {
          status: 'valid',
          user,
          invite: {
            ...invite,
            status: 'pending',
          },
        };
      }

      return {
        status: resolvedStatus,
        user,
        invite: {
          ...invite,
          status: resolvedStatus,
        },
      };
    },

    completeInviteSetup: (token, password) => {
      const normalizedToken = normalizeText(token);
      const normalizedPassword = normalizeText(password);

      if (!normalizedToken) {
        return { ok: false, error: 'Некорректная ссылка приглашения' };
      }

      if (!hasMinPasswordLength(normalizedPassword)) {
        return { ok: false, error: MIN_PASSWORD_ERROR_MESSAGE };
      }

      const validation = get().validateInviteToken(normalizedToken);
      if (validation.status !== 'valid' || !validation.invite || !validation.user) {
        if (validation.status === 'expired' && validation.invite) {
          set((state) =>
            withPersist({
              users: state.users,
              invites: state.invites.map((invite) =>
                invite.id === validation.invite?.id
                  ? {
                      ...invite,
                      status: 'expired',
                    }
                  : invite
              ),
              outbox: state.outbox,
              legalEntities: state.legalEntities,
              bankAccounts: state.bankAccounts,
              handbooks: state.handbooks,
              logs: state.logs,
            })
          );
        }

        if (validation.status === 'used') {
          return { ok: false, error: 'Эта ссылка уже использована' };
        }

        if (validation.status === 'expired') {
          return { ok: false, error: 'Срок действия ссылки истек' };
        }

        return { ok: false, error: 'Ссылка приглашения недействительна' };
      }

      const updatedUser: AdminUser = {
        ...validation.user,
        status: 'active',
        updatedAt: nowIso(),
      };

      set((state) => {
        const invites: AdminInvite[] = state.invites.map((invite) => {
          if (invite.id !== validation.invite?.id) {
            return invite;
          }

          return {
            ...invite,
            status: 'used' as const,
            usedAt: nowIso(),
          };
        });

        return withPersist({
          users: state.users.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
          invites,
          outbox: state.outbox,
          legalEntities: state.legalEntities,
          bankAccounts: state.bankAccounts,
          handbooks: state.handbooks,
          logs: pushAuditLog(
            state.logs,
            updatedUser.name,
            'user.password_set',
            'setup_password',
            updatedUser.id,
            `Пользователь ${updatedUser.name} установил пароль и активировал учетную запись`,
            {
              inviteId: validation.invite?.id,
              email: updatedUser.email,
            }
          ),
        });
      });

      setAuthDirectoryPassword(updatedUser.id, normalizedPassword);
      setAuthDirectoryStatus(updatedUser.id, 'active');

      return { ok: true, data: updatedUser };
    },

    listLogs: () => sortLogsByTimeDesc(get().logs),

    resetToSeed: () => {
      const seed = buildSeedAdminSnapshot();
      clearAdminSnapshot();
      writeAdminSnapshot(seed);

      syncAuthDirectoryUsers(
        seed.users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl,
        }))
      );

      set(() => ({
        ...seed,
      }));
    },
  };
});

export const selectOwnerEntityNameById = (
  legalEntities: LegalEntity[],
  ownerEntityId: string
) => legalEntities.find((entity) => entity.id === ownerEntityId)?.name ?? 'Не найдено';

export const getAdminCollectionsSnapshot = (): AdminDataSnapshot =>
  toCollections(useAdminStore.getState());
