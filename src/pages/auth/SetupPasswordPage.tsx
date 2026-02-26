import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAdminStore } from '@/entities/admin/model/adminStore';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { toast } from '@/shared/ui/shadcn/sonner';
import {
  hasMinPasswordLength,
  MIN_PASSWORD_ERROR_MESSAGE,
  MIN_PASSWORD_LENGTH,
} from '@/shared/lib/authValidation';

export default function SetupPasswordPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();

  const validateInviteToken = useAdminStore((state) => state.validateInviteToken);
  const completeInviteSetup = useAdminStore((state) => state.completeInviteSetup);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const validation = useMemo(() => validateInviteToken(token), [token, validateInviteToken]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!hasMinPasswordLength(password)) {
      setError(MIN_PASSWORD_ERROR_MESSAGE);
      return;
    }

    if (password !== passwordConfirm) {
      setError('Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    const result = completeInviteSetup(token, password);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error ?? 'Не удалось установить пароль');
      toast.error(result.error ?? 'Ошибка установки пароля');
      return;
    }

    setIsCompleted(true);
    toast.success('Пароль успешно установлен. Теперь можно войти в систему.');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">Активация аккаунта</h1>

        {isCompleted ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
              Аккаунт активирован. Используйте логин и новый пароль на странице входа.
            </p>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Перейти ко входу
            </Button>
          </div>
        ) : null}

        {!isCompleted && validation.status !== 'valid' ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
              {validation.status === 'used' && 'Эта ссылка уже была использована.'}
              {validation.status === 'expired' && 'Срок действия ссылки истек. Запросите новое приглашение у администратора.'}
              {validation.status === 'invalid' && 'Ссылка приглашения недействительна.'}
            </p>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              На страницу входа
            </Link>
          </div>
        ) : null}

        {!isCompleted && validation.status === 'valid' ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <p className="text-sm text-slate-500">
              Пользователь: <span className="font-semibold text-slate-800">{validation.user?.name}</span>
            </p>
            <p className="text-sm text-slate-500">
              Email: <span className="font-semibold text-slate-800">{validation.user?.email}</span>
            </p>

            <div className="space-y-2">
              <Label htmlFor="password">Новый пароль</Label>
              <Input
                id="password"
                type="password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Повторите пароль</Label>
              <Input
                id="passwordConfirm"
                type="password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="Повторите пароль"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить пароль'}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
