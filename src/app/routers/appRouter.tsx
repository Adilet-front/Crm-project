import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/layout/AppLayout';
import { SECTION_ACCESS } from '@/entities/user/model/access';
import type { UserRole } from '@/entities/user/model/types';
import { ProtectedRoute } from '@/features/auth/ui/ProtectedRoute';
import AdminPage from '@/pages/admin/AdminPage';
import AnalyticsPage from '@/pages/analytics/AnalyticsPage';
import ApprovalsPage from '@/pages/approvals/ApprovalsPage';
import LoginPage from '@/pages/auth/LoginPage';
import SetupPasswordPage from '@/pages/auth/SetupPasswordPage';
import { NotFoundPage } from '@/pages/common/NotFoundPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import OperationsPage from '@/pages/operations/OperationsPage';
import PlanningPage from '@/pages/planning/PlanningPage';
import ProjectsPage from '@/pages/projects/ProjectsPage';

const DASHBOARD_ROLES: UserRole[] = SECTION_ACCESS.dashboard;
const PROJECT_ROLES: UserRole[] = SECTION_ACCESS.projects;
const OPERATIONS_ROLES: UserRole[] = SECTION_ACCESS.operations;
const APPROVALS_ROLES: UserRole[] = SECTION_ACCESS.approvals;
const PLANNING_ROLES: UserRole[] = SECTION_ACCESS.planning;
const ANALYTICS_ROLES: UserRole[] = SECTION_ACCESS.analytics;
const ADMIN_ROLES: UserRole[] = SECTION_ACCESS.admin;

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/setup-password/:token',
    element: <SetupPasswordPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute allowedRoles={DASHBOARD_ROLES}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'projects',
        element: (
          <ProtectedRoute allowedRoles={PROJECT_ROLES}>
            <ProjectsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'operations',
        element: (
          <ProtectedRoute allowedRoles={OPERATIONS_ROLES}>
            <OperationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'approvals',
        element: (
          <ProtectedRoute allowedRoles={APPROVALS_ROLES}>
            <ApprovalsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'planning',
        element: (
          <ProtectedRoute allowedRoles={PLANNING_ROLES}>
            <PlanningPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute allowedRoles={ANALYTICS_ROLES}>
            <AnalyticsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={ADMIN_ROLES}>
            <AdminPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
