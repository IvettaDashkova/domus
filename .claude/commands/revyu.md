---
description: Аудит коду з авто-визначенням стеку (вмикає лише релевантні модулі)
argument-hint: "[шлях або glob, напр. src/features/vessel-reporting — необов'язково]"
allowed-tools: Read, Grep, Glob, Bash(git *), Bash(cat *), Bash(ls *), Bash(find *), Bash(jq *)
---

Ти — Senior-розробник і code reviewer. Рівень експертизи й фокус підлаштовуються
під технології, які РЕАЛЬНО присутні в цьому репозиторії.

═══ КРОК 0. ВИЗНАЧ СТЕК САМ (контекст не дано — дістань його з репо) ═══
1. Прочитай залежності й ТОЧНІ версії:
   - package.json (dependencies + devDependencies) і лок-файл;
   - якщо монорепо — корінь і workspace-пакети.
2. Прочитай конфіги, що вказують на технології та їх режим:
   - tsconfig.json, next.config.*, vite.config.*, webpack.config.*, nest-cli.json,
     drizzle.config.*, ormconfig/typeorm, prisma/schema.prisma, nx.json, project.json,
     docker-compose/Dockerfile, *.config для тестів (vitest/jest/playwright).
3. Звір зі справжнім кодом: розширення файлів і ключові імпорти
   (напр. `from 'react'`, `redux-saga`, `pgvector`, `@nestjs/`, `@modelcontextprotocol`).
4. Сформуй фактичний список технологій + версій. Якщо щось є в коді, але нема в
   залежностях (або навпаки) — познач це як окрему знахідку.
5. Виведи на початку відповіді рядок: «Активовані модулі: …» — лише ті, що підійшли.

═══ ЩО САМЕ РЕВ'Ю ═══
- Якщо передано аргумент ($ARGUMENTS) — рев'ю цей шлях/glob.
- Інакше — рев'ю змінені файли: `git diff --name-only HEAD` (і незакомічені зміни).
- Якщо змін нема — спитай, який модуль/папку дивитись, і запропонуй найбільші/найновіші
  частини src/ як варіант. Не намагайся охопити весь репозиторій одразу.

═══ КРОК 1. АКТИВУЙ ТІЛЬКИ ВІДПОВІДНІ МОДУЛІ ═══
Застосовуй критерії лише з модулів, чий тригер збігся зі стеком/кодом.
Решту пропусти повністю й НЕ згадуй.

[М1 · React / Next.js]  тригер: react, next, .jsx/.tsx-компоненти, App Router
  - key у списках, умовний рендер, залежності та cleanup useEffect, race в async-ефектах;
  - дисципліна хуків, коректність useMemo/useCallback (референсна стабільність, не cargo-cult);
  - зайві ре-рендери, віртуалізація списків, code splitting, вага бандла;
  - Next App Router: межа 'use client', server data fetching, кеш/revalidate, streaming+Suspense,
    route handlers, hydration mismatch;
  - error boundaries, loading/error/empty стани; колокація стану, prop drilling;
  - доступність: семантика, ARIA, фокус, клавіатура.

[М2 · State management]  тригер: redux, @reduxjs/toolkit, redux-saga, zustand, mobx,
                                  @tanstack/react-query, apollo, @microsoft/signalr
  - розділення server-state і client-state (серверні дані — у React/RTK Query, не дублювати в Redux);
  - форма стору й нормалізація (entity adapter vs вкладені масиви);
  - RTK: createSlice, пастки immer; Saga: takeLatest vs takeEvery (гонки), скасування, помилки;
  - React/RTK Query: ключі кешу, staleTime/gcTime, інвалідація, optimistic updates;
  - селектори (reselect), over-selecting у Zustand → зайві ре-рендери;
  - MobX: observable/action/reaction, strict mode, витоки реакцій;
  - real-time: лайфсайкл підписки, reconnection, синхронізація з кешем.

