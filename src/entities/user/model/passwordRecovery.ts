import {
  hasMinPasswordLength,
  isValidEmail,
  MIN_PASSWORD_ERROR_MESSAGE,
  normalizeEmail,
} from '@/shared/lib/authValidation';
import {
  listAuthDirectoryUsers,
  setAuthDirectoryPassword,
} from './mockAuthDirectory';

export const PASSWORD_RECOVERY_STORAGE_KEY = 'crm-finance-password-recovery';

const PASSWORD_RECOVERY_STORAGE_VERSION = 1;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

type RecoveryRequestStatus = 'pending' | 'used' | 'expired';

interface PasswordRecoveryRequest {
  email: string;
  code: string;
  requestedAt: string;
  expiresAt: string;
  status: RecoveryRequestStatus;
  completedAt?: string;
}

interface PasswordRecoveryStorage {
  version: number;
  requests: PasswordRecoveryRequest[];
}

interface KeyValueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const memoryStorage = (() => {
  const state = new Map<string, string>();
  return {
    getItem: (key: string) => state.get(key) ?? null,
    setItem: (key: string, value: string) => {
      state.set(key, value);
    },
    removeItem: (key: string) => {
      state.delete(key);
    },
  } satisfies KeyValueStorage;
})();

const getStorage = (): KeyValueStorage => {
  if (typeof window === 'undefined') {
    return memoryStorage;
  }

  try {
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
};

const nowIso = () => new Date().toISOString();

const parseDate = (value: string) => new Date(value).getTime();

const createRecoveryCode = () =>
  String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');

const readRequests = (): PasswordRecoveryRequest[] => {
  try {
    const raw = getStorage().getItem(PASSWORD_RECOVERY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PasswordRecoveryStorage;
    if (!parsed || parsed.version !== PASSWORD_RECOVERY_STORAGE_VERSION) {
      return [];
    }

    if (!Array.isArray(parsed.requests)) {
      return [];
    }

    return parsed.requests;
  } catch {
    return [];
  }
};

let requestsState = readRequests();

const persistRequests = () => {
  const payload: PasswordRecoveryStorage = {
    version: PASSWORD_RECOVERY_STORAGE_VERSION,
    requests: requestsState,
  };

  try {
    getStorage().setItem(PASSWORD_RECOVERY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignored
  }
};

const resolveActiveUserId = (email: string): { userId?: string; error?: string } => {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return { error: 'Введите корректный email' };
  }

  const user = listAuthDirectoryUsers().find(
    (candidate) => normalizeEmail(candidate.email) === normalizedEmail
  );

  if (!user) {
    return { error: 'Пользователь с таким email не найден' };
  }

  if (user.status !== 'active') {
    return { error: 'Восстановление доступно только для активных пользователей' };
  }

  return { userId: user.id };
};

const getLatestRequestByEmail = (email: string) =>
  requestsState.find((request) => request.email === email);

const expireRequest = (target: PasswordRecoveryRequest) => {
  requestsState = requestsState.map((request) =>
    request.email === target.email && request.requestedAt === target.requestedAt
      ? { ...request, status: 'expired' }
      : request
  );
};

export const requestPasswordReset = (
  email: string
): { ok: boolean; error?: string; debugCode?: string; expiresAt?: string } => {
  const normalizedEmail = normalizeEmail(email);
  const userResolution = resolveActiveUserId(normalizedEmail);

  if (!userResolution.userId) {
    return { ok: false, error: userResolution.error };
  }

  const code = createRecoveryCode();
  const requestedAt = nowIso();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();

  requestsState = requestsState.filter(
    (request) => !(request.email === normalizedEmail && request.status === 'pending')
  );

  requestsState = [
    {
      email: normalizedEmail,
      code,
      requestedAt,
      expiresAt,
      status: 'pending',
    },
    ...requestsState,
  ];

  persistRequests();

  return {
    ok: true,
    debugCode: code,
    expiresAt,
  };
};

export const confirmPasswordReset = ({
  email,
  code,
  nextPassword,
}: {
  email: string;
  code: string;
  nextPassword: string;
}): { ok: boolean; error?: string } => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();
  const normalizedPassword = nextPassword.trim();
  const userResolution = resolveActiveUserId(normalizedEmail);

  if (!userResolution.userId) {
    return { ok: false, error: userResolution.error };
  }

  if (!/^\d{6}$/.test(normalizedCode)) {
    return { ok: false, error: 'Код должен содержать 6 цифр' };
  }

  if (!hasMinPasswordLength(normalizedPassword)) {
    return { ok: false, error: MIN_PASSWORD_ERROR_MESSAGE };
  }

  const recoveryRequest = getLatestRequestByEmail(normalizedEmail);

  if (!recoveryRequest) {
    return { ok: false, error: 'Запрос на восстановление не найден. Отправьте код повторно' };
  }

  if (recoveryRequest.status === 'used') {
    return { ok: false, error: 'Код уже использован. Запросите новый код' };
  }

  if (recoveryRequest.status === 'expired' || parseDate(recoveryRequest.expiresAt) <= Date.now()) {
    expireRequest(recoveryRequest);
    persistRequests();
    return { ok: false, error: 'Срок действия кода истек. Запросите новый код' };
  }

  if (recoveryRequest.code !== normalizedCode) {
    return { ok: false, error: 'Неверный код подтверждения' };
  }

  const hasUpdatedPassword = setAuthDirectoryPassword(
    userResolution.userId,
    normalizedPassword
  );

  if (!hasUpdatedPassword) {
    return { ok: false, error: 'Не удалось обновить пароль' };
  }

  requestsState = requestsState.map((request) =>
    request.email === recoveryRequest.email &&
    request.requestedAt === recoveryRequest.requestedAt
      ? {
          ...request,
          status: 'used',
          completedAt: nowIso(),
        }
      : request
  );
  persistRequests();

  return { ok: true };
};

export const clearPasswordRecoveryForTests = () => {
  requestsState = [];
  try {
    getStorage().removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  } catch {
    // ignored
  }
};
