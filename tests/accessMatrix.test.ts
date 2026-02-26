import { describe, expect, it } from 'vitest';
import { canAccessSection, canPerformAction, isReadOnlyRole } from '@/entities/user/model/access';
import type { UserRole } from '@/entities/user/model/types';

describe('RBAC section matrix', () => {
  const owner: UserRole = 'owner';
  const financialManager: UserRole = 'financial_manager';
  const pm: UserRole = 'pm';
  const admin: UserRole = 'admin';

  it('grants owner full business UI with approval decision rights', () => {
    expect(canAccessSection(owner, 'dashboard')).toBe(true);
    expect(canAccessSection(owner, 'projects')).toBe(true);
    expect(canAccessSection(owner, 'operations')).toBe(true);
    expect(canAccessSection(owner, 'approvals')).toBe(true);
    expect(canAccessSection(owner, 'planning')).toBe(true);
    expect(canAccessSection(owner, 'analytics')).toBe(true);
    expect(canAccessSection(owner, 'admin')).toBe(false);
    expect(canPerformAction(owner, 'projects:write')).toBe(false);
    expect(canPerformAction(owner, 'approvals:write')).toBe(true);
    expect(isReadOnlyRole(owner)).toBe(true);
  });

  it('grants financial manager business section access but denies project creation and admin', () => {
    expect(canAccessSection(financialManager, 'dashboard')).toBe(true);
    expect(canAccessSection(financialManager, 'projects')).toBe(true);
    expect(canAccessSection(financialManager, 'operations')).toBe(true);
    expect(canAccessSection(financialManager, 'approvals')).toBe(true);
    expect(canAccessSection(financialManager, 'planning')).toBe(true);
    expect(canAccessSection(financialManager, 'analytics')).toBe(true);
    expect(canAccessSection(financialManager, 'admin')).toBe(false);
    expect(canPerformAction(financialManager, 'projects:write')).toBe(false);
  });

  it('restricts pm from planning/analytics/admin and allows read-only operations', () => {
    expect(canAccessSection(pm, 'dashboard')).toBe(true);
    expect(canAccessSection(pm, 'projects')).toBe(true);
    expect(canAccessSection(pm, 'operations')).toBe(true);
    expect(canAccessSection(pm, 'approvals')).toBe(true);
    expect(canAccessSection(pm, 'planning')).toBe(false);
    expect(canAccessSection(pm, 'analytics')).toBe(false);
    expect(canAccessSection(pm, 'admin')).toBe(false);
    expect(canPerformAction(pm, 'projects:write')).toBe(true);
    expect(canPerformAction(pm, 'project_requests:write')).toBe(true);
    expect(canPerformAction(pm, 'operations:write')).toBe(false);
    expect(canPerformAction(pm, 'approvals:read')).toBe(true);
  });

  it('shows administration and dashboard only for admin role', () => {
    expect(canAccessSection(admin, 'dashboard')).toBe(true);
    expect(canAccessSection(admin, 'admin')).toBe(true);
    expect(canAccessSection(admin, 'projects')).toBe(false);
    expect(canAccessSection(admin, 'operations')).toBe(false);
    expect(canAccessSection(admin, 'approvals')).toBe(false);
    expect(canAccessSection(admin, 'planning')).toBe(false);
    expect(canAccessSection(admin, 'analytics')).toBe(false);
    expect(canPerformAction(admin, 'admin:read')).toBe(true);
    expect(canPerformAction(admin, 'projects:write')).toBe(false);
    expect(canPerformAction(admin, 'project_requests:write')).toBe(false);
  });
});
