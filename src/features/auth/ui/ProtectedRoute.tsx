import type { FC, ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@/entities/user/model/types';
import { useAuthStore } from '@/features/auth/model/authStore';
import { resolveRouteAccess } from '@/features/auth/model/routeAccess';

interface ProtectedRouteProps {
  children: ReactElement;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const access = resolveRouteAccess(user, allowedRoles);

  if (!access.isAllowed) {
    return (
      <Navigate
        to={access.redirectTo ?? '/dashboard'}
        replace
        state={
          access.forbiddenNotice
            ? {
                forbiddenNotice: access.forbiddenNotice,
                forbiddenFrom: location.pathname,
              }
            : undefined
        }
      />
    );
  }

  return children;
};
