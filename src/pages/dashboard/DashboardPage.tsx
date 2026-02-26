import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  DollarSign,
  PieChart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getReportingMonthByKey,
  useReportingPeriodStore,
} from '@/entities/finance/model/periodStore';
import { cn } from '@/shared/lib/cn';
import { formatMoneyRub } from '@/shared/lib/format';

interface KpiCard {
  label: string;
  value: number;
  trend: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'red' | 'green' | 'purple' | 'indigo' | 'orange';
  isPercent?: boolean;
}

interface DynamicsPoint {
  name: string;
  доходы: number;
  расходы: number;
}

interface StructurePoint {
  name: string;
  value: number;
  color: string;
}

interface ProjectPoint {
  name: string;
  profit: number;
  margin: number;
}

interface ContractorPoint {
  name: string;
  amount: number;
  share: number;
}

interface DashboardMonthlySnapshot {
  kpiData: KpiCard[];
  dynamicsData: DynamicsPoint[];
  structureData: StructurePoint[];
  topProjects: ProjectPoint[];
  topContractors: ContractorPoint[];
}

const DASHBOARD_DATA_BY_MONTH: Record<string, DashboardMonthlySnapshot> = {
  '2026-02': {
    kpiData: [
      { label: 'Доходы', value: 45_230_000, trend: 12.5, icon: TrendingUp, color: 'blue' },
      { label: 'Расходы', value: 28_450_000, trend: -8.3, icon: TrendingDown, color: 'red' },
      { label: 'Чистая прибыль', value: 16_780_000, trend: 15.2, icon: DollarSign, color: 'green' },
      { label: 'Остаток денежных средств', value: 23_560_000, trend: 4.7, icon: Wallet, color: 'purple' },
      {
        label: 'Рентабельность',
        value: 37.1,
        trend: 2.3,
        icon: PieChart,
        color: 'indigo',
        isPercent: true,
      },
      {
        label: 'Ежемесячные накопления',
        value: 12_340_000,
        trend: -5.6,
        icon: ArrowUpRight,
        color: 'orange',
      },
    ],
    dynamicsData: [
      { name: 'Янв', доходы: 30, расходы: 25 },
      { name: 'Фев', доходы: 35, расходы: 28 },
      { name: 'Мар', доходы: 32, расходы: 26 },
      { name: 'Апр', доходы: 38, расходы: 29 },
      { name: 'Май', доходы: 42, расходы: 31 },
      { name: 'Июн', доходы: 45, расходы: 30 },
    ],
    structureData: [
      { name: 'Персонал', value: 18.25, color: '#3b82f6' },
      { name: 'Закупка', value: 3.41, color: '#10b981' },
      { name: 'Аренда', value: 2.85, color: '#f59e0b' },
      { name: 'Маркетинг', value: 2.28, color: '#ef4444' },
      { name: 'Прочие', value: 1.67, color: '#8b5cf6' },
    ],
    topProjects: [
      { name: 'ЖК "Горизонт"', profit: 12_450_000, margin: 42.5 },
      { name: 'БЦ "Кристалл"', profit: 8_900_000, margin: 38.2 },
      { name: 'ТЦ "Атриум"', profit: 7_200_000, margin: 35.8 },
      { name: 'Вилла "Озерная"', profit: 5_600_000, margin: 45.1 },
      { name: 'Реновация цеха №4', profit: 4_800_000, margin: 31.4 },
    ],
    topContractors: [
      { name: 'ООО "СтройТех"', amount: 8_450_000, share: 29.7 },
      { name: 'ИП Иванов А.В.', amount: 4_200_000, share: 14.8 },
      { name: 'ПАО "ЭнергоСбыт"', amount: 2_800_000, share: 9.8 },
      { name: 'ООО "ЛогистикГрупп"', amount: 1_950_000, share: 6.9 },
      { name: 'АО "МеталлИнвест"', amount: 1_500_000, share: 5.3 },
    ],
  },
  '2026-01': {
    kpiData: [
      { label: 'Доходы', value: 41_800_000, trend: 6.4, icon: TrendingUp, color: 'blue' },
      { label: 'Расходы', value: 30_120_000, trend: -2.1, icon: TrendingDown, color: 'red' },
      { label: 'Чистая прибыль', value: 11_680_000, trend: 4.9, icon: DollarSign, color: 'green' },
      { label: 'Остаток денежных средств', value: 20_940_000, trend: 2.2, icon: Wallet, color: 'purple' },
      {
        label: 'Рентабельность',
        value: 27.9,
        trend: 1.1,
        icon: PieChart,
        color: 'indigo',
        isPercent: true,
      },
      {
        label: 'Ежемесячные накопления',
        value: 9_540_000,
        trend: -1.9,
        icon: ArrowUpRight,
        color: 'orange',
      },
    ],
    dynamicsData: [
      { name: 'Авг', доходы: 25, расходы: 22 },
      { name: 'Сен', доходы: 28, расходы: 24 },
      { name: 'Окт', доходы: 31, расходы: 27 },
      { name: 'Ноя', доходы: 33, расходы: 29 },
      { name: 'Дек', доходы: 37, расходы: 31 },
      { name: 'Янв', доходы: 42, расходы: 30 },
    ],
    structureData: [
      { name: 'Персонал', value: 16.9, color: '#3b82f6' },
      { name: 'Закупка', value: 4.1, color: '#10b981' },
      { name: 'Аренда', value: 3.3, color: '#f59e0b' },
      { name: 'Маркетинг', value: 1.95, color: '#ef4444' },
      { name: 'Прочие', value: 1.45, color: '#8b5cf6' },
    ],
    topProjects: [
      { name: 'ЖК "Горизонт"', profit: 10_900_000, margin: 38.4 },
      { name: 'БЦ "Кристалл"', profit: 7_740_000, margin: 36.5 },
      { name: 'ТЦ "Атриум"', profit: 6_820_000, margin: 33.8 },
      { name: 'Вилла "Озерная"', profit: 4_920_000, margin: 41.2 },
      { name: 'Реновация цеха №4', profit: 4_150_000, margin: 28.9 },
    ],
    topContractors: [
      { name: 'ООО "СтройТех"', amount: 7_900_000, share: 27.9 },
      { name: 'ИП Иванов А.В.', amount: 3_860_000, share: 13.8 },
      { name: 'ПАО "ЭнергоСбыт"', amount: 2_620_000, share: 9.3 },
      { name: 'ООО "ЛогистикГрупп"', amount: 1_720_000, share: 6.1 },
      { name: 'АО "МеталлИнвест"', amount: 1_380_000, share: 4.9 },
    ],
  },
};

