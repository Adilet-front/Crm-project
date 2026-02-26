/* eslint-disable react-refresh/only-export-components */
import type { UserRole } from '@/entities/user/model/types';
import { useAuthStore } from '@/features/auth/model/authStore';
import { ToastContainer } from './ToastContainer';
import { useNotificationCenterStore } from './notificationCenterStore';
import { useToastStore } from './toastStore';

export interface ToasterProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface ToastOptions {
  title?: string;
  roles?: UserRole[];
  toNotificationCenter?: boolean;
}

const DEFAULT_NOTIFICATION_TITLES = {
  success: 'Успешно',
  error: 'Ошибка',
  info: 'Информация',
  warning: 'Предупреждение',
} as const;

const dispatchToast = (
  message: string,
  type: 'success' | 'error' | 'info' | 'warning',
  options?: ToastOptions
) => {
  useToastStore.getState().addToast(message, type);

  if (options?.toNotificationCenter === false) {
    return;
  }

  const currentRole = useAuthStore.getState().user?.role;
  const roles = options?.roles ?? (currentRole ? [currentRole] : []);

  useNotificationCenterStore.getState().addNotification({
    title: options?.title ?? DEFAULT_NOTIFICATION_TITLES[type],
    message,
    type,
    roles,
  });
};

export const toast = {
  success: (message: string, options?: ToastOptions) => dispatchToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => dispatchToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => dispatchToast(message, 'info', options),
  warning: (message: string, options?: ToastOptions) => dispatchToast(message, 'warning', options),
};

export function Toaster(props: ToasterProps) {
  void props;
  return <ToastContainer />;
}
