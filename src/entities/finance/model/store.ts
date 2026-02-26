import { create } from 'zustand';

export type ProjectStatus = 'Активен' | 'Завершен' | 'Приостановлен';

export interface Project {
  id: number;
  name: string;
  direction: string;
  manager: string;
  status: ProjectStatus;
  revenue: { fact: number; plan: number };
  expenses: { fact: number; plan: number };
  profit: number;
  margin: number;
}

export type OperationType = 'Приход' | 'Расход' | 'Перевод';

export interface Operation {
  id: number;
  date: string;
  type: OperationType;
  description: string;
  category: string;
  project: string;
  contractor: string;
  account: string;
  amount: number;
}

export type RequestStatus = 'Новая' | 'На рассмотрении' | 'Одобрено' | 'Отклонено' | 'Оплачено';

export interface PaymentRequest {
  id: number;
  initiator: string;
  date: string;
  amount: number;
  purpose: string;
  project: string;
  status: RequestStatus;
  reason?: string;
}

export interface ExpenseBudgetWarning {
  monthKey: string;
  category: string;
  limit: number;
  currentAmount: number;
  nextAmount: number;
  overflow: number;
}

interface FinanceState {
  projects: Project[];
  operations: Operation[];
  requests: PaymentRequest[];
  getExpenseBudgetWarning: (operation: Omit<Operation, 'id'>) => ExpenseBudgetWarning | null;
  addProject: (project: Omit<Project, 'id'>) => void;
  addOperation: (operation: Omit<Operation, 'id'>) => void;
  addRequest: (request: Omit<PaymentRequest, 'id'>) => void;
  updateRequestStatus: (id: number, status: RequestStatus, reason?: string) => void;
}

const toMargin = (revenue: number, expenses: number) => {
  if (revenue <= 0) {
    return 0;
  }
  return Number((((revenue - expenses) / revenue) * 100).toFixed(1));
};

const EXPENSE_BUDGET_LIMITS_BY_MONTH: Record<string, Record<string, number>> = {
  '2026-01': {
    Логистика: 420_000,
    Материалы: 820_000,
  },
  '2026-02': {
    Аренда: 250_000,
    Безопасность: 150_000,
    Зарплата: 1_500_000,
    Материалы: 900_000,
    Налоги: 600_000,
    'Офисные расходы': 60_000,
    'Подрядные работы': 500_000,
    Транспорт: 120_000,
    Эксплуатация: 100_000,
  },
};

const getMonthKey = (date: string) => date.slice(0, 7);

const getExpenseTotalByCategory = (
  operations: Operation[],
  monthKey: string,
  category: string
) =>
  operations.reduce((sum, operation) => {
    const isCurrentMonth = getMonthKey(operation.date) === monthKey;
    const isSameCategory = operation.category === category;
    const isExpense = operation.type === 'Расход' || operation.amount < 0;

    if (!isCurrentMonth || !isSameCategory || !isExpense) {
      return sum;
    }

    return sum + Math.abs(operation.amount);
  }, 0);

const getExpenseBudgetLimit = (monthKey: string, category: string) =>
  EXPENSE_BUDGET_LIMITS_BY_MONTH[monthKey]?.[category];

