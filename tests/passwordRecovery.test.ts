import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPasswordRecoveryForTests,
  confirmPasswordReset,
  requestPasswordReset,
} from '@/entities/user/model/passwordRecovery';
import {
  findAuthUserByCredentials,
  resetAuthDirectoryForTests,
  setAuthDirectoryStatus,
} from '@/entities/user/model/mockAuthDirectory';

describe('password recovery flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    resetAuthDirectoryForTests();
    clearPasswordRecoveryForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets password by valid code and allows login with new password', () => {
    const requestResult = requestPasswordReset('pm@company.com');

    expect(requestResult.ok).toBe(true);
    expect(requestResult.debugCode).toMatch(/^\d{6}$/);

    const confirmResult = confirmPasswordReset({
      email: 'pm@company.com',
      code: requestResult.debugCode!,
      nextPassword: 'new-pass-123',
    });

    expect(confirmResult).toEqual({ ok: true });
    expect(findAuthUserByCredentials('pm@company.com', 'password')).toBeNull();
    expect(findAuthUserByCredentials('pm@company.com', 'new-pass-123')?.id).toBe('u_pm');
  });

  it('rejects incorrect confirmation code', () => {
    const requestResult = requestPasswordReset('owner@company.com');

    expect(requestResult.ok).toBe(true);

    const confirmResult = confirmPasswordReset({
      email: 'owner@company.com',
      code: '111111',
      nextPassword: 'new-pass-123',
    });

    expect(confirmResult.ok).toBe(false);
    expect(confirmResult.error).toContain('Неверный код');
    expect(findAuthUserByCredentials('owner@company.com', 'password')?.id).toBe('u_owner');
  });

  it('rejects expired code', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-26T10:00:00.000Z'));

    const requestResult = requestPasswordReset('finmanager@company.com');

    expect(requestResult.ok).toBe(true);

    vi.setSystemTime(new Date('2026-02-26T10:16:00.000Z'));

    const confirmResult = confirmPasswordReset({
      email: 'finmanager@company.com',
      code: requestResult.debugCode!,
      nextPassword: 'new-pass-123',
    });

    expect(confirmResult.ok).toBe(false);
    expect(confirmResult.error).toContain('истек');
    expect(findAuthUserByCredentials('finmanager@company.com', 'password')?.id).toBe('u_fin');
  });

  it('invalidates previous code after second reset request', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.123456)
      .mockReturnValueOnce(0.654321);

    const firstRequest = requestPasswordReset('admin@company.com');
    const secondRequest = requestPasswordReset('admin@company.com');

    expect(firstRequest.ok).toBe(true);
    expect(secondRequest.ok).toBe(true);
    expect(firstRequest.debugCode).not.toEqual(secondRequest.debugCode);

    const firstCodeResult = confirmPasswordReset({
      email: 'admin@company.com',
      code: firstRequest.debugCode!,
      nextPassword: 'new-pass-123',
    });
    const secondCodeResult = confirmPasswordReset({
      email: 'admin@company.com',
      code: secondRequest.debugCode!,
      nextPassword: 'new-pass-123',
    });

    expect(firstCodeResult.ok).toBe(false);
    expect(firstCodeResult.error).toContain('Неверный код');
    expect(secondCodeResult).toEqual({ ok: true });
  });

  it('rejects reset for inactive and unknown users', () => {
    expect(setAuthDirectoryStatus('u_pm', 'inactive')).toBe(true);

    const inactiveResult = requestPasswordReset('pm@company.com');
    const unknownResult = requestPasswordReset('unknown@company.com');

    expect(inactiveResult.ok).toBe(false);
    expect(inactiveResult.error).toContain('активных');
    expect(unknownResult.ok).toBe(false);
    expect(unknownResult.error).toContain('не найден');
  });
});
