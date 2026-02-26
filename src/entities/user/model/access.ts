import type { UserRole } from './types';

export type AppSection =
  | 'dashboard'
  | 'projects'
  | 'operations'
  | 'approvals'
  | 'planning'
  | 'analytics'
  | 'admin';

export type AccessAction =
  | 'project_requests:read'
  | 'project_requests:write'
  | 'projects:write'
  | 'operations:read'
  | 'operations:write'
  | 'approvals:read'
  | 'approvals:write'
  | 'admin:read'
  | 'admin:write';

export const FORBIDDEN_NOTICE_MESSAGE = 'Недостаточно прав для доступа к этому разделу';

export const READ_ONLY_ROLES: UserRole[] = ['owner'];

export const SECTION_ACCESS: Record<AppSection, UserRole[]> = {
  dashboard: ['owner', 'financial_manager', 'pm', 'admin'],
  projects: ['owner', 'financial_manager', 'pm'],
  operations: ['owner', 'financial_manager', 'pm'],
  approvals: ['owner', 'financial_manager', 'pm'],
  planning: ['owner', 'financial_manager'],
  analytics: ['owner', 'financial_manager'],
  admin: ['admin'],
};

export const ACTION_ACCESS: Record<AccessAction, UserRole[]> = {
  'project_requests:read': ['owner', 'financial_manager', 'pm'],
  'project_requests:write': ['financial_manager', 'pm'],
  'projects:write': ['pm'],
  'operations:read': ['owner', 'financial_manager', 'pm'],
  'operations:write': ['financial_manager'],
  'approvals:read': ['owner', 'financial_manager', 'pm'],
  'approvals:write': ['owner', 'financial_manager'],
  'admin:read': ['admin'],
  'admin:write': ['admin'],
};

export const canAccessSection = (role: UserRole, section: AppSection) =>
  SECTION_ACCESS[section].includes(role);

export const canPerformAction = (role: UserRole, action: AccessAction) =>
  ACTION_ACCESS[action].includes(role);

export const isReadOnlyRole = (role: UserRole) => READ_ONLY_ROLES.includes(role);

export const canWriteAdmin = (role: UserRole) => canPerformAction(role, 'admin:write');
