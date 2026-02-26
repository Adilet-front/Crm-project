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

describe('auth directory integration', () => {
  beforeEach(() => {
    resetAuthDirectoryForTests();
    useAdminStore.getState().resetToSeed();
  });

  it('keeps auth login working after updating user email', () => {
    const actor = getAdminActor();

    const target = useAdminStore
      .getState()
      .users.find((user) => user.email === 'pm@company.com');

    expect(target).toBeTruthy();

    const updateResult = useAdminStore.getState().updateUser(
      {
        id: target!.id,
        name: target!.name,
        email: 'pm.updated@company.com',
        employeeId: '303',
        role: target!.role,
      },
      actor
    );

    expect(updateResult.ok).toBe(true);

    expect(findAuthUserByCredentials('pm@company.com', 'password')).toBeNull();
    expect(findAuthUserByCredentials('003', 'password')).toBeNull();

    expect(findAuthUserByCredentials('pm.updated@company.com', 'password')?.id).toBe(target!.id);
    expect(findAuthUserByCredentials('303', 'password')).toBeNull();
  });

  it('blocks inactive user login and restores it after activation', () => {
    const actor = getAdminActor();

    const pm = useAdminStore
      .getState()
      .users.find((user) => user.email === 'pm@company.com');

    expect(pm).toBeTruthy();

    const deactivateResult = useAdminStore
      .getState()
      .changeUserStatus(pm!.id, 'inactive', actor);

    expect(deactivateResult.ok).toBe(true);
    expect(findAuthUserByCredentials('pm@company.com', 'password')).toBeNull();

    const activateResult = useAdminStore
      .getState()
      .changeUserStatus(pm!.id, 'active', actor);

    expect(activateResult.ok).toBe(true);
    expect(findAuthUserByCredentials('pm@company.com', 'password')?.id).toBe(pm!.id);
  });
});
