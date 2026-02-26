import type { AuthUser, UserRole } from './types';
import {
  hasMinPasswordLength,
  isValidEmail,
  normalizeEmail,
} from '@/shared/lib/authValidation';

export type AuthDirectoryStatus = 'invited' | 'active' | 'inactive';

export interface AuthDirectoryUser {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: UserRole;
  status: AuthDirectoryStatus;
  password?: string;
  avatarUrl?: string;
  updatedAt: string;
}

interface AuthDirectoryStorage {
  version: number;
  users: AuthDirectoryUser[];
}

interface UpsertAuthDirectoryUserInput {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: UserRole;
  status: AuthDirectoryStatus;
  avatarUrl?: string;
}

const STORAGE_KEY = 'crm-finance-auth-directory';
const STORAGE_VERSION = 1;

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

const DEFAULT_USERS: AuthDirectoryUser[] = [
  {
    id: 'u_owner',
    name: 'Александр Смирнов',
    email: 'owner@company.com',
    employeeId: '001',
    role: 'owner',
    status: 'active',
    password: 'password',
    updatedAt: '2026-02-26T10:00:00.000Z',
  },
  {
    id: 'u_fin',
    name: 'Иван Петров',
    email: 'finmanager@company.com',
    employeeId: '002',
    role: 'financial_manager',
    status: 'active',
    password: 'password',
    updatedAt: '2026-02-26T10:00:00.000Z',
  },
  {
    id: 'u_pm',
    name: 'Елена Соколова',
    email: 'pm@company.com',
    employeeId: '003',
    role: 'pm',
    status: 'active',
    password: 'password',
    updatedAt: '2026-02-26T10:00:00.000Z',
  },
  {
    id: 'u_admin',
    name: 'Дмитрий Tech',
    email: 'admin@company.com',
    employeeId: '004',
    role: 'admin',
    status: 'active',
    password: 'password',
    updatedAt: '2026-02-26T10:00:00.000Z',
  },
  {
    id: 'u_invited_anna',
    name: 'Анна Кузнецова',
    email: 'anna.k@company.com',
    employeeId: '005',
    role: 'financial_manager',
    status: 'invited',
    updatedAt: '2026-02-26T10:00:00.000Z',
  },
];

const normalizeEmployeeId = (value: string) => value.trim();

const cloneUsers = (users: AuthDirectoryUser[]) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(users);
  }

  return JSON.parse(JSON.stringify(users)) as AuthDirectoryUser[];
};

const readStoredUsers = (): AuthDirectoryUser[] => {
  try {
    const raw = getStorage().getItem(STORAGE_KEY);
    if (!raw) {
      return cloneUsers(DEFAULT_USERS);
    }

    const parsed = JSON.parse(raw) as AuthDirectoryStorage;
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.users)) {
      return cloneUsers(DEFAULT_USERS);
    }

    return parsed.users;
  } catch {
    return cloneUsers(DEFAULT_USERS);
  }
};

let usersState: AuthDirectoryUser[] = readStoredUsers();

const persistState = () => {
  const payload: AuthDirectoryStorage = {
    version: STORAGE_VERSION,
    users: usersState,
  };

  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignored
  }
};

const toAuthUser = (record: AuthDirectoryUser, identifier: string): AuthUser => ({
  id: record.id,
  name: record.name,
  email: record.email,
  employeeId: record.employeeId,
  role: record.role,
  avatarUrl: record.avatarUrl,
  identifier,
});

const findByEmail = (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return null;
  }

  return usersState.find((record) => normalizeEmail(record.email) === normalizedEmail) ?? null;
};

const mapStatusToDirectory = (status: AuthDirectoryStatus): AuthDirectoryStatus => status;

export const listAuthDirectoryUsers = (): AuthDirectoryUser[] => cloneUsers(usersState);

export const hasPasswordForUser = (userId: string): boolean => {
  const user = usersState.find((record) => record.id === userId);
  return Boolean(user?.password);
};

export const findAuthUserByCredentials = (
  identifier: string,
  password: string
): AuthUser | null => {
  const normalizedEmail = normalizeEmail(identifier);
  if (!isValidEmail(normalizedEmail) || !hasMinPasswordLength(password)) {
    return null;
  }

  const matched = findByEmail(normalizedEmail);

  if (!matched) {
    return null;
  }

  if (matched.status !== 'active') {
    return null;
  }

  if (!matched.password || matched.password !== password) {
    return null;
  }

  return toAuthUser(matched, normalizedEmail);
};

export const upsertAuthDirectoryUser = (
  input: UpsertAuthDirectoryUserInput
): AuthDirectoryUser => {
  const timestamp = nowIso();
  const nextUser = {
    ...input,
    email: normalizeEmail(input.email),
    employeeId: normalizeEmployeeId(input.employeeId),
    status: mapStatusToDirectory(input.status),
    updatedAt: timestamp,
  } satisfies AuthDirectoryUser;

  const existingIndex = usersState.findIndex((record) => record.id === input.id);

  if (existingIndex === -1) {
    usersState = [...usersState, nextUser];
    persistState();
    return nextUser;
  }

  const existing = usersState[existingIndex];
  const merged = {
    ...existing,
    ...nextUser,
    password: existing.password,
  } satisfies AuthDirectoryUser;

  usersState = usersState.map((record) => (record.id === input.id ? merged : record));
  persistState();

  return merged;
};

export const setAuthDirectoryPassword = (userId: string, password: string): boolean => {
  let found = false;

  usersState = usersState.map((record) => {
    if (record.id !== userId) {
      return record;
    }

    found = true;
    return {
      ...record,
      password,
      status: 'active',
      updatedAt: nowIso(),
    };
  });

  if (found) {
    persistState();
  }

  return found;
};

export const setAuthDirectoryStatus = (
  userId: string,
  status: AuthDirectoryStatus
): boolean => {
  let found = false;

  usersState = usersState.map((record) => {
    if (record.id !== userId) {
      return record;
    }

    found = true;
    return {
      ...record,
      status,
      updatedAt: nowIso(),
    };
  });

  if (found) {
    persistState();
  }

  return found;
};

export const syncAuthDirectoryUsers = (users: UpsertAuthDirectoryUserInput[]) => {
  users.forEach((user) => {
    upsertAuthDirectoryUser(user);
  });
};

export const clearAuthDirectoryStorage = () => {
  usersState = cloneUsers(DEFAULT_USERS);
  try {
    getStorage().removeItem(STORAGE_KEY);
  } catch {
    // ignored
  }
  persistState();
};

export const resetAuthDirectoryForTests = (users?: AuthDirectoryUser[]) => {
  usersState = cloneUsers(users ?? DEFAULT_USERS);
  persistState();
};
