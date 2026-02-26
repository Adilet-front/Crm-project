export const USER_ROLES = ['owner', 'financial_manager', 'pm', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  id: string;
  name: string;
  identifier: string;
  role: UserRole;
  email?: string;
  employeeId?: string;
  avatarUrl?: string;
}
