# Tequila Run Crockid

Production: **Tequila Run 5.7.3**

Корпоративная HTML5-игра Crockid для мобильного браузера / Telegram WebApp.

## Production files

- `index.html` — self-contained game
- `api/leaderboard.js` — GET/POST online leaderboard
- `package.json` — `@vercel/functions` dependency
- `vercel.json` — Vercel configuration

## Online leaderboard

Клиент обращается к `/api/leaderboard`.

- `GET /api/leaderboard` возвращает общий рейтинг и недельный пробег.
- `POST /api/leaderboard` принимает результат забега.
- Хранилище: Vercel Runtime Cache.
- Лучший результат по имени хранится отдельно для каждого отдела.
- Поддерживаемые режимы: `endless`, `story`.

До этого production endpoint `/api/leaderboard` возвращал 404, потому что serverless-файл отсутствовал в репозитории.
