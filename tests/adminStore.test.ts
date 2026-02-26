import { beforeEach, describe, expect, it } from 'vitest';
import { useAdminStore } from '@/entities/admin/model/adminStore';
import { readAdminSnapshot } from '@/entities/admin/model/storage';
import { resetAuthDirectoryForTests } from '@/entities/user/model/mockAuthDirectory';

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

describe('admin store mutations', () => {
  beforeEach(() => {
    resetAuthDirectoryForTests();
    useAdminStore.getState().resetToSeed();
  });

  it('creates legal entity, writes audit and persists snapshot', () => {
    const actor = getAdminActor();
    const initialLogsCount = useAdminStore.getState().logs.length;

    const createResult = useAdminStore.getState().createLegalEntity(
      {
        name: 'ООО "Тест Девелопмент"',
        inn: '7712345678',
        type: 'ООО',
      },
      actor
    );

    expect(createResult.ok).toBe(true);
    expect(createResult.data?.status).toBe('active');

    const createdId = createResult.data?.id;
    expect(createdId).toBeTruthy();

    const updateResult = useAdminStore.getState().updateLegalEntity(
      {
        id: createdId!,
        name: 'ООО "Тест Девелопмент 2"',
        inn: '7712345678',
        type: 'ООО',
      },
      actor
    );

    expect(updateResult.ok).toBe(true);
    expect(updateResult.data?.name).toBe('ООО "Тест Девелопмент 2"');

    const archiveResult = useAdminStore
      .getState()
      .toggleLegalEntityStatus(createdId!, 'archived', actor);

    expect(archiveResult.ok).toBe(true);
    expect(archiveResult.data?.status).toBe('archived');

    const logs = useAdminStore.getState().logs;
    expect(logs.length).toBeGreaterThan(initialLogsCount);
    expect(
      logs.some(
        (entry) =>
          entry.entityId === createdId &&
          entry.action.startsWith('legal_entity.')
      )
    ).toBe(true);

    const persisted = readAdminSnapshot();
    expect(persisted?.legalEntities.some((entity) => entity.id === createdId)).toBe(true);
  });

  it('adds handbook and account with persistence', () => {
    const actor = getAdminActor();
    const ownerEntityId = useAdminStore.getState().legalEntities[0]?.id;

    const handbookResult = useAdminStore.getState().createHandbook(
      {
        name: 'Статья ДДС: Тест',
        category: 'Финансы',
      },
      actor
    );

    expect(handbookResult.ok).toBe(true);

    const accountResult = useAdminStore.getState().createBankAccount(
      {
        bankName: 'Тест Банк',
        accountNumber: '40702810999999999999',
        ownerEntityId: ownerEntityId!,
        currency: 'RUB',
        balance: 50_000,
      },
      actor
    );

    expect(accountResult.ok).toBe(true);

    const persisted = readAdminSnapshot();
    expect(
      persisted?.handbooks.some((entry) => entry.name === 'Статья ДДС: Тест')
    ).toBe(true);
    expect(
      persisted?.bankAccounts.some((account) => account.accountNumber === '40702810999999999999')
    ).toBe(true);
  });
});
