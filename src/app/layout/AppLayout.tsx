import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Bell, Calendar, Check, ChevronLeft, ChevronRight, LogOut, UserRound } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  REPORTING_MONTHS,
  useReportingPeriodStore,
} from '@/entities/finance/model/periodStore';
import type { UserRole } from '@/entities/user/model/types';
import { getNavigationForRole } from '@/shared/config/navigation';
import { NAVIGATION_ICON_MAP } from '@/shared/config/navigationIcons';
import { cn } from '@/shared/lib/cn';
import { useNotificationCenterStore } from '@/shared/ui/shadcn/notificationCenterStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/shadcn/popover';
import { toast } from '@/shared/ui/shadcn/sonner';

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Владелец',
  financial_manager: 'Финансовый менеджер',
  pm: 'Руководитель проектов',
  admin: 'Администратор',
};

const getMenuLabel = (role: UserRole, label: string) => {
  if (role === 'owner') {
    if (label === 'Проекты') return 'Проекты (только чтение)';
    if (label === 'Операции') return 'Операции (только чтение)';
    if (label === 'Планирование') return 'Планирование (только просмотр)';
  }

  if (role === 'pm') {
    if (label === 'Проекты') return 'Мои проекты';
    if (label === 'Операции') return 'Операции (только просмотр)';
    if (label === 'Согласование') return 'Мои заявки';
  }

  return label;
};