export const useFinanceStore = create<FinanceState>((set, get) => ({
  projects: [
    {
      id: 1,
      name: 'ЖК "Горизонт"',
      direction: 'Строительство',
      manager: 'Елена Соколова',
      status: 'Активен',
      revenue: { fact: 45_000_000, plan: 42_000_000 },
      expenses: { fact: 32_550_000, plan: 34_000_000 },
      profit: 12_450_000,
      margin: 27.6,
    },
    {
      id: 2,
      name: 'БЦ "Кристалл"',
      direction: 'Аренда',
      manager: 'Иван Петров',
      status: 'Активен',
      revenue: { fact: 12_000_000, plan: 12_000_000 },
      expenses: { fact: 3_100_000, plan: 3_000_000 },
      profit: 8_900_000,
      margin: 74.1,
    },
    {
      id: 3,
      name: 'ТЦ "Атриум"',
      direction: 'Управление',
      manager: 'Елена Соколова',
      status: 'Завершен',
      revenue: { fact: 25_000_000, plan: 24_000_000 },
      expenses: { fact: 17_800_000, plan: 17_000_000 },
      profit: 7_200_000,
      margin: 28.8,
    },
    {
      id: 4,
      name: 'Вилла "Озерная"',
      direction: 'Строительство',
      manager: 'Алексей Смирнов',
      status: 'Активен',
      revenue: { fact: 18_500_000, plan: 20_000_000 },
      expenses: { fact: 12_900_000, plan: 14_000_000 },
      profit: 5_600_000,
      margin: 30.2,
    },
    {
      id: 5,
      name: 'Реновация цеха №4',
      direction: 'Производство',
      manager: 'Елена Соколова',
      status: 'Активен',
      revenue: { fact: 15_400_000, plan: 15_000_000 },
      expenses: { fact: 10_600_000, plan: 11_000_000 },
      profit: 4_800_000,
      margin: 31.1,
    },
  ],
  operations: [
    {
      id: 1,
      date: '2026-02-24',
      type: 'Приход',
      description: 'Оплата по договору №123',
      category: 'Выручка',
      project: 'ЖК "Горизонт"',
      contractor: 'ООО "Альфа"',
      account: 'Расчетный счет (Сбер)',
      amount: 1_250_000,
    },
    {
      id: 2,
      date: '2026-02-23',
      type: 'Расход',
      description: 'Закупка материалов',
      category: 'Материалы',
      project: 'ЖК "Горизонт"',
      contractor: 'ООО "СтройТех"',
      account: 'Расчетный счет (Сбер)',
      amount: -450_000,
    },
    {
      id: 3,
      date: '2026-02-22',
      type: 'Расход',
      description: 'Аренда офиса',
      category: 'Аренда',
      project: 'Общие расходы',
      contractor: 'БЦ "Кристалл"',
      account: 'Расчетный счет (ВТБ)',
      amount: -120_000,
    },
    {
      id: 4,
      date: '2026-02-21',
      type: 'Перевод',
      description: 'Пополнение корпоративной карты',
      category: 'Перевод',
      project: '-',
      contractor: '-',
      account: 'ВТБ -> Касса',
      amount: 50_000,
    },
    {
      id: 5,
      date: '2026-02-20',
      type: 'Приход',
      description: 'Аванс по проекту',
      category: 'Выручка',
      project: 'Вилла "Озерная"',
      contractor: 'Иванов А.В.',
      account: 'Расчетный счет (Сбер)',
      amount: 800_000,
    },
    {
      id: 11,
      date: '2026-02-19',
      type: 'Расход',
      description: 'Оплата услуг охраны',
      category: 'Безопасность',
      project: 'БЦ "Кристалл"',
      contractor: 'ООО "Щит Плюс"',
      account: 'Расчетный счет (ВТБ)',
      amount: -95_000,
    },
    {
      id: 12,
      date: '2026-02-18',
      type: 'Приход',
      description: 'Частичная оплата по акту №45',
      category: 'Выручка',
      project: 'ЖК "Горизонт"',
      contractor: 'ООО "Сигма Девелопмент"',
      account: 'Расчетный счет (Сбер)',
      amount: 640_000,
    },
    {
      id: 13,
      date: '2026-02-17',
      type: 'Расход',
      description: 'Покупка кабельной продукции',
      category: 'Материалы',
      project: 'Вилла "Озерная"',
      contractor: 'ООО "ЭлектроСнаб"',
      account: 'Расчетный счет (Сбер)',
      amount: -210_000,
    },
    {
      id: 14,
      date: '2026-02-16',
      type: 'Перевод',
      description: 'Перевод на зарплатный проект',
      category: 'Перевод',
      project: 'Общие расходы',
      contractor: '-',
      account: 'Сбер -> Зарплатный реестр',
      amount: 300_000,
    },
    {
      id: 15,
      date: '2026-02-15',
      type: 'Расход',
      description: 'Аванс подрядчику по фасадным работам',
      category: 'Подрядные работы',
      project: 'ЖК "Горизонт"',
      contractor: 'ИП "Кузнецов Д.И."',
      account: 'Расчетный счет (ВТБ)',
      amount: -370_000,
    },
    {
      id: 16,
      date: '2026-02-14',
      type: 'Приход',
      description: 'Оплата аренды за февраль',
      category: 'Выручка',
      project: 'БЦ "Кристалл"',
      contractor: 'ООО "Бета"',
      account: 'Расчетный счет (ВТБ)',
      amount: 520_000,
    },
    {
      id: 17,
      date: '2026-02-13',
      type: 'Расход',
      description: 'Топливо и обслуживание техники',
      category: 'Транспорт',
      project: 'Общие расходы',
      contractor: 'ООО "ПетролСервис"',
      account: 'Касса',
      amount: -68_000,
    },
    {
      id: 18,
      date: '2026-02-12',
      type: 'Приход',
      description: 'Предоплата по договору №211',
      category: 'Выручка',
      project: 'Вилла "Озерная"',
      contractor: 'АО "СеверИнвест"',
      account: 'Расчетный счет (Сбер)',
      amount: 1_100_000,
    },
    {
      id: 19,
      date: '2026-02-11',
      type: 'Расход',
      description: 'Выплата зарплаты за 1-ю половину месяца',
      category: 'Зарплата',
      project: 'Общие расходы',
      contractor: 'Сотрудники',
      account: 'Расчетный счет (Сбер)',
      amount: -980_000,
    },
    {
      id: 20,
      date: '2026-02-10',
      type: 'Расход',
      description: 'Оплата НДС за январь',
      category: 'Налоги',
      project: 'Общие расходы',
      contractor: 'ФНС',
      account: 'Расчетный счет (Сбер)',
      amount: -430_000,
    },
    {
      id: 21,
      date: '2026-02-09',
      type: 'Приход',
      description: 'Возврат обеспечительного платежа',
      category: 'Прочие поступления',
      project: 'БЦ "Кристалл"',
      contractor: 'ООО "СервисПлюс"',
      account: 'Расчетный счет (ВТБ)',
      amount: 180_000,
    },
    {
      id: 22,
      date: '2026-02-08',
      type: 'Расход',
      description: 'Закупка расходников для офиса',
      category: 'Офисные расходы',
      project: 'Общие расходы',
      contractor: 'ООО "ОфисМаркет"',
      account: 'Касса',
      amount: -34_500,
    },
    {
      id: 23,
      date: '2026-02-07',
      type: 'Перевод',
      description: 'Пополнение кассы для хозрасходов',
      category: 'Перевод',
      project: '-',
      contractor: '-',
      account: 'Сбер -> Касса',
      amount: 120_000,
    },
    {
      id: 24,
      date: '2026-02-06',
      type: 'Расход',
      description: 'Оплата клининга на объектах',
      category: 'Эксплуатация',
      project: 'ЖК "Горизонт"',
      contractor: 'ООО "Чистый Город"',
      account: 'Расчетный счет (ВТБ)',
      amount: -76_000,
    },
    {
      id: 25,
      date: '2026-02-05',
      type: 'Приход',
      description: 'Поступление по закрывающим документам',
      category: 'Выручка',
      project: 'ЖК "Горизонт"',
      contractor: 'ООО "ТехноСтрой"',
      account: 'Расчетный счет (Сбер)',
      amount: 455_000,
    },
    {
      id: 6,
      date: '2026-01-24',
      type: 'Приход',
      description: 'Поступление по договору №117',
      category: 'Выручка',
      project: 'ЖК "Горизонт"',
      contractor: 'ООО "Монолит"',
      account: 'Расчетный счет (Сбер)',
      amount: 1_120_000,
    },
    {
      id: 7,
      date: '2026-01-23',
      type: 'Расход',
      description: 'Оплата логистики',
      category: 'Логистика',
      project: 'Общие расходы',
      contractor: 'ООО "ЛогистикГрупп"',
      account: 'Расчетный счет (ВТБ)',
      amount: -310_000,
    },
    {
      id: 8,
      date: '2026-01-22',
      type: 'Расход',
      description: 'Закупка металла',
      category: 'Материалы',
      project: 'ЖК "Горизонт"',
      contractor: 'АО "МеталлИнвест"',
      account: 'Расчетный счет (Сбер)',
      amount: -540_000,
    },
    {
      id: 9,
      date: '2026-01-21',
      type: 'Перевод',
      description: 'Перевод между счетами',
      category: 'Перевод',
      project: '-',
      contractor: '-',
      account: 'Сбер -> ВТБ',
      amount: 150_000,
    },
    {
      id: 10,
      date: '2026-01-20',
      type: 'Приход',
      description: 'Оплата аренды помещений',
      category: 'Выручка',
      project: 'БЦ "Кристалл"',
      contractor: 'ООО "Гамма"',
      account: 'Расчетный счет (ВТБ)',
      amount: 670_000,
    },
  ],
  requests: [
    {
      id: 1,
      initiator: 'Елена Соколова',
      date: '2026-02-24',
      amount: 125_000,
      purpose: 'Закупка арматуры',
      project: 'ЖК "Горизонт"',
      status: 'Новая',
    },
    {
      id: 2,
      initiator: 'Иван Петров',
      date: '2026-02-23',
      amount: 45_000,
      purpose: 'Оплата интернета',
      project: 'Общие расходы',
      status: 'На рассмотрении',
    },
    {
      id: 3,
      initiator: 'Елена Соколова',
      date: '2026-02-22',
      amount: 890_000,
      purpose: 'Аванс субподрядчику',
      project: 'БЦ "Кристалл"',
      status: 'Одобрено',
    },
    {
      id: 4,
      initiator: 'Алексей Смирнов',
      date: '2026-02-21',
      amount: 12_000,
      purpose: 'Канцтовары',
      project: 'Общие расходы',
      status: 'Отклонено',
      reason: 'Превышен лимит бюджета на месяц',
    },
    {
      id: 5,
      initiator: 'Елена Соколова',
      date: '2026-02-20',
      amount: 350_000,
      purpose: 'Аренда спецтехники',
      project: 'ЖК "Горизонт"',
      status: 'Оплачено',
    },
    {
      id: 6,
      initiator: 'Иван Петров',
      date: '2026-01-24',
      amount: 98_000,
      purpose: 'Оплата сервисного договора',
      project: 'Общие расходы',
      status: 'Новая',
    },
    {
      id: 7,
      initiator: 'Елена Соколова',
      date: '2026-01-23',
      amount: 410_000,
      purpose: 'Аванс поставщику металла',
      project: 'ЖК "Горизонт"',
      status: 'На рассмотрении',
    },
    {
      id: 8,
      initiator: 'Алексей Смирнов',
      date: '2026-01-22',
      amount: 54_000,
      purpose: 'Коммунальные платежи',
      project: 'БЦ "Кристалл"',
      status: 'Одобрено',
    },
    {
      id: 9,
      initiator: 'Елена Соколова',
      date: '2026-01-21',
      amount: 620_000,
      purpose: 'Оплата подрядчика по инженерии',
      project: 'Вилла "Озерная"',
      status: 'Отклонено',
      reason: 'Не приложен акт выполненных работ',
    },
    {
      id: 10,
      initiator: 'Иван Петров',
      date: '2026-01-20',
      amount: 275_000,
      purpose: 'Техническое обслуживание оборудования',
      project: 'Общие расходы',
      status: 'Оплачено',
    },
  ],
  getExpenseBudgetWarning: (operation) => {
    if (operation.type !== 'Расход' || operation.amount >= 0) {
      return null;
    }

    const monthKey = getMonthKey(operation.date);
    const limit = getExpenseBudgetLimit(monthKey, operation.category);

    if (typeof limit !== 'number') {
      return null;
    }

    const currentAmount = getExpenseTotalByCategory(get().operations, monthKey, operation.category);
    const nextAmount = currentAmount + Math.abs(operation.amount);

    if (nextAmount <= limit) {
      return null;
    }

    return {
      monthKey,
      category: operation.category,
      limit,
      currentAmount,
      nextAmount,
      overflow: nextAmount - limit,
    };
  },
  addProject: (project) =>
    set((state) => ({
      projects: [
        {
          ...project,
          id: state.projects.length + 1,
          profit: project.revenue.fact - project.expenses.fact,
          margin: toMargin(project.revenue.fact, project.expenses.fact),
        },
        ...state.projects,
      ],
    })),
  addOperation: (operation) =>
    set((state) => ({
      operations: [{ ...operation, id: state.operations.length + 1 }, ...state.operations],
    })),
  addRequest: (request) =>
    set((state) => ({
      requests: [{ ...request, id: state.requests.length + 1 }, ...state.requests],
    })),
  updateRequestStatus: (id, status, reason) =>
    set((state) => ({
      requests: state.requests.map((request) =>
        request.id === id ? { ...request, status, reason } : request
      ),
    })),
}));
