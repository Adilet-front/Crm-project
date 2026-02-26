import { create } from 'zustand';
import type { AuthUser, UserRole } from '@/entities/user/model/types';
import { useNotificationCenterStore } from '@/shared/ui/shadcn/notificationCenterStore';

const AUTH_STORAGE_KEY = 'crm-finance-auth';

interface LoginPayload {
  id?: string;
  identifier: string;
  role: UserRole;
  name: string;
  email?: string;
  employeeId?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  login: (payload: LoginPayload) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const getPersistedUser = (): AuthUser | null => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

const persistUser = (user: AuthUser | null) => {
  try {
    if (!user) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // no-op: storage may be blocked
  }
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: typeof window !== 'undefined' ? getPersistedUser() : null,
  login: ({ id, identifier, role, name, email, employeeId, avatarUrl }) => {
    const nextUser: AuthUser = {
      id: id ?? `u_${Date.now()}`,
      identifier,
      role,
      name,
      email,
      employeeId,
      avatarUrl,
    };

    persistUser(nextUser);
    set({ user: nextUser });
  },
  logout: () => {
    const currentRole = get().user?.role;
    if (currentRole) {
      useNotificationCenterStore.getState().clearByRole(currentRole);
    }

    persistUser(null);
    set({ user: null });
  },
  hasRole: (roles) => {
    const currentRole = get().user?.role;
    return currentRole ? roles.includes(currentRole) : false;
  },
}));
