import { describe, expect, it } from 'vitest';
import { FORBIDDEN_NOTICE_MESSAGE } from '@/entities/user/model/access';
import type { AuthUser } from '@/entities/user/model/types';
import { resolveRouteAccess } from '@/features/auth/model/routeAccess';

describe('route access resolver', () => {
  const pmUser: AuthUser = {
    id: 'u_pm',
    name: 'PM User',
    identifier: '20011',
    role: 'pm',
  };

  it('redirects anonymous user to login', () => {
    expect(resolveRouteAccess(null, ['pm', 'financial_manager'])).toEqual({
      isAllowed: false,
      redirectTo: '/login',
    });
  });

  it('redirects forbidden role to dashboard with notice', () => {
    expect(resolveRouteAccess(pmUser, ['financial_manager'])).toEqual({
      isAllowed: false,
      redirectTo: '/dashboard',
      forbiddenNotice: FORBIDDEN_NOTICE_MESSAGE,
    });
  });

  it('allows role when it is in allowedRoles list', () => {
    expect(resolveRouteAccess(pmUser, ['pm'])).toEqual({ isAllowed: true });
  });
});
