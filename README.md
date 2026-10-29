# Blogging Platform API

RESTful CRUD API для блогу — рішення задачі [roadmap.sh/projects/blogging-platform-api](https://roadmap.sh/projects/blogging-platform-api).
Стек: Node.js ≥ 20.12, Express 5, MySQL 8 (`mysql2`, чистий SQL), Zod, TypeScript, Vitest + supertest.

## Запуск

1. Скопіюй `.env.example` у `.env` і впиши `DB_PASSWORD` (користувач MySQL має мати право створювати бази).
2. `npm install`
3. `npm run db:init` — створить базу й таблиці (можна запускати повторно)
4. `npm start` (або `npm run dev` з перезапуском) — сервер на `http://localhost:3000`

## Ендпоінти

| Метод | Шлях | Успіх | Помилки |
|---|---|---|---|
| POST | `/posts` | 201 + пост | 400 |
| GET | `/posts` , `/posts?term=tech` | 200 + масив | 400 (повторений `term`) |
| GET | `/posts/:id` | 200 + пост | 400 (id не число), 404 |
| PUT | `/posts/:id` | 200 + пост | 400, 404 |
| DELETE | `/posts/:id` | 204 | 400, 404 |

Тіло POST/PUT: `{ "title": "...", "content": "...", "category": "...", "tags": ["..."] }`.
Пошук `term` — частковий збіг (без урахування регістру) у `title`, `content` і `category`; теги не шукаються.

```bash
curl -X POST http://localhost:3000/posts -H "Content-Type: application/json" \
  -d '{"title":"My First Blog Post","content":"Hello","category":"Technology","tags":["Tech","Programming"]}'
```

Відповідь:

```json
{ "id": 1, "title": "My First Blog Post", "content": "Hello", "category": "Technology",
  "tags": ["programming", "tech"], "createdAt": "2026-10-29T12:00:00.000Z", "updatedAt": "2026-10-29T12:00:00.000Z" }
```

Помилка валідації (400):

```json
{ "error": "Validation failed", "details": [{ "field": "title", "message": "title must not be empty" }] }
```

## Рішення

- Теги в окремій таблиці `tags` + `post_tags` (багато до багатьох). Їх приводять до NFC і нижнього регістру
  без дублікатів та повертають за алфавітом. Колонка `tags.name` має колізацію `utf8mb4_bin`: зі стандартною
  `utf8mb4_0900_ai_ci` теги `café`/`cafe` чи `кїт`/`кіт` мовчки зливалися б в один.
  `npm run db:init` сам мігрує стару схему.
- Створення й оновлення поста — у транзакції: пост і теги змінюються разом або не змінюються взагалі.
- `updatedAt` ставиться явно при кожному PUT, навіть якщо поля не змінилися.
- Час зберігається в UTC (`DATETIME(3)`).
- У `LIKE` символи `%` і `_` з пошукового терміна екрануються. Пошук по `content` робить повне сканування
  таблиці — для навчального проєкту нормально.

## Тести

`npm test` — юніт-тести валідації та інтеграційні тести API. Інтеграційні працюють із окремою базою
`DB_NAME_TEST` (за замовчуванням `<DB_NAME>_test`) і потребують запущеного MySQL.
`npm run typecheck` — перевірка типів.