const KPI_FALLBACK_DATA: KpiCard[] = [
  { label: 'Доходы', value: 45_230_000, trend: 12.5, icon: TrendingUp, color: 'blue' },
  { label: 'Расходы', value: 28_450_000, trend: -8.3, icon: TrendingDown, color: 'red' },
  { label: 'Чистая прибыль', value: 16_780_000, trend: 15.2, icon: DollarSign, color: 'green' },
  { label: 'Остаток денежных средств', value: 23_560_000, trend: 4.7, icon: Wallet, color: 'purple' },
  {
    label: 'Рентабельность',
    value: 37.1,
    trend: 2.3,
    icon: PieChart,
    color: 'indigo',
    isPercent: true,
  },
  {
    label: 'Ежемесячные накопления',
    value: 12_340_000,
    trend: -5.6,
    icon: ArrowUpRight,
    color: 'orange',
  },
];

export default function DashboardPage() {
  const selectedMonthKey = useReportingPeriodStore((state) => state.selectedMonthKey);
  const reportingMonth = getReportingMonthByKey(selectedMonthKey);
  const dashboardSnapshot =
    DASHBOARD_DATA_BY_MONTH[selectedMonthKey] ?? DASHBOARD_DATA_BY_MONTH['2026-02'];
  const kpiData = dashboardSnapshot?.kpiData ?? KPI_FALLBACK_DATA;
  const dynamicsData = dashboardSnapshot?.dynamicsData ?? DASHBOARD_DATA_BY_MONTH['2026-02'].dynamicsData;
  const structureData = dashboardSnapshot?.structureData ?? DASHBOARD_DATA_BY_MONTH['2026-02'].structureData;
  const topProjects = dashboardSnapshot?.topProjects ?? DASHBOARD_DATA_BY_MONTH['2026-02'].topProjects;
  const topContractors =
    dashboardSnapshot?.topContractors ?? DASHBOARD_DATA_BY_MONTH['2026-02'].topContractors;

  return (
    <div
      key={selectedMonthKey}
      className="space-y-8 p-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
    >
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Рабочий стол</h1>
        <p className="mt-1 text-slate-500">
          Обзор ключевых финансовых показателей за{' '}
          <span className="font-semibold capitalize text-slate-700">{reportingMonth.label}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="glass-card glass-card-hover group cursor-default p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {kpi.label}
                  </p>
                  <h3 className="data-value text-2xl font-bold text-slate-900">
                    {kpi.isPercent ? `${kpi.value}%` : formatMoneyRub(kpi.value)}
                  </h3>
                  <div
                    className={cn(
                      'mt-3 flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold',
                      kpi.trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    )}
                  >
                    {kpi.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span>{Math.abs(kpi.trend)}%</span>
                  </div>
                </div>
                <div
                  className={cn(
                    'rounded-2xl p-4 transition-all duration-300 group-hover:scale-110',
                    kpi.color === 'blue' && 'bg-blue-50 text-blue-600',
                    kpi.color === 'red' && 'bg-red-50 text-red-600',
                    kpi.color === 'green' && 'bg-emerald-50 text-emerald-600',
                    kpi.color === 'purple' && 'bg-purple-50 text-purple-600',
                    kpi.color === 'indigo' && 'bg-indigo-50 text-indigo-600',
                    kpi.color === 'orange' && 'bg-orange-50 text-orange-600'
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="glass-card p-6">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-900">Динамика расходов и доходов</h3>
            <p className="text-sm text-slate-500">Тенденции за последние 6 месяцев</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dynamicsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `${value}M`} />
                <Tooltip />
                <Line type="monotone" dataKey="доходы" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="расходы" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-900">Структура расходов</h3>
            <p className="text-sm text-slate-500">Распределение по категориям</p>
          </div>
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={structureData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {structureData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {structureData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-600">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatMoneyRub(item.value * 1_000_000)}</p>
                    <p className="text-[10px] text-slate-400">
                      {((item.value / structureData.reduce((sum, row) => sum + row.value, 0)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 p-6">
            <Briefcase className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-slate-900">Топ-5 прибыльных проектов</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3 font-semibold">Название</th>
                <th className="px-6 py-3 text-right font-semibold">Прибыль</th>
                <th className="px-6 py-3 text-right font-semibold">Рентабельность</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProjects.map((row) => (
                <tr key={row.name} className="cursor-pointer transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{row.name}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">{formatMoneyRub(row.profit)}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-500">{row.margin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 p-6">
            <Users className="h-5 w-5 text-red-500" />
            <h3 className="font-bold text-slate-900">Топ-5 контрагентов по расходам</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3 font-semibold">Контрагент</th>
                <th className="px-6 py-3 text-right font-semibold">Сумма расходов</th>
                <th className="px-6 py-3 text-right font-semibold">Доля</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topContractors.map((row) => (
                <tr key={row.name} className="cursor-pointer transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{row.name}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-red-600">{formatMoneyRub(row.amount)}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-500">{row.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
