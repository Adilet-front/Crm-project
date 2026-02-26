import { describe, expect, it } from 'vitest';
import { USER_ROLES } from '@/entities/user/model/types';
import { getNavigationForRole, ROLE_NAVIGATION_VARIANTS } from '@/shared/config/navigation';

describe('navigation config', () => {
  it('creates menu variants for every supported role', () => {
    expect(Object.keys(ROLE_NAVIGATION_VARIANTS).sort()).toEqual([...USER_ROLES].sort());
  });

  it('contains required entries for owner and financial manager', () => {
    const ownerLabels = getNavigationForRole('owner').map((item) => item.label);
    const managerLabels = getNavigationForRole('financial_manager').map((item) => item.label);

    for (const labels of [ownerLabels, managerLabels]) {
      expect(labels).toContain('Рабочий стол');
      expect(labels).toContain('Проекты');
      expect(labels).toContain('Операции');
      expect(labels).toContain('Согласование');
      expect(labels).toContain('Планирование');
      expect(labels).toContain('Аналитика');
      expect(labels).not.toContain('Администрирование');
    }
  });

  it('hides planning/analytics/admin for pm', () => {
    const labels = getNavigationForRole('pm').map((item) => item.label);

    expect(labels).toContain('Рабочий стол');
    expect(labels).toContain('Проекты');
    expect(labels).toContain('Операции');
    expect(labels).toContain('Согласование');
    expect(labels).not.toContain('Планирование');
    expect(labels).not.toContain('Аналитика');
    expect(labels).not.toContain('Администрирование');
  });

  it('shows dashboard and admin only for admin', () => {
    const labels = getNavigationForRole('admin').map((item) => item.label);

    expect(labels).toContain('Рабочий стол');
    expect(labels).toContain('Администрирование');
    expect(labels).not.toContain('Проекты');
    expect(labels).not.toContain('Операции');
    expect(labels).not.toContain('Планирование');
    expect(labels).not.toContain('Аналитика');
  });
});
