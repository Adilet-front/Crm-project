import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/shadcn/button';

export const NotFoundPage: FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Страница не найдена</h1>
        <p className="mt-2 text-sm text-slate-600">Проверьте адрес или вернитесь на рабочий стол.</p>
        <Link to="/dashboard">
          <Button className="mt-5">На рабочий стол</Button>
        </Link>
      </div>
    </div>
  );
};
