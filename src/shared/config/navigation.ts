import { SECTION_ACCESS } from '@/entities/user/model/access';
import type { UserRole } from '@/entities/user/model/types';

export type NavigationIcon =
  | 'dashboard'
  | 'projects'
  | 'operations'
  | 'approvals'
  | 'planning'
  | 'analytics'
  | 'admin';

export interface NavigationItem {
  path: string;
  label: string;
  roles: UserRole[];
  icon: NavigationIcon;
}

export const APP_NAVIGATION: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'Рабочий стол',
    roles: SECTION_ACCESS.dashboard,
    icon: 'dashboard',
  },
  {
    path: '/projects',
    label: 'Проекты',
    roles: SECTION_ACCESS.projects,
    icon: 'projects',
  },
  {
    path: '/operations',
    label: 'Операции',
    roles: SECTION_ACCESS.operations,
    icon: 'operations',
  },
  {
    path: '/approvals',
    label: 'Согласование',
    roles: SECTION_ACCESS.approvals,
    icon: 'approvals',
  },
  {
    path: '/planning',
    label: 'Планирование',
    roles: SECTION_ACCESS.planning,
    icon: 'planning',
  },
  {
    path: '/analytics',
    label: 'Аналитика',
    roles: SECTION_ACCESS.analytics,
    icon: 'analytics',
  },
  {
    path: '/admin',
    label: 'Администрирование',
    roles: SECTION_ACCESS.admin,
    icon: 'admin',
  },
];

export const ROLE_NAVIGATION_VARIANTS: Record<UserRole, NavigationItem[]> = {
  owner: APP_NAVIGATION.filter((item) => item.roles.includes('owner')),
  financial_manager: APP_NAVIGATION.filter((item) => item.roles.includes('financial_manager')),
  pm: APP_NAVIGATION.filter((item) => item.roles.includes('pm')),
  admin: APP_NAVIGATION.filter((item) => item.roles.includes('admin')),
};

export const getNavigationForRole = (role: UserRole) => ROLE_NAVIGATION_VARIANTS[role] ?? [];