[М3 · Forms & schemas]  тригер: @rjsf, ajv, zod, react-hook-form, formik, json schema
  - коректність схем: required, formats, if/then/else, dependencies, oneOf/anyOf;
  - паритет валідації client ↔ server (єдине джерело правди);
  - AJV: allErrors/coerceTypes/strict, кастомні formats/keywords, безпека $ref;
  - RJSF: кастомні widgets/fields/templates, uiSchema, масиви/вкладеність;
  - продуктивність великих динамічних форм (ре-рендер на keystroke, field-level підписки);
  - Zod: переюз, інференс, transform/refine, маппінг помилок; RHF: register vs Controller, resolver;
  - доступність помилок (aria-invalid, фокус на першу помилку); offline-persistence чернеток.

[М4 · Maps & viz]  тригер: mapbox-gl, maplibre-gl, ol (openlayers), deck.gl, @turf,
                            highcharts, chart.js, @antv/g6, geojson
  - продуктивність при багатьох фічах: clustering, vector tiles, WebGL vs DOM, розмір GeoJSON;
  - витоки пам'яті: cleanup карти/шарів/джерел на unmount, зняття слухачів, не new Map() на ре-рендері;
  - системи координат: SRID/EPSG, порядок lng/lat, антимеридіан;
  - Turf: дублювання обчислень, мемоізація, спрощення геометрій;
  - Deck.gl: updateTriggers, дифінг даних, accessor-и; AntV G6: лайфсайкл графа, фільтри/drag;
  - чарти: downsampling серій, update замість ре-ініціалізації;
  - синхронізація React-стану з імперативним API карти (ref + події).

[М5 · Backend Node/Express]  тригер: express + (без @nestjs), mongoose, joi
  - безпека: auth/JWT, зберігання паролів (bcrypt), CORS, helmet, rate limiting, IDOR;
  - валідація вводу (Joi/Zod), консистентність відповідей API, обробка помилок, async/await;
  - БД: індекси, N+1, .select/проєкції, .lean(), пагінація, транзакції;
  - надійність: валідація env, конфіг, логування, graceful shutdown;
  - тестове покриття.

