import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readSidebarCollapsed,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  writeSidebarCollapsed,
} from '@/app/layout/sidebarState';

interface KeyValueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const createStorageMock = (initial: Record<string, string> = {}): KeyValueStorage => {
  const state = new Map<string, string>(Object.entries(initial));

  return {
    getItem: (key) => state.get(key) ?? null,
    setItem: (key, value) => {
      state.set(key, value);
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

describe('sidebar state persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { window?: unknown }).window;
  });

  it('returns false when no persisted value exists', () => {
    setWindowWithStorage(createStorageMock());

    expect(readSidebarCollapsed()).toBe(false);
  });

  it('returns true when persisted value is "true"', () => {
    setWindowWithStorage(createStorageMock({ [SIDEBAR_COLLAPSED_STORAGE_KEY]: 'true' }));

    expect(readSidebarCollapsed()).toBe(true);
  });

  it('falls back to false on malformed persisted value', () => {
    setWindowWithStorage(createStorageMock({ [SIDEBAR_COLLAPSED_STORAGE_KEY]: 'unexpected' }));

    expect(readSidebarCollapsed()).toBe(false);
  });

  it('falls back to false when storage throws on read', () => {
    const brokenStorage: KeyValueStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
    };

    setWindowWithStorage(brokenStorage);

    expect(readSidebarCollapsed()).toBe(false);
  });

  it('writes boolean value as string to localStorage', () => {
    const storage = createStorageMock();
    const setItemSpy = vi.spyOn(storage, 'setItem');

    setWindowWithStorage(storage);
    writeSidebarCollapsed(true);

    expect(setItemSpy).toHaveBeenCalledWith(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true');
  });

  it('does not throw when localStorage is unavailable', () => {
    delete (globalThis as typeof globalThis & { window?: unknown }).window;

    expect(() => writeSidebarCollapsed(true)).not.toThrow();
  });
});
