import { useMemo, useState } from 'react';
import type { ComponentType, FormEvent } from 'react';
import {
  BookOpen,
  Building2,
  CreditCard,
  History,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  selectOwnerEntityNameById,
  useAdminStore,
} from '@/entities/admin/model/adminStore';
import type {
  AdminActor,
  AdminUser,
  AdminUserStatus,
  BankAccount,
  HandbookEntry,
  LegalEntity,
} from '@/entities/admin/model/types';
import { cn } from '@/shared/lib/cn';
import { formatMoneyRub } from '@/shared/lib/format';
import { Select as AppSelect } from '@/shared/ui/shadcn/select';
import { toast } from '@/shared/ui/shadcn/sonner';

type AdminTab = 'entities' | 'accounts' | 'users' | 'handbooks' | 'logs';

interface TabConfig {
  id: AdminTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  { id: 'entities', label: 'Юридические лица', icon: Building2 },
  { id: 'accounts', label: 'Банковские счета', icon: CreditCard },
  { id: 'users', label: 'Пользователи', icon: Users },
  { id: 'handbooks', label: 'Справочники', icon: BookOpen },
  { id: 'logs', label: 'Логи действий', icon: History },
];

const ROLE_LABELS: Record<AdminUser['role'], string> = {
  owner: 'Владелец',
  financial_manager: 'Финансовый менеджер',
  pm: 'PM',
  admin: 'Администратор',
};

const USER_STATUS_LABELS: Record<AdminUserStatus, string> = {
  active: 'Активен',
  invited: 'Ожидает активации',
  inactive: 'Неактивен',
};

const USER_STATUS_BADGE_STYLE: Record<AdminUserStatus, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  invited: 'bg-amber-50 text-amber-600',
  inactive: 'bg-slate-100 text-slate-600',
};

const ENTITY_STATUS_LABELS: Record<LegalEntity['status'], string> = {
  active: 'Активно',
  archived: 'Архив',
};

const ACCOUNT_STATUS_LABELS: Record<BankAccount['status'], string> = {
  active: 'Активно',
  archived: 'Архив',
};

const HANDBOOK_STATUS_LABELS: Record<HandbookEntry['status'], string> = {
  active: 'Активно',
  archived: 'Архив',
};