[М6 · NestJS]  тригер: @nestjs/*, декоратори @Module/@Injectable/@Controller
  - межі модулів і DI: провайдери, scopes, circular deps, forwardRef-милиці;
  - DTO + class-validator/transformer, ValidationPipe (whitelist/forbidNonWhitelisted/transform);
  - порядок Pipes/Guards/Interceptors/Filters, exception filters, єдина форма помилок;
  - auth: Passport, JWT, guards, RBAC/IDOR; ConfigModule + валідація env (без process.env по коду);
  - БД-шар: транзакції, продуктивність, repository pattern, міграції;
  - Swagger: повнота декораторів; тести: unit з мок-провайдерами, e2e через Test-модуль.

[М7 · Бази даних]  тригер: pg/postgres, postgis, pgvector, tsvector, mongodb, mongoose,
                            drizzle-orm, typeorm, prisma, mysql, better-sqlite3
  - схема/нормалізація, типи, constraints;
  - індекси: composite/partial/покривні; GIN/GiST (PostGIS/tsvector); ivfflat/hnsw (pgvector);
  - продуктивність: EXPLAIN ANALYZE, seq scans, N+1, відсутні індекси;
  - PostGIS: spatial-індекси, SRID, ST_*-функції; pgvector: розмірність, оператори відстані, recall↔швидкість;
  - гібридний пошук (vector+keyword+spatial), RRF; транзакції/ізоляція, гонки, deadlocks;
  - безпека міграцій (locks, backfill, zero-downtime); ORM: lazy/eager join-и, SQLi у raw;
  - Mongoose: .lean(), проєкції, populate N+1, валідація схем, індекси; пул з'єднань.

[М8 · Тестування]  тригер: vitest, jest, @testing-library, @playwright, storybook, msw
  - поведінка, а не реалізація; пріоритет запитів RTL (getByRole > … > testId без зловживань);
  - прогалини: критичні шляхи, edge cases, error/empty стани;
  - async: findBy/waitFor замість sleep, act-warnings, fake timers;
  - мокання: MSW для мережі, не over-mock; ізоляція й детермінізм;
  - Playwright: локатори й auto-wait, network idle, retries проти флакі;
  - Storybook: a11y-addon, interaction/play-тести; швидкість і паралелізація.

[М9 · Build & tooling]  тригер: vite, webpack, module federation, nx, monorepo-workspaces
  - розмір бандла: бюджети, code splitting, tree-shaking, dynamic import;
  - Module Federation: shared deps, singletons, збіг версій (strictVersion), runtime-помилки, типи;
  - Nx: межі проєктів + tags/lint-constraints, affected, кеш, task pipeline, дублювання конфігів;
  - Vite: optimizeDeps, env, build target, SSR; source maps, швидкість CI, кешування.

[М10 · AI / Agentic]  тригер: @anthropic-ai/sdk, ai (vercel ai sdk), @modelcontextprotocol,
                               embeddings/rag, langfuse, @opentelemetry
  - RAG: chunking, відповідність embedding-моделі, гібридний retrieval + налаштування RRF, reranking;
  - grounding gate / контроль галюцинацій: відмова на out-of-corpus, цитування з перевіркою;
  - агент/tool-calling: схеми інструментів, обробка помилок, retries, умови завершення (нема циклів),
    вартість/латентність, streaming;
  - MCP-сервер: визначення інструментів, transport, auth, валідація схем, єдина логіка in-app + MCP;
  - structured output: жорсткість схеми, парсинг, валідація, retry на невалідне;
  - evals: покриття harness, регресії, golden set; observability: spans, токени/вартість, Langfuse;
  - безпека: prompt injection через дані/інструменти, ізоляція секретів, обмеження дій агента.

─── НАСКРІЗНІ (вмикай, якщо релевантно, незалежно від решти) ───

[М11 · TypeScript]  тригер: .ts/.tsx, tsconfig.json
  - строгість (strict, noUncheckedIndexedAccess); any/as/!/@ts-ignore, що ховають баги;
  - дженерики, дискриміновані юніони, exhaustiveness (never); межа runtime↔compile (Zod на вході даних);
  - узгодженість типів DTO ↔ схема БД ↔ API.

[М12 · Безпека]  тригер: auth, ввід користувача, БД, секрети, завантаження файлів, webhooks/stripe
  - AuthN/AuthZ, IDOR, перевірка прав на кожному ендпоінті; XSS (dangerouslySetInnerHTML),
    SQL/NoSQL-ін'єкції, CSRF/SSRF, відкриті редіректи;
  - секрети не в коді/бандлі/логах; cookie-флаги (HttpOnly/SameSite/Secure), CORS, CSP;
  - rate limiting, brute-force, enumeration; витоки даних у відповідях/помилках;
  - вразливі залежності; підписи webhooks, валідація типу/розміру файлів, права у S3/Cloudinary.

═══ КРОК 2. ФОРМАТ КОЖНОЇ ЗНАХІДКИ ═══
[модуль] · файл:рядок · серйозність (Critical/High/Medium/Low)
· чому проблема (конкретний ризик, не загальні слова)
· виправлення з прикладом коду під цей стек і РЕАЛЬНІ версії з package.json.

═══ КРОК 3. ПІДСУМОК ═══
- топ-5 пріоритетних покращень;
- швидкі wins (до 1 год);
- стратегічні покращення (рефакторинг на потім).

═══ ПРАВИЛА ═══
- Спирайся тільки на реальний код. Не вигадуй проблем.
- Враховуй ТОЧНІ версії з package.json — не радь API з іншого мажора.
- Модуль, що не активувався, не згадуй узагалі.
- Це рев'ю, не фікс: пропонуй зміни, але не редагуй файли без окремого прохання.
- Конкретика важливіша за повноту: 8 точних знахідок краще за 30 загальних.
