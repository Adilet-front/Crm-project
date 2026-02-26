import type { ProjectOption, ProjectSummary } from './types';

export const PROJECT_TABLE_ROWS: ProjectSummary[] = [
  {
    id: 'alpha',
    name: 'Проект "Альфа"',
    responsiblePmIdentifier: '20011',
    revenue: 12.5,
    expenses: 7.65,
    profit: 4.85,
    profitabilityPercent: 38.8,
  },
  {
    id: 'beta',
    name: 'Проект "Бета"',
    responsiblePmIdentifier: '20011',
    revenue: 8.9,
    expenses: 5.8,
    profit: 3.1,
    profitabilityPercent: 34.8,
  },
  {
    id: 'gamma',
    name: 'Проект "Гамма"',
    responsiblePmIdentifier: '20017',
    revenue: 7.9,
    expenses: 5.5,
    profit: 2.4,
    profitabilityPercent: 30.4,
  },
  {
    id: 'delta',
    name: 'Проект "Дельта"',
    responsiblePmIdentifier: '20017',
    revenue: 6.5,
    expenses: 4.6,
    profit: 1.9,
    profitabilityPercent: 29.2,
  },
  {
    id: 'epsilon',
    name: 'Проект "Эпсилон"',
    responsiblePmIdentifier: '20011',
    revenue: 5.3,
    expenses: 3.8,
    profit: 1.5,
    profitabilityPercent: 28.3,
  },
  {
    id: 'zeta',
    name: 'Проект "Зета"',
    responsiblePmIdentifier: '20023',
    revenue: 4.2,
    expenses: 3.05,
    profit: 1.15,
    profitabilityPercent: 27.4,
  },
  {
    id: 'eta',
    name: 'Проект "Эта"',
    responsiblePmIdentifier: '20011',
    revenue: 3.8,
    expenses: 2.8,
    profit: 1,
    profitabilityPercent: 26.3,
  },
];

export const PROJECT_OPTIONS: ProjectOption[] = PROJECT_TABLE_ROWS.map((project) => ({
  id: project.id,
  name: project.name,
  responsiblePmIdentifier: project.responsiblePmIdentifier,
}));
