import type { AdminDataSnapshot, AdminPersistedSnapshot } from './types';

const ADMIN_STORAGE_KEY = 'crm-finance-admin-snapshot';
const ADMIN_STORAGE_VERSION = 1;

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

export const readAdminSnapshot = (): AdminDataSnapshot | null => {
  try {
    const raw = getStorage().getItem(ADMIN_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AdminPersistedSnapshot;
    if (!parsed || parsed.version !== ADMIN_STORAGE_VERSION || !parsed.data) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
};

export const writeAdminSnapshot = (data: AdminDataSnapshot): void => {
  const payload: AdminPersistedSnapshot = {
    version: ADMIN_STORAGE_VERSION,
    data,
  };

  try {
    getStorage().setItem(ADMIN_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignored: private mode or storage limits
  }
};

export const clearAdminSnapshot = (): void => {
  try {
    getStorage().removeItem(ADMIN_STORAGE_KEY);
  } catch {
    // ignored: private mode or storage limits
  }
};

export const ADMIN_STORAGE_META = {
  key: ADMIN_STORAGE_KEY,
  version: ADMIN_STORAGE_VERSION,
};
