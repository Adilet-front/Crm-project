import { FORBIDDEN_NOTICE_MESSAGE } from '@/entities/user/model/access';
import { USER_ROLES, type AuthUser, type UserRole } from '@/entities/user/model/types';

export interface RouteAccessResult {
  isAllowed: boolean;
  redirectTo?: string;
  forbiddenNotice?: string;
}

export const resolveRouteAccess = (
  user: AuthUser | null,
  allowedRoles?: UserRole[]
): RouteAccessResult => {
  if (!user) {
    return {
      isAllowed: false,
      redirectTo: '/login',
    };
  }

  if (!USER_ROLES.includes(user.role)) {
    return {
      isAllowed: false,
      redirectTo: '/login',
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      isAllowed: false,
      redirectTo: '/dashboard',
      forbiddenNotice: FORBIDDEN_NOTICE_MESSAGE,
    };
  }

  return { isAllowed: true };
};
