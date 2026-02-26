import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getReportingMonthByKey,
  useReportingPeriodStore,
} from '@/entities/finance/model/periodStore';
import { useFinanceStore, type RequestStatus } from '@/entities/finance/model/store';
import { canPerformAction } from '@/entities/user/model/access';
import { cn } from '@/shared/lib/cn';
import { formatMoneyRub } from '@/shared/lib/format';
import { Select as AppSelect } from '@/shared/ui/shadcn/select';
import { toast } from '@/shared/ui/shadcn/sonner';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const requests = useFinanceStore((state) => state.requests);
  const addRequest = useFinanceStore((state) => state.addRequest);
  const updateRequestStatus = useFinanceStore((state) => state.updateRequestStatus);
  const selectedMonthKey = useReportingPeriodStore((state) => state.selectedMonthKey);
  const selectedMonth = getReportingMonthByKey(selectedMonthKey);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Все статусы');
  const [initiatorFilter, setInitiatorFilter] = useState('Все инициаторы');

  const isPM = user?.role === 'pm';
  const canManageApprovals = user ? canPerformAction(user.role, 'approvals:write') : false;
  const isActionableStatus = (status: RequestStatus) =>
    status === 'Новая' || status === 'На рассмотрении';

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const normalizedSearch = search.toLowerCase();
      const matchesSearch =
        request.purpose.toLowerCase().includes(normalizedSearch) ||
        request.project.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'Все статусы' || request.status === statusFilter;
      const matchesInitiator =
        initiatorFilter === 'Все инициаторы' || request.initiator === initiatorFilter;
      const matchesPmScope = !isPM || request.initiator === user?.name;
      const matchesPeriod = request.date.startsWith(selectedMonthKey);

      return matchesSearch && matchesStatus && matchesInitiator && matchesPmScope && matchesPeriod;
    });
  }, [requests, search, statusFilter, initiatorFilter, isPM, user?.name, selectedMonthKey]);

  const hasActionableRows = filteredRequests.some((request) => isActionableStatus(request.status));
  const shouldShowActionColumn = canManageApprovals && hasActionableRows;

  const handleCreateRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const amount = Number(formData.get('amount') ?? 0);
    const project = String(formData.get('project') ?? '').trim();
    const purpose = String(formData.get('purpose') ?? '').trim();

    if (!amount || !purpose || !project) {
      toast.error('Заполните обязательные поля');
      return;
    }

    const dayInMonth = String(Math.min(new Date().getDate(), 28)).padStart(2, '0');

    addRequest({
      initiator: user?.name ?? 'Unknown',
      date: `${selectedMonthKey}-${dayInMonth}`,
      amount,
      purpose,
      project,
      status: 'Новая',
    });

    setIsModalOpen(false);
    event.currentTarget.reset();
    toast.success('Заявка успешно создана');
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('Все статусы');
    setInitiatorFilter('Все инициаторы');
  };

  const handleApproveRequest = (requestId: number) => {
    if (!canManageApprovals) {
      toast.warning('Недостаточно прав для согласования заявок');
      return;
    }

    updateRequestStatus(requestId, 'Одобрено');
    toast.success('Заявка одобрена');
  };

  const handleRejectRequest = (requestId: number) => {
    if (!canManageApprovals) {
      toast.warning('Недостаточно прав для согласования заявок');
      return;
    }

    updateRequestStatus(requestId, 'Отклонено');
    toast.success('Заявка отклонена');
  };

  return (
    <div
      key={selectedMonthKey}
      className="space-y-6 p-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isPM ? 'Мои заявки' : 'Согласование платежей'}
          </h1>
          <p className="mt-1 text-slate-500">
            Управление заявками на оплату и их статусами за{' '}
            <span className="font-semibold capitalize text-slate-700">{selectedMonth.label}</span>
          </p>
        </div>

        {isPM && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Создать заявку
          </button>
        )}
      </div>

      <div className="glass-card flex flex-wrap items-center gap-4 p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по назначению..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <AppSelect
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="app-select"
        >
          <option>Все статусы</option>
          <option>Новая</option>
          <option>На рассмотрении</option>
          <option>Одобрено</option>
          <option>Отклонено</option>
          <option>Оплачено</option>
        </AppSelect>

        {!isPM && (
          <AppSelect
            value={initiatorFilter}
            onChange={(event) => setInitiatorFilter(event.target.value)}
            className="app-select"
          >
            <option>Все инициаторы</option>
            <option>Елена Соколова</option>
            <option>Иван Петров</option>
            <option>Алексей Смирнов</option>
          </AppSelect>
        )}

        <button
          onClick={resetFilters}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                <th className="px-6 py-5">Инициатор / Дата</th>
                <th className="px-6 py-5">Назначение платежа</th>
                <th className="px-6 py-5">Проект</th>
                <th className="px-6 py-5 text-right whitespace-nowrap">Сумма</th>
                <th className="px-6 py-5 text-center">Статус</th>
                {shouldShowActionColumn && <th className="w-[188px] px-4 py-5 text-center">Действие</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="group cursor-default transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{request.initiator}</p>
                    <p className="font-mono text-[10px] text-slate-400">{request.date}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-700 transition-colors group-hover:text-brand-600">
                      {request.purpose}
                    </p>
                    {request.reason ? (
                      <p className="mt-1 text-xs text-rose-600">Причина: {request.reason}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <span className="w-fit rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600">
                      {request.project}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <p className="data-value inline-block whitespace-nowrap text-sm font-bold text-slate-900">
                      {formatMoneyRub(request.amount)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={cn(
                        'status-badge mx-auto',
                        request.status === 'Новая' && 'bg-amber-50 text-amber-600',
                        request.status === 'На рассмотрении' && 'bg-blue-50 text-blue-600',
                        request.status === 'Одобрено' && 'bg-emerald-50 text-emerald-600',
                        request.status === 'Отклонено' && 'bg-rose-50 text-rose-600',
                        request.status === 'Оплачено' && 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {request.status === 'Новая' && <AlertCircle className="h-3 w-3" />}
                      {request.status === 'На рассмотрении' && <Clock className="h-3 w-3" />}
                      {request.status === 'Одобрено' && <CheckCircle2 className="h-3 w-3" />}
                      {request.status === 'Отклонено' && <XCircle className="h-3 w-3" />}
                      {request.status}
                    </span>
                  </td>
                  {shouldShowActionColumn && (
                    <td className="w-[188px] px-4 py-4 align-middle">
                      {isActionableStatus(request.status) ? (
                        <div className="mx-auto flex w-[156px] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(request.id)}
                            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500 bg-white px-3 text-sm font-semibold text-emerald-600 whitespace-nowrap transition-all duration-200 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Одобрить
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(request.id)}
                            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-rose-500 bg-white px-3 text-sm font-semibold text-slate-900 whitespace-nowrap transition-all duration-200 hover:bg-rose-50"
                          >
                            <XCircle className="h-4 w-4 shrink-0" />
                            Отклонить
                          </button>
                        </div>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
              <h2 className="text-xl font-bold text-slate-900">Новая заявка на оплату</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-6 p-8">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Сумма</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₽</span>
                    <input
                      name="amount"
                      type="number"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-4 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
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

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Назначение платежа</label>
                  <textarea
                    name="purpose"
                    required
                    className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    placeholder="Например: Оплата счета №45 от 20.02..."
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
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
                  Отправить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
