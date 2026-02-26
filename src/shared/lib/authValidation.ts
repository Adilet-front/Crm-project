export const MIN_PASSWORD_LENGTH = 8;
export const MIN_PASSWORD_ERROR_MESSAGE = `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const isValidEmail = (value: string) => EMAIL_PATTERN.test(normalizeEmail(value));

export const hasMinPasswordLength = (value: string) => value.length >= MIN_PASSWORD_LENGTH;