const getUserInitials = (fullName: string) => {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

interface ForbiddenLocationState {
  forbiddenNotice?: string;
  forbiddenFrom?: string;
}

const formatNotificationTime = (createdAt: number) => {
  const diffMinutes = Math.floor((Date.now() - createdAt) / 60_000);

  if (diffMinutes < 1) {
    return 'Только что';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} мин назад`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} ч назад`;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(createdAt);
};

export const AppLayout: FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const selectedMonthKey = useReportingPeriodStore((state) => state.selectedMonthKey);
  const setMonthByKey = useReportingPeriodStore((state) => state.setMonthByKey);
  const goToPreviousMonth = useReportingPeriodStore((state) => state.goToPreviousMonth);
  const goToNextMonth = useReportingPeriodStore((state) => state.goToNextMonth);
  const notificationItems = useNotificationCenterStore((state) => state.items);
  const markNotificationAsRead = useNotificationCenterStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationCenterStore((state) => state.markAllAsRead);
  const clearByRole = useNotificationCenterStore((state) => state.clearByRole);

  const notifications = useMemo(
    () => (user ? notificationItems.filter((notification) => notification.role === user.role) : []),
    [notificationItems, user]
  );

  const unreadCount = notifications.reduce(
    (total, notification) => total + Number(!notification.read),
    0
  );

  const markAllNotificationsAsRead = () => {
    if (!user) {
      return;
    }

    markAllAsRead(user.role);
  };

  const clearNotifications = () => {
    if (!user) {
      return;
    }

    clearByRole(user.role);
  };

  useEffect(() => {
    const state = location.state as ForbiddenLocationState | null;
    const forbiddenNotice = state?.forbiddenNotice;

    if (!forbiddenNotice) {
      return;
    }

    toast.warning(forbiddenNotice, { title: 'Ограничение доступа' });

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.state, navigate]);

  if (!user) {
    return null;
  }

  const navigation = getNavigationForRole(user.role);
  const userInitials = getUserInitials(user.name);
  const showAvatarImage = Boolean(user.avatarUrl) && user.avatarUrl !== failedAvatarUrl;
  const selectedMonthIndex = REPORTING_MONTHS.findIndex((month) => month.key === selectedMonthKey);
  const selectedMonth = REPORTING_MONTHS[selectedMonthIndex] ?? REPORTING_MONTHS[REPORTING_MONTHS.length - 1];
  const canGoPrevious = selectedMonthIndex > 0;
  const canGoNext = selectedMonthIndex >= 0 && selectedMonthIndex < REPORTING_MONTHS.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="border-b border-slate-800/70 bg-slate-900 text-slate-100 md:fixed md:inset-y-0 md:left-0 md:flex md:w-72 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-4 border-b border-slate-800/70 px-6 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-black text-white shadow-lg shadow-brand-500/30">
            ₣
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Finance<span className="text-brand-300">Pro</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Enterprise CRM</p>
          </div>
        </div>

        <nav className="space-y-2 overflow-y-auto px-4 py-4 md:flex-1">
          {navigation.map((item) => {
            const Icon = NAVIGATION_ICON_MAP[item.icon];
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-200',
                    isActive
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{getMenuLabel(user.role, item.label)}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/70 px-4 py-4">
          <div className="mb-3 rounded-2xl bg-slate-800/70 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-200 text-sm font-bold text-slate-900">
                {showAvatarImage ? (
                  <img
                    alt={`Аватар ${user.name}`}
                    className="h-full w-full object-cover"
                    onError={() => {
                      if (user.avatarUrl) {
                        setFailedAvatarUrl(user.avatarUrl);
                      }
                    }}
                    src={user.avatarUrl}
                  />
                ) : userInitials ? (
                  <span>{userInitials}</span>
                ) : (
                  <UserRound size={18} strokeWidth={1.8} />
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut className="h-4 w-4" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:ml-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8 md:py-5">
            <div className="relative isolate w-full max-w-[620px]">
              <div className="pointer-events-none absolute inset-0 -z-20 rounded-[24px] bg-gradient-to-r from-brand-100/35 via-white/60 to-slate-100/60 blur-lg" />
              <div className="flex items-center gap-1 rounded-[22px] border border-slate-200/80 bg-white/85 p-1 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.5)] backdrop-blur-xl">
                <button
                  type="button"
                  aria-label="Предыдущий отчетный месяц"
                  onClick={goToPreviousMonth}
                  disabled={!canGoPrevious}
                  className={cn(
                    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 md:h-10 md:w-10',
                    canGoPrevious
                      ? 'text-slate-500 hover:-translate-y-0.5 hover:border-brand-100 hover:bg-white hover:text-brand-600 active:translate-y-0 active:scale-95'
                      : 'cursor-not-allowed text-slate-300 opacity-70'
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div
                  key={selectedMonth.key}
                  className="relative min-w-0 flex-1 overflow-hidden rounded-[18px] border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50 px-2.5 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_14px_-16px_rgba(2,110,199,0.65)] animate-in fade-in-0 slide-in-from-top-2 duration-300 sm:px-5 sm:py-2"
                >
                  <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/90 to-transparent" />
                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[9px]">
                    Отчетный месяц
                  </p>
                  <p className="mt-0.5 text-sm font-bold capitalize leading-none tracking-[0.01em] text-brand-700 sm:text-xl">
                    {selectedMonth.label}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Следующий отчетный месяц"
                  onClick={goToNextMonth}
                  disabled={!canGoNext}
                  className={cn(
                    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 md:h-10 md:w-10',
                    canGoNext
                      ? 'text-slate-500 hover:-translate-y-0.5 hover:border-brand-100 hover:bg-white hover:text-brand-600 active:translate-y-0 active:scale-95'
                      : 'cursor-not-allowed text-slate-300 opacity-70'
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Открыть выбор месяца"
                      className={cn(
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 md:h-10 md:w-10',
                        isMonthPickerOpen
                          ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-[0_8px_16px_-16px_rgba(2,110,199,0.9)]'
                          : 'border-slate-200/80 bg-white/85 text-slate-500 hover:-translate-y-0.5 hover:border-brand-100 hover:bg-white hover:text-brand-600 active:translate-y-0 active:scale-95'
                      )}
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(360px,calc(100vw-1.5rem))] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-slate-200/90 bg-white/95 p-0 shadow-[0_34px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                    <div className="border-b border-slate-100/90 px-5 py-4">
                      <p className="text-sm font-bold text-slate-900">Выбор месяца</p>
                      <p className="text-xs text-slate-500">Переключает данные на всех страницах</p>
                    </div>

                    <div className="space-y-3 px-4 py-4">
                      <div className="grid grid-cols-2 gap-2">
                        {REPORTING_MONTHS.map((month) => {
                          const isSelected = month.key === selectedMonthKey;

                          return (
                            <button
                              key={month.key}
                              type="button"
                              onClick={() => {
                                setMonthByKey(month.key);
                                setIsMonthPickerOpen(false);
                              }}
                              className={cn(
                                'group flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all duration-300',
                                isSelected
                                  ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-[0_12px_26px_-20px_rgba(2,110,199,0.9)]'
                                  : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-brand-100 hover:bg-slate-50'
                              )}
                            >
                              <div>
                                <p className="text-sm font-semibold capitalize">{month.shortLabel}</p>
                                <p className="text-[11px] text-slate-400">{month.yearLabel}</p>
                              </div>
                              {isSelected ? <Check className="h-4 w-4" /> : null}
                            </button>
                          );
                        })}
                      </div>

                      <p className="rounded-xl border border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                        Доступна история за январь и февраль 2026.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3 sm:ml-0">
              <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Открыть уведомления"
                    className={cn(
                      'relative rounded-xl p-2.5 text-slate-500 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-600',
                      isNotificationsOpen && 'bg-brand-50 text-brand-600'
                    )}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 ? (
                      <span className="absolute right-2 top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    ) : null}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(360px,calc(100vw-1.5rem))] rounded-2xl border border-slate-200/90 bg-white/95 p-0 shadow-[0_28px_50px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-slate-100/90 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Уведомления</p>
                      <p className="text-[11px] text-slate-500">
                        Непрочитанных: <span className="font-semibold text-slate-700">{unreadCount}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        disabled={unreadCount === 0}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-brand-100 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Прочитать все
                      </button>
                      <button
                        type="button"
                        onClick={clearNotifications}
                        disabled={notifications.length === 0}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Очистить
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto px-2 py-2">
                    {notifications.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                        Новых уведомлений нет
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            'mb-2 rounded-xl border px-3 py-2.5 transition-colors',
                            notification.type === 'error' && 'border-rose-100 bg-rose-50/40',
                            notification.type === 'warning' && 'border-amber-100 bg-amber-50/40',
                            notification.type === 'success' && 'border-emerald-100 bg-emerald-50/40',
                            notification.type === 'info' && 'border-sky-100 bg-sky-50/40',
                            notification.read && 'opacity-70'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                                {notification.message}
                              </p>
                            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                {formatNotificationTime(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.read ? (
                              <button
                                type="button"
                                onClick={() => markNotificationAsRead(notification.id)}
                                className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-brand-100 hover:bg-brand-50 hover:text-brand-600"
                              >
                                Прочитано
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>

        <footer className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-400 md:px-8">
          © 2026 Finance Pro Dashboard. Все права защищены.
        </footer>
      </div>
    </div>
  );
};
