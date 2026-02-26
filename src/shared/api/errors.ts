import { FORBIDDEN_NOTICE_MESSAGE } from '@/entities/user/model/access';

export class ForbiddenError extends Error {
  readonly statusCode = 403;

  constructor(message = FORBIDDEN_NOTICE_MESSAGE) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export const isForbiddenError = (error: unknown): error is ForbiddenError =>
  error instanceof ForbiddenError;
