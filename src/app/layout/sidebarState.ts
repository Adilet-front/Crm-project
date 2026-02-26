export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'crm-finance-sidebar-collapsed';

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
};

export const readSidebarCollapsed = () => {
  try {
    const storage = getStorage();
    if (!storage) {
      return false;
    }

    const rawValue = storage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (rawValue === 'true') {
      return true;
    }

    if (rawValue === 'false' || rawValue === null) {
      return false;
    }

    return false;
  } catch {
    return false;
  }
};

export const writeSidebarCollapsed = (collapsed: boolean) => {
  try {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    storage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // no-op: storage may be blocked
  }
};
