import { create } from 'zustand';
import type { UserRole } from '@/entities/user/model/types';

export type NotificationCenterType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationCenterItem {
  id: string;
  role: UserRole;
  title: string;
  message: string;
  type: NotificationCenterType;
  createdAt: number;
  read: boolean;
}

interface AddNotificationPayload {
  title: string;
  message: string;
  type: NotificationCenterType;
  roles: UserRole[];
  createdAt?: number;
}

interface NotificationCenterState {
  items: NotificationCenterItem[];
  addNotification: (payload: AddNotificationPayload) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (role: UserRole) => void;
  clearByRole: (role: UserRole) => void;
}

const NOTIFICATION_LIMIT = 200;

const createNotificationId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const useNotificationCenterStore = create<NotificationCenterState>((set) => ({
  items: [],
  addNotification: ({ title, message, type, roles, createdAt }) => {
    const timestamp = createdAt ?? Date.now();
    const nextItems: NotificationCenterItem[] = roles.map((role) => ({
      id: createNotificationId(),
      role,
      title,
      message,
      type,
      createdAt: timestamp,
      read: false,
    }));

    if (nextItems.length === 0) {
      return;
    }

    set((state) => ({
      items: [...nextItems, ...state.items].slice(0, NOTIFICATION_LIMIT),
    }));
  },
  markAsRead: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    })),
  markAllAsRead: (role) =>
    set((state) => ({
      items: state.items.map((item) => (item.role === role ? { ...item, read: true } : item)),
    })),
  clearByRole: (role) =>
    set((state) => ({
      items: state.items.filter((item) => item.role !== role),
    })),
}));
