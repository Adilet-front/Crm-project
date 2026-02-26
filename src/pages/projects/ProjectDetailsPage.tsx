import { useMemo } from 'react';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useFinanceStore } from '@/entities/finance/model/store';
import { formatMoneyRub, formatPercent } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

const toProgress = (fact: number, plan: number) => {
  if (plan <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (fact / plan) * 100));
};

const toDateStamp = (dateValue: string) => new Date(dateValue).getTime();

export default function ProjectDetailsPage() {
  const { projectId = '' } = useParams();

  const projects = useFinanceStore((state) => state.projects);
  const operations = useFinanceStore((state) => state.operations);
  const requests = useFinanceStore((state) => state.requests);

  const normalizedProjectId = Number(projectId);
  const project =
    Number.isInteger(normalizedProjectId) && normalizedProjectId > 0
      ? projects.find((entry) => entry.id === normalizedProjectId)
      : undefined;

  const projectOperations = useMemo(() => {
    if (!project) {
      return [];
    }

    return operations
      .filter((operation) => operation.project === project.name)
      .sort((left, right) => toDateStamp(right.date) - toDateStamp(left.date));
  }, [operations, project]);

  const projectRequests = useMemo(() => {
    if (!project) {
      return [];
    }

    return requests
      .filter((request) => request.project === project.name)
      .sort((left, right) => toDateStamp(right.date) - toDateStamp(left.date));
  }, [project, requests]);

  if (!project) {
    return (
      <div className="space-y-6 p-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <div className="glass-card p-10 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Проект не найден</h1>
          <p className="mt-2 text-slate-500">
            Проверьте ссылку или вернитесь в общий список проектов.
          </p>
          <Link
            to="/projects"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            К проектам
          </Link>
        </div>
      </div>
    );
  }

  const revenueProgress = toProgress(project.revenue.fact, project.revenue.plan);
  const expensesProgress = toProgress(project.expenses.fact, project.expenses.plan);

  return (
    <div className="space-y-6 p-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-600 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            К проектам
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{project.name}</h1>
          <p className="mt-1 text-slate-500">
            {project.direction} • Менеджер: {project.manager}
          </p>
        </div>

        <span
          className={cn(
            'status-badge',
            project.status === 'Активен' && 'bg-emerald-50 text-emerald-600',
            project.status === 'Завершен' && 'bg-slate-100 text-slate-500',
            project.status === 'Приостановлен' && 'bg-amber-50 text-amber-600'
          )}
        >
          {project.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="glass-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Выручка</p>
            <p className="data-value text-lg font-bold text-slate-900">{formatMoneyRub(project.revenue.fact)}</p>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            План: {formatMoneyRub(project.revenue.plan)}
          </p>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${revenueProgress}%` }}
            />
          </div>
        </article>

        <article className="glass-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Расходы</p>
            <p className="data-value text-lg font-bold text-slate-900">{formatMoneyRub(project.expenses.fact)}</p>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            План: {formatMoneyRub(project.expenses.plan)}
          </p>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-rose-500 transition-all duration-500"
              style={{ width: `${expensesProgress}%` }}
            />
          </div>
        </article>

        <article className="glass-card p-6">
          <p className="text-sm font-semibold text-slate-500">Прибыль</p>
          <p
            className={cn(
              'data-value mt-2 text-2xl font-bold',
              project.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            )}
          >
            {formatMoneyRub(project.profit)}
          </p>
        </article>

        <article className="glass-card p-6">
          <p className="text-sm font-semibold text-slate-500">Рентабельность</p>
          <p
            className={cn(
              'data-value mt-2 text-2xl font-bold',
              project.margin >= 0 ? 'text-brand-600' : 'text-rose-600'
            )}
          >
            {formatPercent(project.margin)}
          </p>
        </article>
      </div>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">Операции по проекту</h2>
          <p className="text-xs text-slate-500">Связанные движения денежных средств</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                <th className="px-6 py-4">Дата</th>
                <th className="px-6 py-4">Описание</th>
                <th className="px-6 py-4">Контрагент</th>
                <th className="px-6 py-4">Счет</th>
                <th className="px-6 py-4 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectOperations.map((operation) => (
                <tr key={operation.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{operation.date}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">{operation.description}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{operation.contractor}</td>
                  <td className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">{operation.account}</td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={cn(
                        'data-value inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-sm font-bold',
                        operation.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      )}
                    >
                      {operation.amount >= 0 ? (
                        <Plus className="h-3.5 w-3.5" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                      {formatMoneyRub(Math.abs(operation.amount))}
                    </span>
                  </td>
                </tr>
              ))}
              {projectOperations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                    По проекту пока нет операций.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">Заявки по проекту</h2>
          <p className="text-xs text-slate-500">История согласований и статусов оплаты</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                <th className="px-6 py-4">Дата</th>
                <th className="px-6 py-4">Инициатор</th>
                <th className="px-6 py-4">Назначение</th>
                <th className="px-6 py-4 text-center">Статус</th>
                <th className="px-6 py-4 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectRequests.map((request) => (
                <tr key={request.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{request.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{request.initiator}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">{request.purpose}</td>
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
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="data-value text-sm font-bold text-slate-900">{formatMoneyRub(request.amount)}</p>
                  </td>
                </tr>
              ))}
              {projectRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                    По проекту пока нет заявок.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
