import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, Plus, TrendingUp, X } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceStore } from '@/entities/finance/model/store';
import {
  getReportingMonthByKey,
  useReportingPeriodStore,
} from '@/entities/finance/model/periodStore';
import {
  generateCoveragePlan,
  type CoverageActionType,
  type CoverageDayMetric,
  type CoverageGapAlert,
  type CoveragePlan,
} from '@/pages/planning/model/coveragePlan';
import { cn } from '@/shared/lib/cn';
import { formatMoneyRub } from '@/shared/lib/format';
import { toast } from '@/shared/ui/shadcn/sonner';

type DayMetric = CoverageDayMetric;

interface CalendarCell {
  id: number;
  day: number | null;
  income: number;
  expense: number;
  isRisk: boolean;
  isToday: boolean;
}

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const COVERAGE_ACTION_ORDER: CoverageActionType[] = [
  'payment_reschedule',
  'receivables_acceleration',
  'internal_transfer',
  'external_financing',
];

const COVERAGE_ACTION_META: Record<
  CoverageActionType,
  { label: string; badgeClassName: string }
> = {
  payment_reschedule: {
    label: 'Перенос платежей',
    badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  receivables_acceleration: {
    label: 'Приоритизация поступлений',
    badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  internal_transfer: {
    label: 'Внутренние переводы',
    badgeClassName: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  external_financing: {
    label: 'Внешнее финансирование',
    badgeClassName: 'border-violet-200 bg-violet-50 text-violet-700',
  },
};

interface ForecastPoint {
  date: string;
  balance: number;
}

type GapAlert = CoverageGapAlert;

interface PlanningMonthlySnapshot {
  dayMetrics: Record<number, DayMetric>;
  forecastData: ForecastPoint[];
  gapAlerts: GapAlert[];
  todayDay: number | null;
}

const PLANNING_DATA_BY_MONTH: Record<string, PlanningMonthlySnapshot> = {
  '2026-02': {
    dayMetrics: {
      2: { expense: 180_000 },
      3: { income: 420_000 },
      5: { expense: 90_000 },
      6: { income: 210_000 },
      8: { expense: 300_000 },
      10: { income: 780_000 },
      11: { expense: 240_000 },
      14: { income: 310_000, expense: 95_000 },
      16: { expense: 180_000 },
      19: { income: 910_000 },
      20: { expense: 680_000, isRisk: true },
      21: { expense: 520_000, isRisk: true },
      22: { income: 460_000, expense: 310_000 },
      23: { expense: 150_000 },
      24: { income: 220_000, expense: 410_000 },
      25: { income: 980_000 },
      26: { expense: 540_000, isRisk: true },
      27: { income: 1_300_000 },
      28: { expense: 460_000 },
    },
    forecastData: [
      { date: '24.02', balance: 23_560_000 },
      { date: '25.02', balance: 22_100_000 },
      { date: '26.02', balance: 21_500_000 },
      { date: '27.02', balance: 19_800_000 },
      { date: '28.02', balance: 18_200_000 },
      { date: '01.03', balance: 25_400_000 },
      { date: '02.03', balance: 24_100_000 },
    ],
    gapAlerts: [
      {
        date: '26 февраля',
        reason: 'Крупный расход на материалы по проекту ЖК "Горизонт"',
        shortage: 780_000,
      },
      {
        date: '27 февраля',
        reason: 'Плановый платеж по аренде техники и сервису',
        shortage: 430_000,
      },
    ],
    todayDay: 24,
  },
  '2026-01': {
    dayMetrics: {
      3: { expense: 160_000 },
      4: { income: 390_000 },
      6: { expense: 120_000 },
      8: { income: 320_000 },
      11: { expense: 340_000 },
      13: { income: 650_000 },
      16: { expense: 210_000 },
      18: { income: 760_000 },
      20: { expense: 430_000 },
      22: { income: 510_000, expense: 290_000 },
      24: { expense: 560_000, isRisk: true },
      25: { expense: 470_000, isRisk: true },
      27: { income: 880_000, expense: 310_000 },
      29: { income: 1_040_000 },
      30: { expense: 520_000, isRisk: true },
      31: { expense: 370_000 },
    },
    forecastData: [
      { date: '24.01', balance: 20_940_000 },
      { date: '25.01', balance: 20_200_000 },
      { date: '26.01', balance: 19_450_000 },
      { date: '27.01', balance: 18_900_000 },
      { date: '28.01', balance: 18_220_000 },
      { date: '29.01', balance: 17_780_000 },
      { date: '30.01', balance: 17_350_000 },
    ],
    gapAlerts: [
      {
        date: '24 января',
        reason: 'Пиковый платёж поставщику металлоконструкций',
        shortage: 690_000,
      },
      {
        date: '30 января',
        reason: 'Комплексные выплаты по логистике и сервису',
        shortage: 510_000,
      },
    ],
    todayDay: null,
  },
};

const buildMonthCells = (
  dayMetrics: Record<number, DayMetric>,
  daysInMonth: number,
  firstDayOffset: number,
  todayDay: number | null
): CalendarCell[] => {
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - firstDayOffset + 1;

    if (day <= 0 || day > daysInMonth) {
      return {
        id: index,
        day: null,
        income: 0,
        expense: 0,
        isRisk: false,
        isToday: false,
      };
    }

    const metric = dayMetrics[day] ?? { income: 0, expense: 0, isRisk: false };

    return {
      id: index,
      day,
      income: metric.income ?? 0,
      expense: metric.expense ?? 0,
      isRisk: Boolean(metric.isRisk),
      isToday: todayDay === day,
    };
  });
};

export default function PlanningPage() {
  const { user } = useAuth();
  const operations = useFinanceStore((state) => state.operations);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentDay, setSelectedPaymentDay] = useState<number | null>(null);
  const [plannedAmountsByMonth, setPlannedAmountsByMonth] = useState<Record<string, Record<number, number>>>(
    {}
  );
  const [coveragePlanByMonth, setCoveragePlanByMonth] = useState<Record<string, CoveragePlan>>({});
  const selectedMonthKey = useReportingPeriodStore((state) => state.selectedMonthKey);

  const isReadOnly = user?.role === 'owner';
  const selectedMonth = getReportingMonthByKey(selectedMonthKey);
  const coveragePlan = coveragePlanByMonth[selectedMonthKey] ?? null;

  const planningSnapshot =
    PLANNING_DATA_BY_MONTH[selectedMonthKey] ?? PLANNING_DATA_BY_MONTH['2026-02'];
  const monthDate = selectedMonth.date;
  const firstDayOffset = (monthDate.getDay() + 6) % 7;
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

  const mergedDayMetrics = useMemo(() => {
    const baseMetrics = Object.entries(planningSnapshot.dayMetrics).reduce<Record<number, DayMetric>>(
      (acc, [day, metric]) => {
        acc[Number(day)] = { ...metric };
        return acc;
      },
      {}
    );

    const plannedAmounts = plannedAmountsByMonth[selectedMonthKey] ?? {};
    Object.entries(plannedAmounts).forEach(([day, amount]) => {
      const dayNumber = Number(day);
      const currentMetric = baseMetrics[dayNumber] ?? {};

      if (amount === 0) {
        return;
      }

      baseMetrics[dayNumber] = {
        ...currentMetric,
        income: amount > 0 ? (currentMetric.income ?? 0) + amount : currentMetric.income ?? 0,
        expense: amount < 0 ? (currentMetric.expense ?? 0) + Math.abs(amount) : currentMetric.expense ?? 0,
      };
    });

    return baseMetrics;
  }, [planningSnapshot.dayMetrics, plannedAmountsByMonth, selectedMonthKey]);

  const monthCells = useMemo(
    () =>
      buildMonthCells(
        mergedDayMetrics,
        daysInMonth,
        firstDayOffset,
        planningSnapshot.todayDay
      ),
    [mergedDayMetrics, planningSnapshot.todayDay, daysInMonth, firstDayOffset]
  );

  const visibleCells = useMemo(() => {
    if (viewMode === 'week') {
      const weekStartDay = Math.max(1, daysInMonth - 6);
      return monthCells.filter((cell) => cell.day !== null && cell.day >= weekStartDay);
    }

    return monthCells;
  }, [daysInMonth, monthCells, viewMode]);

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedPaymentDay(null);
  };

  const handleAddPlannedPayment = (day: number) => {
    if (isReadOnly) {
      toast.warning('Для роли owner доступны только просмотр и фильтрация');
      return;
    }

    setSelectedPaymentDay(day);
    setIsPaymentModalOpen(true);
  };

  const handleSavePlannedPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedPaymentDay === null) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const amountRaw = Number(String(formData.get('amount') ?? '').replace(',', '.'));
    const normalizedAmount = amountRaw > 0 ? Math.round(amountRaw) : -Math.round(Math.abs(amountRaw));

    if (!Number.isFinite(amountRaw) || normalizedAmount === 0) {
      toast.error('Введите сумму больше 0 по модулю');
      return;
    }

    setPlannedAmountsByMonth((prev) => {
      const monthAmounts = prev[selectedMonthKey] ?? {};

      return {
        ...prev,
        [selectedMonthKey]: {
          ...monthAmounts,
          [selectedPaymentDay]: (monthAmounts[selectedPaymentDay] ?? 0) + normalizedAmount,
        },
      };
    });

    const sign = normalizedAmount > 0 ? '+' : '-';
    toast.success(
      `Плановый платеж ${sign}${formatMoneyRub(Math.abs(normalizedAmount))} добавлен на ${selectedPaymentDay} ${selectedMonth.label}`
    );
    closePaymentModal();
    event.currentTarget.reset();
  };

  const handleGenerateCoveragePlan = () => {
    if (isReadOnly) {
      toast.warning('Для роли owner доступны только просмотр и фильтрация');
      return;
    }

    const generatedPlan = generateCoveragePlan({
      dayMetrics: mergedDayMetrics,
      gapAlerts: planningSnapshot.gapAlerts,
      monthDate,
      monthKey: selectedMonthKey,
      operations,
    });

    setCoveragePlanByMonth((prev) => ({
      ...prev,
      [selectedMonthKey]: generatedPlan,
    }));

    if (generatedPlan.totalGap === 0) {
      toast.success('Кассовых разрывов на выбранный период не найдено');
      return;
    }

    const coveredPercent = Math.min(
      100,
      Math.round((generatedPlan.coveredAmount / generatedPlan.totalGap) * 100)
    );

    toast.success(`План покрытия сформирован: ${coveredPercent}% от дефицита закрыто.`);
  };

  return (
    <div
      key={selectedMonthKey}
      className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Платежный календарь</h1>
          <p className="mt-1 text-slate-500">
            Прогноз кассовых разрывов и планирование оплат за{' '}
            <span className="font-semibold capitalize text-slate-700">{selectedMonth.label}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition-all',
                viewMode === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition-all',
                viewMode === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              Месяц
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="border-r border-slate-100 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {visibleCells.map((cell) => (
            <div
              key={cell.id}
              className={cn(
                'group relative min-h-[120px] border-b border-r border-slate-100 p-3 transition-all hover:bg-slate-50/60',
                viewMode === 'month' && cell.day === null && 'bg-slate-50/30 opacity-50',
                cell.isRisk && 'bg-rose-50/60'
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    'text-sm font-bold',
                    cell.isToday
                      ? 'flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white'
                      : 'text-slate-500'
                  )}
                >
                  {cell.day ?? ''}
                </span>

                {cell.isRisk ? <AlertTriangle className="h-4 w-4 text-rose-500" /> : null}
              </div>

              <div className="space-y-1">
                {cell.income > 0 ? (
                  <div className="w-fit rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                    +{formatMoneyRub(cell.income).replace('₽ ', '')}
                  </div>
                ) : null}

                {cell.expense > 0 ? (
                  <div className="w-fit rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                    -{formatMoneyRub(cell.expense).replace('₽ ', '')}
                  </div>
                ) : null}
              </div>

              {cell.day && !isReadOnly ? (
                <button
                  onClick={() => handleAddPlannedPayment(cell.day as number)}
                  className="absolute bottom-2 right-2 rounded-md border border-slate-200 bg-white p-1 opacity-0 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="glass-card p-6 xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Прогноз остатка денежных средств
              </h3>
              <p className="text-sm text-slate-500">Горизонт 7 дней</p>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={planningSnapshot.forecastData}>
                <defs>
                  <linearGradient id="planning-balance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(value) => `${Math.round(value / 1_000_000)}M`}
                />
                <Tooltip formatter={(value) => formatMoneyRub(Number(value))} />
                <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={3} fill="url(#planning-balance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-1 text-lg font-bold text-slate-900">Риски разрыва</h3>
          <p className="mb-5 text-sm text-slate-500">Требуют действий до конца недели</p>

          <div className="space-y-3">
            {planningSnapshot.gapAlerts.map((alert) => (
              <div key={alert.date} className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">{alert.date}</span>
                </div>
                <p className="text-sm font-medium text-slate-700">{alert.reason}</p>
                <p className="mt-2 text-sm font-bold text-rose-600">Дефицит: {formatMoneyRub(alert.shortage)}</p>
              </div>
            ))}
          </div>

          {!isReadOnly ? (
            <button
              type="button"
              onClick={handleGenerateCoveragePlan}
              className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
            >
              Сформировать план покрытия
            </button>
          ) : (
            <p className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-medium text-amber-700">
              Роль owner работает в режиме только просмотра.
            </p>
          )}
        </div>
      </div>

      {coveragePlan ? (
        <div className="glass-card p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">План покрытия кассового разрыва</h3>
              <p className="text-sm text-slate-500">
                Подобранные меры для месяца: <span className="font-semibold text-slate-700">{selectedMonth.label}</span>
              </p>
            </div>
            <span className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              Покрыто {Math.min(100, Math.round((coveragePlan.coveredAmount / Math.max(coveragePlan.totalGap, 1)) * 100))}%
            </span>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Суммарный дефицит</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatMoneyRub(coveragePlan.totalGap)}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">План покрытия</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{formatMoneyRub(coveragePlan.coveredAmount)}</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Остаток дефицита</p>
              <p className="mt-1 text-xl font-bold text-rose-600">{formatMoneyRub(coveragePlan.residualGap)}</p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {COVERAGE_ACTION_ORDER.map((actionType) => {
              const amount = coveragePlan.totalsByType[actionType];
              if (amount <= 0) {
                return null;
              }

              const actionMeta = COVERAGE_ACTION_META[actionType];

              return (
                <div
                  key={actionType}
                  className={cn(
                    'rounded-xl border px-3 py-2',
                    actionMeta.badgeClassName
                  )}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider">{actionMeta.label}</p>
                  <p className="mt-1 text-sm font-bold">{formatMoneyRub(amount)}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            {coveragePlan.actions.map((action) => {
              const actionMeta = COVERAGE_ACTION_META[action.type];

              return (
                <div key={action.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                        actionMeta.badgeClassName
                      )}
                    >
                      {actionMeta.label}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{formatMoneyRub(action.amount)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{action.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">Дата риска: {action.riskDateLabel}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {isPaymentModalOpen && selectedPaymentDay !== null ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Плановый платеж</h2>
                <p className="text-sm text-slate-500">
                  День: {selectedPaymentDay} {selectedMonth.label}
                </p>
              </div>
              <button
                onClick={closePaymentModal}
                className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlannedPayment} className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Сумма, ₽</label>
                <input
                  name="amount"
                  type="number"
                  required
                  autoFocus
                  placeholder="+150000 или -150000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all [appearance:textfield] focus:ring-2 focus:ring-blue-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Поставьте знак: `+` для прихода, `-` для расхода.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
