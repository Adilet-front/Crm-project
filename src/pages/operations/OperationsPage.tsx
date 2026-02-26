import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getReportingMonthByKey,
  REPORTING_MONTHS,
  useReportingPeriodStore,
} from '@/entities/finance/model/periodStore';
import { useFinanceStore, type OperationType } from '@/entities/finance/model/store';
import { cn } from '@/shared/lib/cn';
import { formatMoneyRub } from '@/shared/lib/format';
import { Select as AppSelect } from '@/shared/ui/shadcn/select';
import { toast } from '@/shared/ui/shadcn/sonner';

const OPERATIONS_PER_PAGE = 5;
const DESCRIPTION_MAX_LENGTH = 120;
const CONTRACTOR_MAX_LENGTH = 100;

export default function OperationsPage() {
  const { user } = useAuth();
  const operations = useFinanceStore((state) => state.operations);
  const addOperation = useFinanceStore((state) => state.addOperation);
  const getExpenseBudgetWarning = useFinanceStore((state) => state.getExpenseBudgetWarning);
  const selectedMonthKey = useReportingPeriodStore((state) => state.selectedMonthKey);
  const setMonthByKey = useReportingPeriodStore((state) => state.setMonthByKey);
  const selectedMonth = getReportingMonthByKey(selectedMonthKey);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<OperationType>('Приход');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Все типы');
  const [accountFilter, setAccountFilter] = useState('Все счета');
  const [projectFilter, setProjectFilter] = useState('Все проекты');
  const [contractorFilter, setContractorFilter] = useState('Все контрагенты');
  const [categoryFilter, setCategoryFilter] = useState('Все статьи ДДС');
  const [currentPage, setCurrentPage] = useState(1);

  const isReadOnly = user?.role === 'owner' || user?.role === 'pm';

  const contractorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          operations
            .map((operation) => operation.contractor.trim())
            .filter((contractor) => contractor && contractor !== '-')
        )
      ).sort((left, right) => left.localeCompare(right, 'ru')),
    [operations]
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          operations
            .map((operation) => operation.category.trim())
            .filter((category) => category && category !== '-')
        )
      ).sort((left, right) => left.localeCompare(right, 'ru')),
    [operations]
  );

  const filteredOperations = useMemo(() => {
    return operations.filter((operation) => {
      const normalizedSearch = search.toLowerCase();
      const matchesSearch =
        operation.description.toLowerCase().includes(normalizedSearch) ||
        operation.contractor.toLowerCase().includes(normalizedSearch);
      const matchesType = typeFilter === 'Все типы' || operation.type === typeFilter;
      const matchesAccount = accountFilter === 'Все счета' || operation.account.includes(accountFilter);
      const matchesProject = projectFilter === 'Все проекты' || operation.project === projectFilter;
      const matchesContractor =
        contractorFilter === 'Все контрагенты' || operation.contractor === contractorFilter;
      const matchesCategory = categoryFilter === 'Все статьи ДДС' || operation.category === categoryFilter;
      const matchesPeriod = operation.date.startsWith(selectedMonthKey);

      return (
        matchesSearch &&
        matchesType &&
        matchesAccount &&
        matchesProject &&
        matchesContractor &&
        matchesCategory &&
        matchesPeriod
      );
    });
  }, [
    operations,
    search,
    typeFilter,
    accountFilter,
    projectFilter,
    contractorFilter,
    categoryFilter,
    selectedMonthKey,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredOperations.length / OPERATIONS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedOperations = useMemo(() => {
    const startIndex = (activePage - 1) * OPERATIONS_PER_PAGE;
    return filteredOperations.slice(startIndex, startIndex + OPERATIONS_PER_PAGE);
  }, [filteredOperations, activePage]);

  const visiblePages = useMemo(() => {
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, activePage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);
    start = Math.max(1, end - maxVisiblePages + 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [activePage, totalPages]);

  const shownFrom = filteredOperations.length === 0 ? 0 : (activePage - 1) * OPERATIONS_PER_PAGE + 1;
  const shownTo = Math.min(activePage * OPERATIONS_PER_PAGE, filteredOperations.length);

  const handleAddOperation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const amountRaw = Number(formData.get('amount') ?? 0);
    const description = String(formData.get('description') ?? '')
      .trim()
      .slice(0, DESCRIPTION_MAX_LENGTH);
    const project = String(formData.get('project') ?? '-');
    const contractor =
      String(formData.get('contractor') ?? '-')
        .trim()
        .slice(0, CONTRACTOR_MAX_LENGTH) || '-';
    const account = String(formData.get('account') ?? 'Расчетный счет (Сбер)');
    const category = String(formData.get('category') ?? 'Прочее');

    if (!amountRaw || !description) {
      toast.error('Заполните обязательные поля');
      return;
    }

    const amountAbs = Math.abs(amountRaw);
    const amount = modalType === 'Расход' ? -amountAbs : amountAbs;
    const dayInMonth = String(Math.min(new Date().getDate(), 28)).padStart(2, '0');
    const operationDraft = {
      date: `${selectedMonthKey}-${dayInMonth}`,
      type: modalType,
      description,
      category,
      project,
      contractor,
      account,
      amount,
    };
    const budgetWarning = getExpenseBudgetWarning(operationDraft);

    addOperation(operationDraft);

    if (budgetWarning) {
      toast.warning(
        `Превышен лимит по статье "${budgetWarning.category}" на ${formatMoneyRub(budgetWarning.overflow)}`
      );
    }

    toast.success('Операция успешно добавлена');
    setIsModalOpen(false);
    event.currentTarget.reset();
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('Все типы');
    setAccountFilter('Все счета');
    setProjectFilter('Все проекты');
    setContractorFilter('Все контрагенты');
    setCategoryFilter('Все статьи ДДС');
    setCurrentPage(1);
  };

  return (
    <div
      key={selectedMonthKey}
      className="space-y-6 p-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Операции</h1>
          <p className="mt-1 text-slate-500">
            Полная лента движений денежных средств за{' '}
            <span className="font-semibold capitalize text-slate-700">{selectedMonth.label}</span>
          </p>
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setModalType('Приход');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700"
            >
              <Plus className="h-5 w-5" />
              Приход
            </button>
            <button
              onClick={() => {
                setModalType('Расход');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-rose-100 transition-all hover:bg-rose-700"
            >
              <Minus className="h-5 w-5" />
              Расход
            </button>
            <button
              onClick={() => {
                setModalType('Перевод');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700"
            >
              <RefreshCw className="h-5 w-5" />
              Перевод
            </button>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по описанию..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              maxLength={DESCRIPTION_MAX_LENGTH}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <AppSelect
              value={selectedMonthKey}
              onChange={(event) => {
                setMonthByKey(event.target.value);
                setCurrentPage(1);
              }}
              className="app-select w-full pl-10"
            >
              {REPORTING_MONTHS.map((month) => (
                <option key={month.key} value={month.key} className="capitalize">
                  {month.label}
                </option>
              ))}
            </AppSelect>
          </div>

          <AppSelect
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="app-select"
          >
            <option>Все типы</option>
            <option>Приход</option>
            <option>Расход</option>
            <option>Перевод</option>
          </AppSelect>

          <AppSelect
            value={accountFilter}
            onChange={(event) => {
              setAccountFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="app-select"
          >
            <option>Все счета</option>
            <option>Сбер</option>
            <option>ВТБ</option>
            <option>Касса</option>
          </AppSelect>

          <AppSelect
            value={projectFilter}
            onChange={(event) => {
              setProjectFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="app-select"
          >
            <option>Все проекты</option>
            <option>ЖК "Горизонт"</option>
            <option>БЦ "Кристалл"</option>
            <option>Вилла "Озерная"</option>
          </AppSelect>

          <AppSelect
            value={contractorFilter}
            onChange={(event) => {
              setContractorFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="app-select"
          >
            <option>Все контрагенты</option>
            {contractorOptions.map((contractor) => (
              <option key={contractor}>{contractor}</option>
            ))}
          </AppSelect>

          <AppSelect
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="app-select"
          >
            <option>Все статьи ДДС</option>
            {categoryOptions.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </AppSelect>

          <button
            onClick={resetFilters}
            className="w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div>
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:text-[10px] sm:tracking-[0.15em]">
                <th className="w-[13%] px-3 py-5 md:px-4 xl:px-6">Дата / ID</th>
                <th className="w-[10%] px-3 py-5 md:px-4 xl:px-6">Тип</th>
                <th className="w-[27%] px-3 py-5 md:px-4 xl:px-6">Описание / Контрагент</th>
                <th className="w-[19%] px-3 py-5 md:px-4 xl:px-6">Проект / Категория</th>
                <th className="w-[13%] px-3 py-5 md:px-4 xl:px-6">Счет</th>
                <th className="w-[18%] px-3 py-5 text-right md:px-4 xl:px-6">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOperations.map((operation) => (
                <tr key={operation.id} className="group cursor-default transition-colors hover:bg-slate-50/80">
                  <td className="px-3 py-4 md:px-4 xl:px-6">
                    <p className="data-value text-sm font-bold text-slate-900">{operation.date}</p>
                    <p className="font-mono text-[10px] text-slate-400">#OP-{String(operation.id).padStart(4, '0')}</p>
                  </td>
                  <td className="px-3 py-4 md:px-4 xl:px-6">
                    <span
                      className={cn(
                        'status-badge',
                        operation.type === 'Приход' && 'bg-emerald-50 text-emerald-600',
                        operation.type === 'Расход' && 'bg-rose-50 text-rose-600',
                        operation.type === 'Перевод' && 'bg-blue-50 text-blue-600'
                      )}
                    >
                      {operation.type}
                    </span>
                  </td>
                  <td className="px-3 py-4 md:px-4 xl:px-6">
                    <p
                      title={operation.description}
                      className="max-w-[200px] truncate text-sm font-semibold text-slate-700 transition-colors group-hover:text-brand-600 md:max-w-[240px] xl:max-w-[280px]"
                    >
                      {operation.description}
                    </p>
                    <p
                      title={operation.contractor}
                      className="max-w-[200px] truncate text-[11px] font-medium text-slate-400 md:max-w-[240px] xl:max-w-[280px]"
                    >
                      {operation.contractor}
                    </p>
                  </td>
                  <td className="px-3 py-4 md:px-4 xl:px-6">
                    <div className="flex flex-col gap-1.5">
                      <span
                        title={operation.project}
                        className="max-w-[130px] truncate rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 md:max-w-[160px] xl:max-w-[180px]"
                      >
                        {operation.project}
                      </span>
                      <span
                        title={operation.category}
                        className="max-w-[130px] truncate rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:max-w-[160px] xl:max-w-[180px]"
                      >
                        {operation.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 md:px-4 xl:px-6">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-brand-400" />
                      <span
                        title={operation.account}
                        className="block max-w-[120px] truncate text-xs font-bold uppercase text-slate-600 md:max-w-[150px] xl:max-w-[180px]"
                      >
                        {operation.account}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right md:px-4 xl:px-6">
                    <div
                      className={cn(
                        'data-value ml-auto inline-flex max-w-full min-w-0 items-center justify-end gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold leading-tight sm:px-3 sm:text-sm',
                        operation.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      )}
                    >
                      {operation.amount >= 0 ? (
                        <Plus className="h-3 w-3 shrink-0" />
                      ) : (
                        <Minus className="h-3 w-3 shrink-0" />
                      )}
                      <span className="min-w-0 max-w-[5.75rem] break-words text-right leading-tight sm:max-w-none sm:whitespace-nowrap">
                        {formatMoneyRub(Math.abs(operation.amount))}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedOperations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500 md:px-4 xl:px-6">
                    По текущим фильтрам операций не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4">
          <p className="text-sm text-slate-500">
            Показано {shownFrom}-{shownTo} из {filteredOperations.length} операций
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, Math.min(page, totalPages) - 1))}
              disabled={activePage === 1}
              className="rounded-lg border border-slate-200 p-2 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {visiblePages.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-semibold transition-all',
                  page === activePage
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 hover:bg-white'
                )}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((page) => Math.min(totalPages, Math.min(page, totalPages) + 1))}
              disabled={activePage === totalPages}
              className="rounded-lg border border-slate-200 p-2 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
              <h2 className="text-xl font-bold text-slate-900">Новая операция: {modalType}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddOperation} noValidate className="space-y-6 p-8">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Сумма</label>
                  <input
                    name="amount"
                    type="number"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Описание</label>
                  <input
                    name="description"
                    type="text"
                    required
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    placeholder="Назначение платежа..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Счет</label>
                    <AppSelect
                      name="account"
                      className="app-select w-full"
                    >
                      <option>Расчетный счет (Сбер)</option>
                      <option>Расчетный счет (ВТБ)</option>
                      <option>Касса</option>
                    </AppSelect>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Проект</label>
                    <AppSelect
                      name="project"
                      className="app-select w-full"
                    >
                      <option>ЖК "Горизонт"</option>
                      <option>БЦ "Кристалл"</option>
                      <option>Вилла "Озерная"</option>
                      <option>Общие расходы</option>
                    </AppSelect>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Контрагент</label>
                    <input
                      name="contractor"
                      type="text"
                      maxLength={CONTRACTOR_MAX_LENGTH}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                      placeholder="ООО..."
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Статья ДДС</label>
                    <AppSelect
                      name="category"
                      className="app-select w-full"
                    >
                      <option>Выручка</option>
                      <option>Материалы</option>
                      <option>Аренда</option>
                      <option>Зарплата</option>
                      <option>Налоги</option>
                    </AppSelect>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4 sm:pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
          </div>
        </div>
      )}
    </div>
  );
}
