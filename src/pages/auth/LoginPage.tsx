import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { confirmPasswordReset, requestPasswordReset } from '@/entities/user/model/passwordRecovery';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Eye, EyeOff, Loader2, Mail, ShieldCheck, X } from 'lucide-react';
import { toast } from '@/shared/ui/shadcn/sonner';
import {
  hasMinPasswordLength,
  isValidEmail,
  MIN_PASSWORD_ERROR_MESSAGE,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
} from '@/shared/lib/authValidation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResetEmailModalOpen, setIsResetEmailModalOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetEmailSubmitting, setIsResetEmailSubmitting] = useState(false);
  const [isResetConfirmSubmitting, setIsResetConfirmSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const delay = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError('Введите корректный email, например owner@company.com');
      return;
    }

    if (!hasMinPasswordLength(password)) {
      setError(MIN_PASSWORD_ERROR_MESSAGE);
      return;
    }

    setIsLoading(true);

    const success = await login(normalizedEmail, password);

    setIsLoading(false);

    if (success) {
      toast.success('Вход выполнен успешно');
      navigate('/dashboard');
    } else {
      setError('Неверный email или пароль');
      toast.error('Ошибка входа');
    }
  };

  const openPasswordRecovery = () => {
    setResetError('');
    setResetCode('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setResetEmail(normalizeEmail(email));
    setIsResetConfirmModalOpen(false);
    setIsResetEmailModalOpen(true);
  };

  const closePasswordRecovery = () => {
    setResetError('');
    setResetCode('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setIsResetEmailModalOpen(false);
    setIsResetConfirmModalOpen(false);
  };

  const handleSendResetCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetError('');

    const normalizedEmail = normalizeEmail(resetEmail);

    if (!isValidEmail(normalizedEmail)) {
      setResetError('Введите корректный email, например owner@company.com');
      return;
    }

    setIsResetEmailSubmitting(true);
    await delay(250);
    const result = requestPasswordReset(normalizedEmail);
    setIsResetEmailSubmitting(false);

    if (!result.ok) {
      setResetError(result.error ?? 'Не удалось отправить код восстановления');
      toast.error(result.error ?? 'Не удалось отправить код восстановления');
      return;
    }

    setResetEmail(normalizedEmail);
    setResetCode('');
    setIsResetEmailModalOpen(false);
    setIsResetConfirmModalOpen(true);
    toast.success(`Письмо отправлено. Demo-код: ${result.debugCode ?? '—'}`);
  };

  const handleConfirmPasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetError('');

    const normalizedEmail = normalizeEmail(resetEmail);
    const normalizedCode = resetCode.replace(/\D/g, '').slice(0, 6);

    if (!isValidEmail(normalizedEmail)) {
      setResetError('Введите корректный email');
      return;
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      setResetError('Код должен содержать 6 цифр');
      return;
    }

    if (!hasMinPasswordLength(newPassword)) {
      setResetError(MIN_PASSWORD_ERROR_MESSAGE);
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setResetError('Пароли не совпадают');
      return;
    }

    setIsResetConfirmSubmitting(true);
    await delay(250);
    const result = confirmPasswordReset({
      email: normalizedEmail,
      code: normalizedCode,
      nextPassword: newPassword,
    });
    setIsResetConfirmSubmitting(false);

    if (!result.ok) {
      setResetError(result.error ?? 'Не удалось обновить пароль');
      toast.error(result.error ?? 'Не удалось обновить пароль');
      return;
    }

    setPassword(newPassword);
    closePasswordRecovery();
    toast.success('Пароль успешно обновлен. Войдите с новым паролем.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">ФУ</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Финансовый Учёт</h1>
            <p className="text-gray-500 mt-2">Войдите в систему</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={error ? 'border-red-500 focus:border-red-500' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="current-password"
                  className={error ? 'border-red-500 focus:border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Минимум {MIN_PASSWORD_LENGTH} символов
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={openPasswordRecovery}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Забыли пароль?
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </Button>
          </form>

        </div>
      </div>

      {isResetEmailModalOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Восстановление доступа</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Укажите email, на который отправим код подтверждения.
                </p>
              </div>
              <button
                type="button"
                onClick={closePasswordRecovery}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendResetCode} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="recovery-email"
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    placeholder="owner@company.com"
                    autoComplete="email"
                    className="pl-9"
                  />
                </div>
              </div>

              {resetError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">
                  {resetError}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={closePasswordRecovery}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isResetEmailSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isResetEmailSubmitting ? 'Отправка...' : 'Отправить код'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isResetConfirmModalOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Новый пароль</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Код отправлен на <span className="font-semibold text-slate-700">{resetEmail}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closePasswordRecovery}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPasswordReset} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-code">Код подтверждения</Label>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={resetCode}
                    onChange={(event) => setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="pl-9 tracking-[0.25em]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Новый пароль</Label>
                <Input
                  id="new-password"
                  type="password"
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password-confirm">Повторите пароль</Label>
                <Input
                  id="new-password-confirm"
                  type="password"
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newPasswordConfirm}
                  onChange={(event) => setNewPasswordConfirm(event.target.value)}
                  placeholder="Повторите пароль"
                  autoComplete="new-password"
                />
              </div>

              {resetError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">
                  {resetError}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setResetError('');
                    setResetCode('');
                    setIsResetConfirmModalOpen(false);
                    setIsResetEmailModalOpen(true);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Изменить email
                </button>
                <button
                  type="submit"
                  disabled={isResetConfirmSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isResetConfirmSubmitting ? 'Сохранение...' : 'Сохранить пароль'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
