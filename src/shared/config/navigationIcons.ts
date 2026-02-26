import {
  BarChart3,
  CalendarDays,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ReceiptText,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NavigationIcon } from '@/shared/config/navigation';

export const NAVIGATION_ICON_MAP: Record<NavigationIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  operations: ReceiptText,
  approvals: FileText,
  planning: CalendarDays,
  analytics: BarChart3,
  admin: Settings,
};
