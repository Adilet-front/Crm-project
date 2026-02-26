import { beforeEach, describe, expect, it } from 'vitest';
import { useAdminStore } from '@/entities/admin/model/adminStore';
import {
  findAuthUserByCredentials,
  resetAuthDirectoryForTests,
} from '@/entities/user/model/mockAuthDirectory';

const getAdminActor = () => {
  const admin = useAdminStore
    .getState()
    .users.find((user) => user.role === 'admin');

  if (!admin) {
    throw new Error('Admin user not found in seed');
  }

  return {
    id: admin.id,
    name: admin.name,
    role: admin.role,
  } as const;
};

describe('admin invite flow', () => {
  beforeEach(() => {
    resetAuthDirectoryForTests();
    useAdminStore.getState().resetToSeed();
  });

  it('invites user, completes setup and allows login only by email', () => {
    const actor = getAdminActor();

    const inviteResult = useAdminStore.getState().inviteUser(
      {
        name: 'Мария Тест',
        email: 'maria.test@company.com',
        role: 'pm',
        employeeId: '099',
      },
      actor
    );

    expect(inviteResult.ok).toBe(true);
    const invited = inviteResult.data;
    expect(invited?.status).toBe('invited');

    expect(findAuthUserByCredentials('maria.test@company.com', 'secret123')).toBeNull();
    expect(findAuthUserByCredentials('099', 'secret123')).toBeNull();

    const invite = useAdminStore
      .getState()
      .invites.find((candidate) => candidate.userId === invited?.id);

    expect(invite).toBeTruthy();

    const validation = useAdminStore.getState().validateInviteToken(invite!.token);
    expect(validation.status).toBe('valid');

    const completeResult = useAdminStore
      .getState()
      .completeInviteSetup(invite!.token, 'secret123');

    expect(completeResult.ok).toBe(true);
    expect(completeResult.data?.status).toBe('active');

    const loginByEmail = findAuthUserByCredentials('maria.test@company.com', 'secret123');
    const loginByEmployeeId = findAuthUserByCredentials('099', 'secret123');

    expect(loginByEmail?.id).toBe(invited?.id);
    expect(loginByEmployeeId).toBeNull();

    const secondComplete = useAdminStore
      .getState()
      .completeInviteSetup(invite!.token, 'another-pass');

    expect(secondComplete.ok).toBe(false);
    expect(secondComplete.error).toContain('уже использована');

    const hasPasswordSetLog = useAdminStore
      .getState()
      .logs.some((entry) => entry.action === 'user.password_set' && entry.entityId === invited?.id);

    expect(hasPasswordSetLog).toBe(true);
  });
});
