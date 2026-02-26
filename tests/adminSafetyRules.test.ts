import { beforeEach, describe, expect, it } from 'vitest';
import { useAdminStore } from '@/entities/admin/model/adminStore';
import { resetAuthDirectoryForTests } from '@/entities/user/model/mockAuthDirectory';

const getAdminUser = () => {
  const admin = useAdminStore
    .getState()
    .users.find((user) => user.role === 'admin');

  if (!admin) {
    throw new Error('Admin user not found in seed');
  }

  return admin;
};

describe('admin safety rules', () => {
  beforeEach(() => {
    resetAuthDirectoryForTests();
    useAdminStore.getState().resetToSeed();
  });

  it('prevents self-deactivation', () => {
    const admin = getAdminUser();

    const result = useAdminStore.getState().changeUserStatus(
      admin.id,
      'inactive',
      {
        id: admin.id,
        name: admin.name,
        role: admin.role,
      }
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('собственную');
  });

  it('prevents deactivating last active admin', () => {
    const admin = getAdminUser();

    const result = useAdminStore.getState().changeUserStatus(
      admin.id,
      'inactive',
      {
        id: 'system_admin_actor',
        name: 'System Admin',
        role: 'admin',
      }
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('последнего активного администратора');
  });

  it('allows deactivation when there is another active admin', () => {
    const mainAdmin = getAdminUser();

    const inviteResult = useAdminStore.getState().inviteUser(
      {
        name: 'Доп Админ',
        email: 'secondary.admin@company.com',
        employeeId: '188',
        role: 'admin',
      },
      {
        id: mainAdmin.id,
        name: mainAdmin.name,
        role: mainAdmin.role,
      }
    );

    expect(inviteResult.ok).toBe(true);

    const invite = useAdminStore
      .getState()
      .invites.find((entry) => entry.userId === inviteResult.data?.id);

    expect(invite).toBeTruthy();

    const setupResult = useAdminStore
      .getState()
      .completeInviteSetup(invite!.token, 'admin-pass');

    expect(setupResult.ok).toBe(true);

    const deactivateResult = useAdminStore.getState().changeUserStatus(
      mainAdmin.id,
      'inactive',
      {
        id: setupResult.data!.id,
        name: setupResult.data!.name,
        role: 'admin',
      }
    );

    expect(deactivateResult.ok).toBe(true);
    expect(deactivateResult.data?.status).toBe('inactive');
  });
});
