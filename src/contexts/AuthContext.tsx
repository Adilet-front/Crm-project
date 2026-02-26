import { useAuthStore } from '@/features/auth/model/authStore';
import {
  findAuthUserByCredentials,
  type AuthDirectoryUser,
  type AuthDirectoryStatus,
} from '@/entities/user/model/mockAuthDirectory';
import type { AuthUser, UserRole } from '@/entities/user/model/types';
import { hasMinPasswordLength, isValidEmail, normalizeEmail } from '@/shared/lib/authValidation';

export type { UserRole } from '@/entities/user/model/types';
export type { AuthDirectoryUser, AuthDirectoryStatus };

interface AuthContextLike {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export function useAuth(): AuthContextLike {
  const user = useAuthStore((state) => state.user);
  const loginToStore = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  const login = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail) || !hasMinPasswordLength(password)) {
      return false;
    }

    await delay(350);

    const matchedUser = findAuthUserByCredentials(normalizedEmail, password);

    if (!matchedUser) {
      return false;
    }

    loginToStore({
      id: matchedUser.id,
      identifier: matchedUser.identifier,
      role: matchedUser.role as UserRole,
      name: matchedUser.name,
      email: matchedUser.email,
      employeeId: matchedUser.employeeId,
      avatarUrl: matchedUser.avatarUrl,
    });

    return true;
  };

  return {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
