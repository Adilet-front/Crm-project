import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Briefcase, ChevronRight, Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceStore, type Project } from '@/entities/finance/model/store';
import { canPerformAction } from '@/entities/user/model/access';
import { cn } from '@/shared/lib/cn';
import { formatMoneyRub } from '@/shared/lib/format';
import { Select as AppSelect } from '@/shared/ui/shadcn/select';
import { toast } from '@/shared/ui/shadcn/sonner';

const DIRECTION_OPTIONS = ['Строительство', 'Аренда', 'Производство', 'Управление'];
const MANAGER_OPTIONS = ['Елена Соколова', 'Иван Петров', 'Алексей Смирнов'];

export default function ProjectsPage() {
  const { user } = useAuth();
  const projects = useFinanceStore((state) => state.projects);
  const addProject = useFinanceStore((state) => state.addProject);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState('Все направления');
  const [managerFilter, setManagerFilter] = useState('Все менеджеры');
  const [statusFilter, setStatusFilter] = useState('Все статусы');

  const isPM = user?.role === 'pm';
  const canCreateProject = user ? canPerformAction(user.role, 'projects:write') : false;

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase());
      const matchesDirection = directionFilter === 'Все направления' || project.direction === directionFilter;
      const matchesManager = managerFilter === 'Все менеджеры' || project.manager === managerFilter;
      const matchesStatus = statusFilter === 'Все статусы' || project.status === statusFilter;
      const matchesPmScope = !isPM || project.manager === user?.name;

      return matchesSearch && matchesDirection && matchesManager && matchesStatus && matchesPmScope;
    });
  }, [projects, search, directionFilter, managerFilter, statusFilter, isPM, user?.name]);

  const handleCreateProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateProject) {
      setIsModalOpen(false);
      toast.warning('Недостаточно прав для создания проекта');
      return;
    }

    const formData = new FormData(event.currentTarget);

    const name = String(formData.get('name') ?? '').trim();
    const direction = String(formData.get('direction') ?? 'Строительство');
    const manager = String(formData.get('manager') ?? 'Елена Соколова');
    const planRevenueRaw = Number(formData.get('planRevenue') ?? 0);
    const planExpensesRaw = Number(formData.get('planExpenses') ?? 0);

    if (!name) {
      toast.error('Введите название проекта');
      return;
    }

    const planRevenue = Number.isFinite(planRevenueRaw) && planRevenueRaw > 0 ? planRevenueRaw : 1_000_000;
    const planExpenses = Number.isFinite(planExpensesRaw) && planExpensesRaw >= 0 ? planExpensesRaw : 800_000;

    const projectDraft: Omit<Project, 'id'> = {
      name,
      direction,
      manager,
      status: 'Активен',
      revenue: { fact: 0, plan: planRevenue },
      expenses: { fact: 0, plan: planExpenses },
      profit: 0,
      margin: 0,
    };

    addProject(projectDraft);
    setIsModalOpen(false);
    event.currentTarget.reset();
    toast.success('Проект успешно создан');
  };

  const resetFilters = () => {
    setSearch('');
    setDirectionFilter('Все направления');
    setManagerFilter('Все менеджеры');
    setStatusFilter('Все статусы');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{isPM ? 'Мои проекты' : 'Проекты'}</h1>
          <p className="mt-1 text-slate-500">Управление и мониторинг прибыльности проектов</p>
        </div>
        {canCreateProject && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Новый проект
          </button>
        )}
      </div>

      <div className="glass-card flex flex-wrap items-center gap-4 p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <AppSelect
          value={directionFilter}
          onChange={(event) => setDirectionFilter(event.target.value)}
          className="app-select"
        >
          <option>Все направления</option>
          {DIRECTION_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </AppSelect>

        {!isPM && (
          <AppSelect
            value={managerFilter}
            onChange={(event) => setManagerFilter(event.target.value)}
            className="app-select"
          >
            <option>Все менеджеры</option>
            {MANAGER_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </AppSelect>
        )}

        <AppSelect
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="app-select"
        >
          <option>Все статусы</option>
          <option>Активен</option>
          <option>Завершен</option>
          <option>Приостановлен</option>
        </AppSelect>

        <button
          onClick={resetFilters}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {filteredProjects.map((project) => {
          const progress =
            project.revenue.plan > 0
              ? Math.max(0, Math.min(100, (project.revenue.fact / project.revenue.plan) * 100))
              : 0;

          return (
            <div key={project.id} className="glass-card glass-card-hover group overflow-hidden">
              <div className="p-8">
                <div className="mb-6 flex items-start justify-between">
                  <div className="rounded-2xl bg-brand-50 p-4 text-brand-600 transition-all duration-500 group-hover:bg-brand-500 group-hover:text-white">
                    <Briefcase className="h-7 w-7" />
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

                <h3 className="mb-2 text-xl font-bold text-slate-900 transition-colors group-hover:text-brand-600">
                  {project.name}
                </h3>
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">{project.direction}</p>

                <div className="mb-8 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-400">Бюджет</span>
                    <span className="data-value font-bold text-slate-900">{formatMoneyRub(project.revenue.plan)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-600">
                      {project.manager
                        .split(' ')
                        .map((word) => word[0])
                        .join('')}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{project.manager}</span>
                  </div>
                  <button className="group/btn flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-brand-500 transition-colors hover:text-brand-700">
                    Детали
                    <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
              <h2 className="text-xl font-bold text-slate-900">Новый проект</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-6 p-8">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Название</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    placeholder="Введите название..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Направление</label>
                    <AppSelect
                      name="direction"
                      className="app-select w-full"
                    >
                      {DIRECTION_OPTIONS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </AppSelect>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Менеджер</label>
                    <AppSelect
                      name="manager"
                      className="app-select w-full"
                    >
                      {MANAGER_OPTIONS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </AppSelect>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">План выручки</label>
                    <input
                      name="planRevenue"
                      type="number"
                      min={0}
                      defaultValue={1_000_000}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">План расходов</label>
                    <input
                      name="planExpenses"
                      type="number"
                      min={0}
                      defaultValue={800_000}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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
                  Создать проект
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