const getInitials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({ title, onClose, children }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();

  const users = useAdminStore((state) => state.users);
  const invites = useAdminStore((state) => state.invites);
  const outbox = useAdminStore((state) => state.outbox);
  const legalEntities = useAdminStore((state) => state.legalEntities);
  const bankAccounts = useAdminStore((state) => state.bankAccounts);
  const handbooks = useAdminStore((state) => state.handbooks);
  const logs = useAdminStore((state) => state.logs);

  const inviteUser = useAdminStore((state) => state.inviteUser);
  const resendInvite = useAdminStore((state) => state.resendInvite);
  const updateUser = useAdminStore((state) => state.updateUser);
  const changeUserStatus = useAdminStore((state) => state.changeUserStatus);

  const createLegalEntity = useAdminStore((state) => state.createLegalEntity);
  const updateLegalEntity = useAdminStore((state) => state.updateLegalEntity);
  const toggleLegalEntityStatus = useAdminStore((state) => state.toggleLegalEntityStatus);

  const createBankAccount = useAdminStore((state) => state.createBankAccount);
  const updateBankAccount = useAdminStore((state) => state.updateBankAccount);
  const toggleBankAccountStatus = useAdminStore((state) => state.toggleBankAccountStatus);

  const createHandbook = useAdminStore((state) => state.createHandbook);
  const updateHandbook = useAdminStore((state) => state.updateHandbook);
  const toggleHandbookStatus = useAdminStore((state) => state.toggleHandbookStatus);

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [search, setSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | AdminUserStatus>('all');

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<LegalEntity | null>(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [isHandbookModalOpen, setIsHandbookModalOpen] = useState(false);
  const [editingHandbook, setEditingHandbook] = useState<HandbookEntry | null>(null);

  const actor: AdminActor | null = useMemo(() => {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      role: user.role,
    };
  }, [user]);

  const normalizedSearch = search.trim().toLowerCase();

  const usersFiltered = useMemo(() => {
    return users
      .filter((row) => {
        const matchesSearch = `${row.name} ${row.email} ${row.employeeId} ${ROLE_LABELS[row.role]}`
          .toLowerCase()
          .includes(normalizedSearch);
        const matchesStatus = userStatusFilter === 'all' || row.status === userStatusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  }, [users, normalizedSearch, userStatusFilter]);

  const entitiesFiltered = useMemo(
    () =>
      legalEntities
        .filter((row) => `${row.name} ${row.inn} ${row.type}`.toLowerCase().includes(normalizedSearch))
        .sort((left, right) => left.name.localeCompare(right.name, 'ru')),
    [legalEntities, normalizedSearch]
  );

  const accountsFiltered = useMemo(
    () =>
      bankAccounts
        .filter((row) => {
          const ownerName = selectOwnerEntityNameById(legalEntities, row.ownerEntityId);
          return `${row.bankName} ${row.accountNumber} ${ownerName} ${row.currency}`
            .toLowerCase()
            .includes(normalizedSearch);
        })
        .sort((left, right) => left.bankName.localeCompare(right.bankName, 'ru')),
    [bankAccounts, legalEntities, normalizedSearch]
  );

  const handbooksFiltered = useMemo(
    () =>
      handbooks
        .filter((row) => `${row.name} ${row.category}`.toLowerCase().includes(normalizedSearch))
        .sort((left, right) => left.name.localeCompare(right.name, 'ru')),
    [handbooks, normalizedSearch]
  );

  const logsFiltered = useMemo(
    () =>
      [...logs]
        .sort(
          (left, right) =>
            new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
        )
        .filter((row) =>
          `${row.timestamp} ${row.actor} ${row.action} ${row.summary} ${row.entityId}`
            .toLowerCase()
            .includes(normalizedSearch)
        ),
    [logs, normalizedSearch]
  );

  const userPendingInvites = useMemo(() => {
    const activeInvites = invites.filter((invite) => invite.status === 'pending');
    const grouped = new Map<string, number>();

    activeInvites.forEach((invite) => {
      grouped.set(invite.userId, (grouped.get(invite.userId) ?? 0) + 1);
    });

    return grouped;
  }, [invites]);

  const latestOutbox = useMemo(
    () =>
      [...outbox]
        .sort((left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime())
        .slice(0, 8),
    [outbox]
  );

  const resetFilters = () => {
    setSearch('');
    setUserStatusFilter('all');
  };

  const openCreateModal = () => {
    if (activeTab === 'users') {
      setIsInviteModalOpen(true);
      return;
    }

    if (activeTab === 'entities') {
      setEditingEntity(null);
      setIsEntityModalOpen(true);
      return;
    }

    if (activeTab === 'accounts') {
      setEditingAccount(null);
      setIsAccountModalOpen(true);
      return;
    }

    if (activeTab === 'handbooks') {
      setEditingHandbook(null);
      setIsHandbookModalOpen(true);
    }
  };

  const handleInviteUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!actor) {
      toast.error('Не удалось определить текущего пользователя');
      return;
    }

    const formData = new FormData(event.currentTarget);

    const result = inviteUser(
      {
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? ''),
        role: String(formData.get('role') ?? 'pm') as AdminUser['role'],
        employeeId: String(formData.get('employeeId') ?? '').trim() || undefined,
      },
      actor
    );

    if (!result.ok) {
      toast.error(result.error ?? 'Не удалось отправить приглашение');
      return;
    }

    toast.success('Пользователь приглашен. Письмо отправлено в mock Gmail outbox.');
    setIsInviteModalOpen(false);
    event.currentTarget.reset();
  };

  const handleUpdateUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingUser || !actor) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const result = updateUser(
      {
        id: editingUser.id,
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? ''),
        employeeId: String(formData.get('employeeId') ?? ''),
        role: String(formData.get('role') ?? editingUser.role) as AdminUser['role'],
      },
      actor
    );

    if (!result.ok) {
      toast.error(result.error ?? 'Не удалось обновить пользователя');
      return;
    }

    toast.success('Пользователь обновлен');
    setEditingUser(null);
  };

  const handleResendInvite = (userId: string) => {
    if (!actor) {
      return;
    }

    const result = resendInvite(userId, actor);
    if (!result.ok) {
      toast.error(result.error ?? 'Не удалось отправить приглашение повторно');
      return;
    }

    toast.success('Повторное приглашение отправлено');
  };

  const handleToggleUserStatus = (targetUser: AdminUser) => {
    if (!actor) {
      return;
    }

    const nextStatus: AdminUserStatus =
      targetUser.status === 'active' ? 'inactive' : 'active';

    const result = changeUserStatus(targetUser.id, nextStatus, actor);

    if (!result.ok) {
      toast.error(result.error ?? 'Не удалось изменить статус пользователя');
      return;
    }

    toast.success(
      nextStatus === 'active'
        ? 'Пользователь активирован'
        : 'Пользователь деактивирован'
    );
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Ссылка скопирована');
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  const handleCreateOrUpdateEntity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!actor) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? ''),
      inn: String(formData.get('inn') ?? ''),
      type: String(formData.get('type') ?? ''),
    };

    const result = editingEntity
      ? updateLegalEntity({ id: editingEntity.id, ...payload }, actor)
      : createLegalEntity(payload, actor);

    if (!result.ok) {
      toast.error(result.error ?? 'Не удалось сохранить юрлицо');
      return;
    }

    toast.success(editingEntity ? 'Юрлицо обновлено' : 'Юрлицо создано');
    setEditingEntity(null);
    setIsEntityModalOpen(false);
    event.currentTarget.reset();
  };

  const handleToggleEntityStatus = (entity: LegalEntity) => {
    if (!actor) {
      return;
    }

    const nextStatus = entity.status === 'active' ? 'archived' : 'active';
    const result = toggleLegalEntityStatus(entity.id, nextStatus, actor);

    if (!result.ok) {
      toast.error(result.error ?? 'Не удалось изменить статус юрлица');
      return;
    }

    toast.success(nextStatus === 'active' ? 'Юрлицо восстановлено' : 'Юрлицо отправлено в архив');
  };

  const handleCreateOrUpdateAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!actor) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      bankName: String(formData.get('bankName') ?? ''),
      accountNumber: String(formData.get('accountNumber') ?? ''),
      ownerEntityId: String(formData.get('ownerEntityId') ?? ''),
      currency: String(formData.get('currency') ?? 'RUB'),
      balance: Number(formData.get('balance') ?? 0),
    };

    const result = editingAccount
      ? updateBankAccount({ id: editingAccount.id, ...payload }, actor)
      : createBankAccount(payload, actor);

    if (!result.ok) {
      toast.error(result.error ?? 'Не удалось сохранить банковский счет');
      return;
    }

    toast.success(editingAccount ? 'Счет обновлен' : 'Счет создан');
    setEditingAccount(null);
    setIsAccountModalOpen(false);
    event.currentTarget.reset();
  };

  const handleToggleAccountStatus = (account: BankAccount) => {
    if (!actor) {
      return;
    }

    const nextStatus = account.status === 'active' ? 'archived' : 'active';
    const result = toggleBankAccountStatus(account.id, nextStatus, actor);

    if (!result.ok) {
      toast.error(result.error ?? 'Не удалось изменить статус счета');
      return;
    }

    toast.success(nextStatus === 'active' ? 'Счет восстановлен' : 'Счет отправлен в архив');
  };

  const handleCreateOrUpdateHandbook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!actor) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? ''),
      category: String(formData.get('category') ?? ''),
    };

    const result = editingHandbook
      ? updateHandbook({ id: editingHandbook.id, ...payload }, actor)
      : createHandbook(payload, actor);

    if (!result.ok) {
      toast.error(result.error ?? 'Не удалось сохранить запись справочника');
      return;
    }

    toast.success(editingHandbook ? 'Запись справочника обновлена' : 'Запись справочника создана');
    setEditingHandbook(null);
    setIsHandbookModalOpen(false);
    event.currentTarget.reset();
  };

  const handleToggleHandbookStatus = (entry: HandbookEntry) => {
    if (!actor) {
      return;
    }

    const nextStatus = entry.status === 'active' ? 'archived' : 'active';
    const result = toggleHandbookStatus(entry.id, nextStatus, actor);

    if (!result.ok) {
      toast.error(result.error ?? 'Не удалось изменить статус записи справочника');
      return;
    }

    toast.success(
      nextStatus === 'active' ? 'Запись справочника восстановлена' : 'Запись справочника отправлена в архив'
    );
  };

  const canAddInCurrentTab = activeTab !== 'logs';
  const addButtonLabel =
    activeTab === 'users'
      ? 'Пригласить пользователя'
      : activeTab === 'entities'
        ? 'Добавить юрлицо'
        : activeTab === 'accounts'
          ? 'Добавить счет'
          : 'Добавить запись';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Администрирование</h1>
        <p className="mt-1 text-slate-500">Управление системой, доступами и справочниками</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-100/60 p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all',
              activeTab === tab.id
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40 p-6">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'users' ? (
              <AppSelect
                value={userStatusFilter}
                onChange={(event) =>
                  setUserStatusFilter(event.target.value as 'all' | AdminUserStatus)
                }
                className="app-select"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активен</option>
                <option value="invited">Ожидает активации</option>
                <option value="inactive">Неактивен</option>
              </AppSelect>
            ) : null}

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
            >
              Сбросить
            </button>

            {canAddInCurrentTab ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:bg-brand-700"
              >
                <Plus className="h-5 w-5" />
                {addButtonLabel}
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'users' ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  <th className="px-6 py-5">Пользователь</th>
                  <th className="px-6 py-5">Email / Табельный</th>
                  <th className="px-6 py-5">Роль</th>
                  <th className="px-6 py-5">Статус</th>
                  <th className="px-6 py-5">Последний вход</th>
                  <th className="px-6 py-5 text-center">Действия</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {usersFiltered.map((row) => (
                  <tr key={row.id} className="group transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-sm font-bold text-brand-600">
                          {getInitials(row.name)}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500">
                      <p>{row.email}</p>
                      <p className="font-mono text-xs text-slate-400">#{row.employeeId}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{ROLE_LABELS[row.role]}</td>
                    <td className="px-6 py-4">
                      <span className={cn('status-badge', USER_STATUS_BADGE_STYLE[row.status])}>
                        {USER_STATUS_LABELS[row.status]}
                      </span>
                      {userPendingInvites.get(row.id) ? (
                        <p className="mt-1 text-[10px] text-amber-600">
                          Активных инвайтов: {userPendingInvites.get(row.id)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingUser(row)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Pencil className="h-3.5 w-3.5" />
                            Изменить
                          </span>
                        </button>

                        {row.status === 'invited' ? (
                          <button
                            type="button"
                            onClick={() => handleResendInvite(row.id)}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                          >
                            Повторить инвайт
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(row)}
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                            row.status === 'active'
                              ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          )}
                        >
                          {row.status === 'active' ? 'Деактивировать' : 'Активировать'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {usersFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {activeTab === 'entities' ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  <th className="px-6 py-5">Название</th>
                  <th className="px-6 py-5">ИНН</th>
                  <th className="px-6 py-5">Тип</th>
                  <th className="px-6 py-5">Статус</th>
                  <th className="px-6 py-5 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entitiesFiltered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.name}</td>
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-slate-600">{row.inn}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{row.type}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'status-badge',
                          row.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {ENTITY_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEntity(row);
                            setIsEntityModalOpen(true);
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleEntityStatus(row)}
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                            row.status === 'active'
                              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          )}
                        >
                          {row.status === 'active' ? 'В архив' : 'Восстановить'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {entitiesFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      Юрлица не найдены
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {activeTab === 'accounts' ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  <th className="px-6 py-5">Банк</th>
                  <th className="px-6 py-5">Счет</th>
                  <th className="px-6 py-5">Владелец</th>
                  <th className="px-6 py-5">Валюта</th>
                  <th className="px-6 py-5 text-right">Остаток</th>
                  <th className="px-6 py-5">Статус</th>
                  <th className="px-6 py-5 text-center">Действия</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {accountsFiltered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{row.bankName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.accountNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {selectOwnerEntityNameById(legalEntities, row.ownerEntityId)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      {row.currency}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                      {formatMoneyRub(row.balance)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'status-badge',
                          row.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {ACCOUNT_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccount(row);
                            setIsAccountModalOpen(true);
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAccountStatus(row)}
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                            row.status === 'active'
                              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          )}
                        >
                          {row.status === 'active' ? 'В архив' : 'Восстановить'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {accountsFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                      Банковские счета не найдены
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {activeTab === 'handbooks' ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  <th className="px-6 py-5">Элемент</th>
                  <th className="px-6 py-5">Категория</th>
                  <th className="px-6 py-5">Статус</th>
                  <th className="px-6 py-5">Обновлено</th>
                  <th className="px-6 py-5 text-center">Действия</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {handbooksFiltered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{row.name}</td>
                    <td className="px-6 py-4">
                      <span className="status-badge bg-slate-100 text-slate-600">{row.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'status-badge',
                          row.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {HANDBOOK_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {formatDateTime(row.updatedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHandbook(row);
                            setIsHandbookModalOpen(true);
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleHandbookStatus(row)}
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                            row.status === 'active'
                              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          )}
                        >
                          {row.status === 'active' ? 'В архив' : 'Восстановить'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {handbooksFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      Записи справочника не найдены
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {activeTab === 'logs' ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  <th className="px-6 py-5">Дата / Время</th>
                  <th className="px-6 py-5">Пользователь</th>
                  <th className="px-6 py-5">Действие</th>
                  <th className="px-6 py-5">Сущность</th>
                  <th className="px-6 py-5">Описание</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {logsFiltered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {formatDateTime(row.timestamp)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{row.actor}</td>
                    <td className="px-6 py-4">
                      <span className="status-badge bg-slate-100 text-slate-600">{row.action}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {row.entityType}:{' '}
                      <span className="font-mono text-slate-400">{row.entityId}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{row.summary}</td>
                  </tr>
                ))}

                {logsFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      Логи по текущему фильтру не найдены
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-600" />
            <h3 className="text-lg font-bold text-slate-900">Mock Gmail outbox</h3>
          </div>
          <div className="space-y-3">
            {latestOutbox.map((message) => (
              <div
                key={message.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{message.subject}</p>
                  <p className="text-xs text-slate-500">{message.to}</p>
                  <p className="text-[11px] text-slate-400">{formatDateTime(message.sentAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(message.inviteLink)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Скопировать ссылку
                  </button>
                  <a
                    href={message.inviteLink}
                    className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                  >
                    Открыть
                  </a>
                </div>
              </div>
            ))}
            {latestOutbox.length === 0 ? (
              <p className="text-sm text-slate-500">Письма еще не отправлялись</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs font-medium text-brand-700">
        <ShieldCheck className="h-4 w-4" />
        Все действия в админке логируются: пользователи, инвайты, юрлица, счета и справочники.
      </div>

      {isInviteModalOpen ? (
        <ModalShell title="Пригласить пользователя" onClose={() => setIsInviteModalOpen(false)}>
          <form onSubmit={handleInviteUser} className="space-y-6 p-8">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ФИО</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: Анна Кузнецова"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  placeholder="anna@company.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Роль</label>
                  <AppSelect
                    name="role"
                    defaultValue="pm"
                    className="app-select w-full"
                  >
                    <option value="owner">Владелец</option>
                    <option value="financial_manager">Финансовый менеджер</option>
                    <option value="pm">PM</option>
                    <option value="admin">Администратор</option>
                  </AppSelect>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Табельный номер</label>
                  <input
                    name="employeeId"
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    placeholder="Авто, если пусто"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
              >
                Отправить инвайт
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {editingUser ? (
        <ModalShell title="Редактировать пользователя" onClose={() => setEditingUser(null)}>
          <form onSubmit={handleUpdateUser} className="space-y-6 p-8">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ФИО</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingUser.name}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={editingUser.email}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Роль</label>
                  <AppSelect
                    name="role"
                    defaultValue={editingUser.role}
                    className="app-select w-full"
                  >
                    <option value="owner">Владелец</option>
                    <option value="financial_manager">Финансовый менеджер</option>
                    <option value="pm">PM</option>
                    <option value="admin">Администратор</option>
                  </AppSelect>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Табельный номер</label>
                  <input
                    name="employeeId"
                    type="text"
                    required
                    defaultValue={editingUser.employeeId}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
              >
                Сохранить
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {isEntityModalOpen ? (
        <ModalShell
          title={editingEntity ? 'Редактировать юрлицо' : 'Добавить юрлицо'}
          onClose={() => {
            setIsEntityModalOpen(false);
            setEditingEntity(null);
          }}
        >
          <form onSubmit={handleCreateOrUpdateEntity} className="space-y-6 p-8">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Название</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingEntity?.name ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ИНН</label>
                <input
                  name="inn"
                  type="text"
                  required
                  defaultValue={editingEntity?.inn ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Тип</label>
                <input
                  name="type"
                  type="text"
                  required
                  defaultValue={editingEntity?.type ?? 'ООО'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEntityModalOpen(false);
                  setEditingEntity(null);
                }}
                className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
              >
                {editingEntity ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {isAccountModalOpen ? (
        <ModalShell
          title={editingAccount ? 'Редактировать счет' : 'Добавить счет'}
          onClose={() => {
            setIsAccountModalOpen(false);
            setEditingAccount(null);
          }}
        >
          <form onSubmit={handleCreateOrUpdateAccount} className="space-y-6 p-8">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Банк</label>
                <input
                  name="bankName"
                  type="text"
                  required
                  defaultValue={editingAccount?.bankName ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Номер счета</label>
                <input
                  name="accountNumber"
                  type="text"
                  required
                  defaultValue={editingAccount?.accountNumber ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Юрлицо-владелец</label>
                <AppSelect
                  name="ownerEntityId"
                  required
                  defaultValue={editingAccount?.ownerEntityId ?? legalEntities[0]?.id}
                  className="app-select w-full"
                >
                  {legalEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </AppSelect>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Валюта</label>
                  <input
                    name="currency"
                    type="text"
                    required
                    defaultValue={editingAccount?.currency ?? 'RUB'}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Остаток</label>
                  <input
                    name="balance"
                    type="number"
                    required
                    defaultValue={editingAccount?.balance ?? 0}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsAccountModalOpen(false);
                  setEditingAccount(null);
                }}
                className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
              >
                {editingAccount ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {isHandbookModalOpen ? (
        <ModalShell
          title={editingHandbook ? 'Редактировать запись справочника' : 'Добавить запись справочника'}
          onClose={() => {
            setIsHandbookModalOpen(false);
            setEditingHandbook(null);
          }}
        >
          <form onSubmit={handleCreateOrUpdateHandbook} className="space-y-6 p-8">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Название</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingHandbook?.name ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Категория</label>
                <input
                  name="category"
                  type="text"
                  required
                  defaultValue={editingHandbook?.category ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsHandbookModalOpen(false);
                  setEditingHandbook(null);
                }}
                className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
              >
                {editingHandbook ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
