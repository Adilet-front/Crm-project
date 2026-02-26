import type { UserRole } from '@/entities/user/model/types';

export type AdminUserStatus = 'invited' | 'active' | 'inactive';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: UserRole;
  status: AdminUserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
}

export interface AdminInvite {
  id: string;
  userId: string;
  token: string;
  email: string;
  sentAt: string;
  expiresAt: string;
  usedAt?: string;
  resendCount: number;
  status: 'pending' | 'used' | 'expired';
}

export interface AdminMailMessage {
  id: string;
  inviteId: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  inviteLink: string;
}

export type ManagedRecordStatus = 'active' | 'archived';

export interface LegalEntity {
  id: string;
  name: string;
  inn: string;
  type: string;
  status: ManagedRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ownerEntityId: string;
  currency: string;
  balance: number;
  status: ManagedRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HandbookEntry {
  id: string;
  name: string;
  category: string;
  status: ManagedRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export type AuditEntityType =
  | 'user'
  | 'invite'
  | 'legal_entity'
  | 'bank_account'
  | 'handbook'
  | 'setup_password';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  payload: Record<string, unknown>;
}

export interface AdminDataSnapshot {
  users: AdminUser[];
  invites: AdminInvite[];
  outbox: AdminMailMessage[];
  legalEntities: LegalEntity[];
  bankAccounts: BankAccount[];
  handbooks: HandbookEntry[];
  logs: AuditLogEntry[];
}

export interface AdminActor {
  id: string;
  name: string;
  role: UserRole;
}

export interface InviteValidationResult {
  status: 'valid' | 'invalid' | 'used' | 'expired';
  user?: AdminUser;
  invite?: AdminInvite;
}

export interface AdminPersistedSnapshot {
  version: number;
  data: AdminDataSnapshot;
}
