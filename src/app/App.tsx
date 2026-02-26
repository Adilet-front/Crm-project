import type { FC } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/shared/ui/shadcn/sonner';
import { appRouter } from './routers/appRouter';

export const App: FC = () => {
  return (
    <>
      <RouterProvider router={appRouter} />
      <Toaster position="top-right" />
    </>
  );
};
