import { describe, expect, it } from 'vitest';
import { createProjectRequest, listProjectRequests } from '@/entities/project/api/projectRequestsApi';
import type { ApiActor } from '@/shared/api/access';
import { ForbiddenError } from '@/shared/api/errors';

describe('project requests API authorization', () => {
  const pmActor: ApiActor = {
    role: 'pm',
    identifier: '20011',
  };

  const financialActor: ApiActor = {
    role: 'financial_manager',
    identifier: 'finmanager@company.com',
  };

  it('filters project requests for PM by assignment', () => {
    const pmRows = listProjectRequests(pmActor);
    const financialRows = listProjectRequests(financialActor);

    expect(pmRows.length).toBeGreaterThan(0);
    expect(pmRows.length).toBeLessThan(financialRows.length);
    expect(pmRows.every((row) => row.project !== 'Проект "Гамма"')).toBe(true);
  });

  it('blocks owner from write actions in projects', () => {
    expect(() =>
      createProjectRequest(
        {
          role: 'owner',
          identifier: 'owner@company.com',
        },
        {
          amount: 100_000,
          projectId: 'alpha',
          purpose: 'Тестовая заявка',
        }
      )
    ).toThrow(ForbiddenError);
  });

  it('blocks PM from creating request for foreign project', () => {
    expect(() =>
      createProjectRequest(pmActor, {
        amount: 150_000,
        projectId: 'gamma',
        purpose: 'Чужой проект',
      })
    ).toThrow(ForbiddenError);
  });
});
