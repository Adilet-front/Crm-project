import { describe, expect, it } from 'vitest';
import { createOperation, listOperations } from '@/entities/operation/api/operationsApi';
import {
  approveAllPaymentApprovals,
  listPaymentApprovals,
} from '@/entities/payment-request/api/approvalsApi';
import type { ApiActor } from '@/shared/api/access';
import { ForbiddenError } from '@/shared/api/errors';

describe('API guard checks', () => {
  it('allows owner and pm to read operations', () => {
    const pm: ApiActor = { role: 'pm', identifier: '20011' };
    const owner: ApiActor = { role: 'owner', identifier: 'owner@company.com' };

    expect(listOperations(pm).length).toBeGreaterThan(0);
    expect(listOperations(owner).length).toBeGreaterThan(0);
  });

  it('denies operation creation for owner and pm', () => {
    const payload = {
      type: 'expense' as const,
      amount: 20_000,
      date: '2026-02-24',
      description: 'Read-only user cannot create',
    };

    expect(() => createOperation({ role: 'owner', identifier: 'owner@company.com' }, payload)).toThrow(
      ForbiddenError
    );
    expect(() => createOperation({ role: 'pm', identifier: '20011' }, payload)).toThrow(ForbiddenError);
  });

  it('allows financial manager and owner to approve requests', () => {
    const financialManager: ApiActor = {
      role: 'financial_manager',
      identifier: 'finmanager@company.com',
    };
    const owner: ApiActor = { role: 'owner', identifier: 'owner@company.com' };

    expect(listPaymentApprovals(financialManager).length).toBeGreaterThan(0);
    expect(approveAllPaymentApprovals(financialManager)).toBe(true);
    expect(listPaymentApprovals(owner).length).toBeGreaterThan(0);
    expect(approveAllPaymentApprovals(owner)).toBe(true);
  });
});
