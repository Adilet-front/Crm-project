import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const AUTH_STORAGE_KEY = 'crm-finance-auth';

interface KeyValueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const createStorageMock = (): KeyValueStorage => {
  const state = new Map<string, string>();

  return {
    getItem: (key) => state.get(key) ?? null,
    setItem: (key, value) => {
      state.set(key, value);
    },
    removeItem: (key) => {
      state.delete(key);
    },
  };
};

const setWindowWithStorage = (localStorage: KeyValueStorage) => {
  (
    globalThis as typeof globalThis & {
      window: { localStorage: KeyValueStorage };
    }
  ).window = { localStorage };
};

describe('auth store persistence', () => {
  let storage: KeyValueStorage;

  beforeEach(() => {
    vi.resetModules();
    storage = createStorageMock();
    setWindowWithStorage(storage);
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { window?: unknown }).window;
  });

  it('writes user to localStorage after login and restores it on re-init', async () => {
    const { useAuthStore } = await import('@/features/auth/model/authStore');

    useAuthStore.getState().login({
      id: 'u_admin',
      identifier: '001',
      role: 'admin',
      name: 'Admin User',
      email: 'admin@company.com',
      employeeId: '001',
    });

    const rawPersistedUser = storage.getItem(AUTH_STORAGE_KEY);
    expect(rawPersistedUser).toBeTruthy();

    const parsedPersistedUser = JSON.parse(rawPersistedUser!);
    expect(parsedPersistedUser).toMatchObject({
      id: 'u_admin',
      identifier: '001',
      role: 'admin',
      name: 'Admin User',
    });

    vi.resetModules();
    setWindowWithStorage(storage);

    const { useAuthStore: rehydratedStore } = await import('@/features/auth/model/authStore');
    expect(rehydratedStore.getState().user).toMatchObject({
      id: 'u_admin',
      identifier: '001',
      role: 'admin',
      name: 'Admin User',
    });
  });

  it('clears localStorage and user state on logout', async () => {
    const { useAuthStore } = await import('@/features/auth/model/authStore');

    useAuthStore.getState().login({
      id: 'u_pm',
      identifier: '003',
      role: 'pm',
      name: 'PM User',
    });

    useAuthStore.getState().logout();

    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
