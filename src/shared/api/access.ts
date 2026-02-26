import { canPerformAction, type AccessAction } from '@/entities/user/model/access';
import type { AuthUser, UserRole } from '@/entities/user/model/types';
import { ForbiddenError } from './errors';

export interface ApiActor {
  identifier: string;
  role: UserRole;
}

export const toApiActor = (user: AuthUser | null): ApiActor => {
  if (!user) {
    throw new ForbiddenError('Требуется авторизация');
  }

  return {
    identifier: user.identifier,
    role: user.role,
  };
};

export const assertApiAccess = (actor: ApiActor, action: AccessAction) => {
  if (!canPerformAction(actor.role, action)) {
    throw new ForbiddenError();
  }
};
