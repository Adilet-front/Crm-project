# CRM Frontend Demo

Frontend-only приложение (Vite + React + TypeScript) для demo-деплоя на Vercel.

## Scope

- Деплоится только `Frontend/`.
- Backend/CRM API не требуется.
- Данные и авторизация работают через локальные mock-источники (`localStorage`).

## Runtime

- Node.js: `22` (см. `.nvmrc`)
- npm: `>=10`

## Local Run

```bash
npm ci
npm run dev
```

## Quality Gate (обязательный перед деплоем)

```bash
npm run check
```

Скрипт `check` запускает:

1. `npm run lint`
2. `npm run test`
3. `npm run build`

## Vercel Deploy (Frontend-only)

### Вариант A: проект указывает на папку `Frontend` напрямую

- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`

### Вариант B: подключена родительская папка `CRM Finance`

- Root Directory: `Frontend`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`

## Vercel Config in Repo

Файл `vercel.json` уже добавлен и содержит:

- `installCommand: npm ci`
- `buildCommand: npm run build`
- `outputDirectory: dist`
- SPA rewrite: `/(.*) -> /index.html`

Это нужно для корректной загрузки deep links (`/dashboard`, `/projects`, `/operations`, `/analytics`, `/admin`).

## Demo Notes

- Блок demo-учеток скрыт в публичном UI страницы входа.
- Demo-логин остается рабочим через локальные mock-данные.
- Состояние пользователя/данных сохраняется в `localStorage` браузера.

## Smoke Checklist after Deploy

1. Открыть `/login`.
2. Проверить прямые переходы на:
   - `/dashboard`
   - `/projects`
   - `/operations`
   - `/analytics`
   - `/admin`
3. Убедиться, что нет 404 при прямом открытии URL.
4. Проверить, что статические ассеты загружаются без ошибок в Console/Network.
