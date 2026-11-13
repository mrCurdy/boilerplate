# Full-stack Boilerplate

A starting point for new web apps: React + Tailwind (TSX) frontend, Express backend, Socket.io realtime, JWT auth with roles, a live-customizable design system, and a storage layer that switches between **JSON file / SQLite / PostgreSQL** with one env var. Dockerized and typed end to end.

| Layer   | Stack                                                                                    |
| ------- | ---------------------------------------------------------------------------------------- |
| Client  | React 19, Vite 8, Tailwind CSS 4, React Router 8, socket.io-client, cva + tailwind-merge |
| Server  | Express 5, Socket.io 4, zod, jsonwebtoken, bcryptjs, helmet, pino                        |
| Storage | JSON file · better-sqlite3 · pg (repository pattern, chosen by `DB_DRIVER`)              |
| Shared  | `@app/shared`: types, roles, zod schemas, typed socket events, appearance model          |
| Tooling | TypeScript 6, npm workspaces, Vitest, ESLint, Prettier, Docker                           |

**Contents:** [Quick start](#quick-start) · [Start a new project](#start-a-new-project-from-this-boilerplate) · [Remove demo features](#keep-or-remove-the-demo-features) · [Add a feature (walkthrough)](#walkthrough-adding-a-feature-end-to-end) · [Conventions](#conventions) · [Reference](#reference) · [Docker & deploy](#docker--deployment) · [Testing](#testing) · [Troubleshooting](#troubleshooting)

---

## Quick start

Requires **Node ≥ 22.22** and npm. Docker is optional.

```bash
cp .env.example .env        # then change the JWT secrets (see step 3 below)
npm install
npm run dev                 # client http://localhost:5173 · API http://localhost:3000
```

Sign in with the seeded admin from `.env` (`admin@example.com` / `admin12345` by default). If no admin is configured, the **first account registered** becomes admin.

| Command                   | What it does                                                                     |
| ------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`             | Server (tsx watch) + client (Vite) together                                      |
| `npm run build`           | Bundle server (`server/dist`) and client (`client/dist`)                         |
| `npm start`               | Run the built server; it also serves the client build when `NODE_ENV=production` |
| `npm test`                | Server API + socket tests (JSON & SQLite drivers) and client tests               |
| `npm run typecheck`       | `tsc --noEmit` in every workspace                                                |
| `npm run lint` / `format` | ESLint / Prettier                                                                |
| `npm run db:up`           | Start only PostgreSQL in Docker (for local dev)                                  |

---

## Start a new project from this boilerplate

### 1. Copy it

Pick one:

```bash
# A) Plain copy from your local machine (no git history, no build output, no local data)
rsync -a --exclude node_modules --exclude dist --exclude .git --exclude 'data/*' --exclude .env \
  ~/Projects/boilerplate/ ~/Projects/my-app/
cd ~/Projects/my-app && git init

# B) From GitHub: push this repo once and tick "Template repository" in its settings.
#    Then "Use this template" on GitHub, or:
npx degit <your-user>/boilerplate my-app
```

### 2. Rename

| What                    | Where                                                    |
| ----------------------- | -------------------------------------------------------- |
| Project name            | `"name"` in the root `package.json`                      |
| Browser tab title       | `<title>` in `client/index.html`                         |
| Logo + name in sidebar  | `Brand()` in `client/src/components/layout/AppShell.tsx` |
| Favicon                 | `client/public/favicon.svg`                              |
| Docker image name       | `image:` in `docker-compose.yml`                         |
| Postgres DB / user name | `POSTGRES_*` in `.env` (optional)                        |

The internal workspace names (`@app/shared`, `@app/server`, `@app/client`) are private and used in many imports, so leave them as they are.

### 3. Configure `.env`

```bash
cp .env.example .env
# Generate two different secrets and paste them into JWT_ACCESS_SECRET / JWT_REFRESH_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Also set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (seeded on first start) and choose `DB_DRIVER` (see [Database drivers](#database-drivers)). A sensible default is SQLite to start and Postgres once you deploy something real. Switching later needs no code changes, but data doesn't move automatically.

### 4. Set your brand

Change `DEFAULT_APPEARANCE` in `shared/src/appearance.ts` (brand hue, font, radius, …). Easiest: tune it on the `/appearance` page, then copy the values over. **Keep the Layer 1 defaults at the top of `client/src/styles/index.css` in sync**: they are what renders before JavaScript loads.

### 5. Trim the demos, then build your app

Decide which demo features to keep (next section), replace `client/src/pages/Home.tsx`, and start adding your own features (see the [walkthrough](#walkthrough-adding-a-feature-end-to-end)).

> **Fresh-project tip:** until your first real deployment, you may freely edit migration `id: 1` in `server/src/db/sqlite/migrations.ts` and `server/src/db/postgres/migrations.ts` (and delete `data/` locally). After you've deployed, migrations are append-only.

---

## Keep or remove the demo features

Everything below is optional except **auth, users/roles, the UI kit components and the app shell**. To remove a feature, delete its files, then run `npm run typecheck` and fix the errors it reports; that's the complete list of remaining references. Then run `npm test` and delete the matching test blocks.

Pages are wired in three places: **the route in `client/src/App.tsx`, `NAV` in `components/layout/AppShell.tsx`, and `FEATURES` in `pages/Home.tsx`**.

| Feature              | Delete                                                                  | Then clean up references in                                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Notes (CRUD)**     | `client/src/pages/Notes.tsx`, `server/src/routes/notes.ts`              | Page wiring, `app.ts` (mount), `NoteRepo` in `db/types.ts` + 3 drivers + `notes` table in migrations, `Note*` in `shared/src/types.ts`, `note*Schema` in `schemas.ts`, `counts.notes` in `routes/system.ts` + `SystemInfo`, Admin stats |
| **Moderation page**  | `client/src/pages/Moderation.tsx`                                       | Page wiring. It moderates notes, so remove it together with Notes                                                                                                                                                                       |
| **Chat**             | `client/src/pages/Chat.tsx`, `server/src/sockets/chat.ts`               | Page wiring, `registerChat` in `sockets/index.ts`, `chat:*` events in `shared/src/socket.ts`, `ChatMessage`, `CHAT_ROOMS`, `chatMessageSchema`, `MessageRepo` + `messages` table, `counts.messages`                                     |
| **Presence**         | `server/src/sockets/presence.ts`                                        | `sockets/index.ts` (`presence.stats` feeds `realtime.stats`), `presence:*` and `system:stats` events, Chat sidebar, Admin live stats                                                                                                    |
| **Admin dashboard**  | `client/src/pages/Admin.tsx`                                            | Page wiring. Keep `routes/users.ts` if you still need user management via the API                                                                                                                                                       |
| **Appearance page**  | `client/src/pages/Appearance.tsx`                                       | Page wiring + header button in `AppShell.tsx`. Keep `AppearanceProvider` if you still want an admin-published default; delete it too to use only the CSS defaults                                                                       |
| **UI Kit page**      | `client/src/pages/UiKit.tsx`                                            | Page wiring. **Recommended to keep** as living documentation of your design system                                                                                                                                                      |
| **Profile page**     | `client/src/pages/Profile.tsx`                                          | Page wiring + the user dropdown item in `AppShell.tsx`                                                                                                                                                                                  |
| **Socket.io at all** | `server/src/sockets/`, `client/src/lib/socket.ts`, `hooks/useSocket.ts` | `server/src/index.ts`, `context.ts` (keep the no-op `Realtime`), `AuthContext.tsx`, `AppearanceContext.tsx`, `AppShell.tsx` (status dot), `shared/src/socket.ts`, the `socket.io*` dependencies                                         |
| **A DB driver**      | `server/src/db/<driver>/`                                               | Its `case` in `db/index.ts`, the enum in `config.ts`, the npm dependency (`better-sqlite3` or `pg`)                                                                                                                                     |

---

## Walkthrough: adding a feature end to end

Example: a `Project` entity that each user owns. Follow the same order for any feature; at each step the compiler tells you what's still missing.

**1. Shared contract:** `shared/src/types.ts` and `shared/src/schemas.ts`

```ts
// types.ts
export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

// schemas.ts — used by the server to validate AND by forms on the client
export const projectCreateSchema = z.object({ name: z.string().trim().min(1).max(100) });
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
```

**2. Repository interface:** `server/src/db/types.ts`

```ts
export interface ProjectRepo {
  listByUser(userId: string): Promise<Project[]>;
  create(data: Pick<Project, 'userId' | 'name'>): Promise<Project>;
}
// …and add `projects: ProjectRepo;` to the `Db` interface
```

**3. Implement it in every driver.** `npm run typecheck -w server` now points at each one:

- `db/json/index.ts`: add `projects: Project[]` to `JsonData` and `empty()`, then the methods (copy the `notes` block).
- `db/sqlite/migrations.ts` and `db/postgres/migrations.ts`: append a migration with the next `id` (`CREATE TABLE projects …`).
- `db/sqlite/index.ts` and `db/postgres/index.ts`: add the methods (copy the `notes` block, including the row ↔ object mapping).

**4. Route:** `server/src/routes/projects.ts`, then mount it in `app.ts` with `api.use('/projects', projectsRouter(ctx))`

```ts
export function projectsRouter({ db, auth }: AppContext) {
  const r = Router();
  r.use(auth.requireAuth); // or auth.requireRole('moderator')

  r.get('/', async (req, res) => {
    res.json({ projects: await db.projects.listByUser(req.auth!.sub) });
  });

  r.post('/', validateBody(projectCreateSchema), async (req, res) => {
    const { name } = req.body as ProjectCreateInput;
    res.status(201).json({ project: await db.projects.create({ userId: req.auth!.sub, name }) });
  });

  return r;
}
```

Throw `HttpError.notFound()` / `.forbidden()` / `.badRequest()` from `lib/errors.ts`. Express 5 forwards async errors, and the error handler turns them into JSON.

**5. Page:** `client/src/pages/Projects.tsx`

```tsx
export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    api.get<{ projects: Project[] }>('/projects').then((r) => setProjects(r.projects));
  }, []);

  return (
    <>
      <PageHeader
        title="Projects"
        actions={<Button leftIcon={<Plus className="h-4 w-4" />}>New</Button>}
      />
      {/* Card, Table, EmptyState, Modal, FormField … from '@/components/ui' */}
    </>
  );
}
```

`api` attaches the token and refreshes it silently. On errors it throws `ApiError`; `fieldErrors(err)` from `lib/errors.ts` maps validation errors onto form fields. `Notes.tsx` is a complete reference (list, create/edit modal, optimistic toggle, delete confirm).

**6. Wire the page:** add `{ path: 'projects', lazy: page(() => import('@/pages/Projects')) }` inside the right `ProtectedRoute` in `App.tsx`, and an entry in `NAV` (`AppShell.tsx`).

**7. Test:** add a `describe` block to `server/tests/api.test.ts`. It runs automatically against every DB driver.

**Realtime variant:** to push updates live, add the event to `ServerToClientEvents` in `shared/src/socket.ts`, call `ctx.realtime.broadcast('projects:changed', …)` from the route (or `io.to(userRoom(id))` in a socket handler), and listen in the page with `useSocketEvent('projects:changed', handler)`.

---

## Conventions

These keep the codebase reusable. Please follow them as the app grows.

- **Styling:** use semantic utilities only (`bg-surface`, `text-fg-muted`, `bg-primary`, `border-border`, `rounded-md`, `shadow-card`), never raw palette classes like `bg-indigo-600` or hex colors. That's what makes dark mode and the Appearance page work everywhere.
- **Reuse before you write:** check `components/ui` (and the `/ui` page) first. A new generic component goes in `components/ui`, gets exported from its `index.ts` and demoed on `UiKit.tsx`. Feature-specific components stay next to their page.
- **One source of truth for data shapes:** types and zod schemas live in `shared/`. The server validates with them (`validateBody`); forms can pre-validate with the same schema (see `Register.tsx`).
- **Storage access only through `Db` repositories:** routes and sockets never import a specific driver.
- **Dates:** calendar days are local `YYYY-MM-DD` strings (`formatDate` in `shared/src/dates.ts`, `dateSchema`, `dateParam`), never `toISOString()`, which is UTC and can be a day off.
- **Authorization lives on the server:** `requireAuth` / `requireRole` on routes, `socket.data.user` in socket handlers. `ProtectedRoute` and `RoleGate` on the client are UX only.
- **Config via env:** add new variables to the zod schema in `server/src/config.ts` (the server fails fast on invalid config), to `.env.example`, and to `docker-compose.yml` if Docker needs them.
- **Errors:** throw `HttpError` on the server. On the client, show `toast.error(…)` or an inline `<Alert>`.
- **Confirmations:** `if (await confirm({ title, description, confirmLabel })) …` with `useConfirm()`, not a `<ConfirmDialog>` plus open state per page.
- **Inline edits:** a field that saves to the server uses `CommitInput` / `CommitTextarea` (one request on blur or Enter, Escape reverts), not a request per keystroke.
- **Before committing:** `npm run lint && npm run typecheck && npm test`.

---

## Reference

### Project layout

```
shared/src/        roles.ts · types.ts · schemas.ts (zod) · socket.ts (event maps) · appearance.ts
                   dates.ts (local YYYY-MM-DD: formatDate, addDays, todayLocal, dateRange)
server/src/
  config.ts        env validation (fails fast on bad config)
  context.ts       AppContext: config, db, tokens, auth middleware, realtime hooks
  app.ts           express app: security, routers, static client, errors
  build.ts         build stamp (builtAt, commit) shown by /api/health, set by tsup.config.ts
  db/              types.ts (repo interfaces) · json/ · sqlite/ · postgres/ · seed.ts
  auth/            tokens.ts (JWT + refresh rotation) · middleware.ts (requireAuth / requireRole)
  routes/          auth · users · notes · settings · system
  sockets/         handshake auth · chat · presence
  middleware/      validate · error · rateLimit
  lib/             errors.ts (HttpError) · params.ts (param, dateParam, found) · logger.ts
server/tests/      supertest + socket.io-client, run per DB driver
client/src/
  styles/index.css design tokens (parameters → light/dark colors → Tailwind utilities)
  components/ui/   the reusable style system (Button, Input, Card, Modal, Table, Slider, …,
                   CommitInput/CommitTextarea, ClearableInput, AddForm, DragHandle)
  components/layout, components/auth (ProtectedRoute, RoleGate)
  context/         Auth · Theme · Appearance · Toast · Confirm (useConfirm)
  lib/             api.ts (fetch + silent refresh) · socket.ts · appearance.ts · cn.ts · format.ts · errors.ts
                   numbers.ts (parseQty, parseNumber) · download.ts (downloadBlob)
                   useDragSort.ts · useListsDragSort.ts (drag-and-drop reordering)
  test/            setup.ts (jest-dom, cleanup) · fetch.ts (mockApi: a fake API for page tests)
  hooks/           useSocketEvent · useConnectionStatus
  pages/           Home · UiKit · Appearance · Notes · Chat · Profile · Moderation · Admin · Login/Register
                   uikit/DragDemos.tsx (drag-and-drop demos, with a pointer-drag test)
```

### Database drivers

Set `DB_DRIVER` in `.env`:

| Driver     | Use for                   | Config                           |
| ---------- | ------------------------- | -------------------------------- |
| `json`     | prototypes, demos         | `JSON_DB_PATH=../data/db.json`   |
| `sqlite`   | small apps, single server | `SQLITE_PATH=../data/app.sqlite` |
| `postgres` | anything bigger           | `DATABASE_URL=postgres://…`      |

Routes and sockets only see the interfaces in `server/src/db/types.ts`, so switching drivers needs no code changes. IDs are UUIDs everywhere, so data shapes stay portable between drivers. SQLite and Postgres apply migrations on startup (`db/*/migrations.ts`). These are append-only: add a new entry for each change and never edit an applied one. A small key/value `settings` repo is also available for app-wide config (`db.settings.get/set/delete`).

### Auth & roles

- Roles are ordered `user < moderator < admin` (`shared/src/roles.ts`). `hasRole(role, min)` means "at least `min`". Adding a role is a single array edit.
- **Access token:** a JWT (default 15 min) held in memory on the client and sent as `Authorization: Bearer`. It carries `sub`, `role` and `name`.
- **Refresh token:** an opaque random value (default 7 days) in an `httpOnly` cookie scoped to `/api/auth`, stored only as a hash. It is **rotated on every refresh**; replaying an old one revokes the whole session family.
- The client (`lib/api.ts`) refreshes silently on a 401 and retries the request; parallel 401s share one refresh.
- When an admin changes a user's role, the server pushes `auth:refresh` to that user's sockets, and their tabs pick up the new role right away. Deleting a user disconnects their sockets.
- Server: `auth.requireAuth`, then `auth.requireRole('moderator')`. Client: `<ProtectedRoute minRole="admin" />` and `<RoleGate minRole="moderator">`.

### Realtime (Socket.io)

The socket connects with the current access token (`handshake.auth.token`) and reconnects with a refreshed one if needed. Event types live in `shared/src/socket.ts`, so client and server stay in sync at compile time.

**Adding an event:** add it to `ClientToServerEvents` / `ServerToClientEvents`, handle it in a new `server/src/sockets/<feature>.ts` registered in `sockets/index.ts`, and listen on the client with `useSocketEvent('event', handler)`. From REST routes, use `ctx.realtime.broadcast(...)`, `refreshUser(id)` or `disconnectUser(id)`.

Rooms used: `user:<id>` (all of a user's tabs), `role:admin` (live stats), `chat:<room>`.

### Style system

1. **Tokens:** `client/src/styles/index.css` has three layers. Layer 1 is a few _parameters_ (brand hue/chroma, neutral tint, font, radius, density, shadow). Layer 2 is semantic colors derived from them for light and `[data-theme='dark']`. Layer 3 is `@theme`, which maps everything to Tailwind utilities (`bg-surface`, `text-fg-muted`, `bg-primary`, `rounded-md`, `p-4`, …).
2. **Components:** `client/src/components/ui/`, all imported from `@/components/ui`. Variants use `class-variance-authority`. Every component accepts `className`, merged with `cn()` so your classes win over the defaults.
3. **Showcase:** the `/ui` page renders every component and variant.
4. **Drag and drop:** `useDragSort(count, onMove, { free })` reorders one list (`free`: a grid, the card under the pointer is `over`); `useListsDragSort(counts, onMove)` also moves rows between lists. Both work with mouse, touch and ↑/↓ on the focused `<DragHandle>`; put the grip in a card with `<CardHeader grip={…}>`. See `pages/uikit/DragDemos.tsx`; its test shows how to fake row positions in jsdom.
5. **Helpers in `index.css`:** `focus-ring`, `scrollbar-thin` / `scrollbar-thick`, `no-spin` (number inputs without arrows). On touch screens fields get at least 16px text, so iOS doesn't zoom in on focus.

### Appearance customizer

The `/appearance` page changes the Layer 1 parameters live: brand hue and saturation, neutral hue and tint, font family (system or Google Fonts), base font size, corner radius, spacing density, shadow strength, light/dark mode, plus presets.

- `shared/src/appearance.ts` defines the parameters (zod schema, defaults, presets, fonts) and `appearanceToCssVars()`. The client sets those variables on `<html>`, so every component re-themes with no component changes.
- Precedence: **your browser's overrides → site default → built-in default**. Overrides live in `localStorage`. `public/theme-init.js` reapplies them before first paint, so reloads don't flash.
- **Admins** can publish the current look as the site default (`PUT /api/settings/appearance`). It's stored via `db.settings`, pushed live to every client with the `settings:appearance` socket event, and fetched by signed-out visitors on load.

To add a parameter: add it to `appearanceSchema` and `DEFAULT_APPEARANCE`, map it in `appearanceToCssVars`, use the variable in `index.css` (with a default in Layer 1), and add a control on `pages/Appearance.tsx`.

### Cheat sheet

| I want to add…          | Touch                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| a page                  | `client/src/pages/X.tsx` → route in `App.tsx` (lazy, inside the right `ProtectedRoute`) → `NAV` in `AppShell.tsx` |
| an API endpoint         | zod schema in `shared/src/schemas.ts` → router in `server/src/routes/` → mount in `app.ts`                        |
| a UI component          | `client/src/components/ui/X.tsx` → export in `ui/index.ts` → demo on `UiKit.tsx`                                  |
| a DB entity             | [walkthrough](#walkthrough-adding-a-feature-end-to-end) steps 1–3                                                 |
| a socket event          | [Realtime](#realtime-socketio)                                                                                    |
| an env variable         | `server/src/config.ts` schema → `.env.example` → `docker-compose.yml`                                             |
| a 404 for a missing row | `found(await db.x.find(id), 'X')` from `server/src/lib/params.ts` (route params: `param(req, 'id')`)              |
| a role                  | `ROLES` in `shared/src/roles.ts` (order = rank) → `roleTone` in `AppShell.tsx`                                    |
| an appearance setting   | [Appearance customizer](#appearance-customizer)                                                                   |
| drag to reorder         | `useDragSort` / `useListsDragSort` + `<DragHandle {...sort.handleProps(i)} />` (see `pages/uikit/DragDemos.tsx`)  |
| a yes/no question       | `const confirm = useConfirm()` → `if (await confirm({ title: 'Delete?' })) …` (see `Notes.tsx`)                   |

---

## Docker & deployment

```bash
docker compose up --build                                          # SQLite (data in volume app-data)
DB_DRIVER=json docker compose up --build                           # JSON file
DB_DRIVER=postgres docker compose --profile postgres up --build    # + PostgreSQL 17
```

The app runs on http://localhost:3000. One container serves both the API and the built SPA. The image is multi-stage, runs as a non-root user, and has a healthcheck on `/api/health`. Compose reads `JWT_*`, `ADMIN_*` and so on from `.env`. Container logs rotate (json-file, 3 × 10 MB).

`/api/health` also says which build is running: `builtAt` and `commit` (stamped by `server/tsup.config.ts`; `commit: "unknown"` in Docker, where `.git` is ignored; `commit: "source"` when run from source).

### Deploying to a server

Keep a deployable branch (`production` by default). On the server (Docker with the compose plugin):

```bash
git clone -b production <repo-url> app && cd app
cp .env.example .env   # JWT secrets, ADMIN_*, PUBLIC_URL, APP_PORT; HTTPS_ONLY=true behind TLS
./deploy.sh            # later updates: just ./deploy.sh again
```

`deploy.sh` fast-forwards to `origin/production`, copies the live SQLite database to `backups/app-<time>.db` (newest 10 kept), rebuilds the image, restarts and waits for the health check; if the new version isn't healthy it starts the previous image again. `--no-pull` deploys the checkout as it is. The DB copy is skipped for `json` and `postgres` (back those up yourself; with postgres also set `COMPOSE_PROFILES=postgres` in `.env`). Rename `IMAGE`, `SERVICE` and `BACKUP_PREFIX` at the top of the script with your project. Behind a reverse proxy on the same host, set `APP_BIND=127.0.0.1` and `HTTPS_ONLY=true`.

### Production checklist

- [ ] Strong, different `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (48+ random bytes)
- [ ] Changed `ADMIN_PASSWORD`, or removed `ADMIN_EMAIL`/`ADMIN_PASSWORD` once the admin exists
- [ ] `PUBLIC_URL` set to your real origin (used for CORS and Socket.io)
- [ ] Served over HTTPS (TLS at a reverse proxy is fine). `HTTPS_ONLY=true` (the default) enables Secure cookies and HSTS; set `false` only for plain-http testing
- [ ] `DB_DRIVER=postgres` (or SQLite on a persistent volume) with a non-default `POSTGRES_PASSWORD`
- [ ] Backups for the `pg-data` / `app-data` volumes
- [ ] Rate limits in `server/src/middleware/rateLimit.ts` fit your traffic
- [ ] If you add external scripts, images or APIs, extend the CSP in `app.ts` (`helmet({ contentSecurityPolicy })`)

---

## Testing

```bash
npm test                                                                      # shared + JSON + SQLite + client
TEST_DATABASE_URL=postgres://u:p@localhost:5432/test_db npm test -w server   # + Postgres
```

The Postgres run **truncates all tables** in that database, so point it at a throwaway one, for example:
`docker run --rm -d -p 55432:5432 -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test postgres:17-alpine`.

Shared tests sit next to the code (`shared/src/*.test.ts`). Server tests live in `server/tests/` (`helpers.ts` has `setup`, `signUp`, `signIn`, `bearer`). Client tests sit next to the components and pages (`*.test.tsx`).

Page tests fake the API with `mockApi` from `client/src/test/fetch.ts`: one function answers each call by method and path, and gets the body and headers (so a test can check the bearer token). See `pages/Login.test.tsx`; it also mocks `@/lib/socket`, since jsdom has no server to connect to.

```ts
const fetch = mockApi((method, path, body, headers) => {
  if (path === '/auth/refresh') return unauthorized;
  if (method === 'POST' && path === '/notes') return { status: 201, body: { note } };
}); // anything else → 404; afterEach(() => vi.unstubAllGlobals())
```

---

## Troubleshooting

| Symptom                                                       | Fix                                                                                                                                                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The app behaves unlike the code (e.g. a new field is ignored) | Check what is serving :3000: `curl -s localhost:3000/api/health`. A `builtAt` older than your change (or `npm start` running `dist/`) is a stale build: rebuild/restart, or use `npm run dev` (`commit: "source"`) |
| Server exits with `Invalid environment configuration`         | The message lists each bad variable. Usually the JWT secrets are missing or shorter than 32 chars                                                                                                                  |
| `better-sqlite3` error after switching Node versions          | `npm rebuild better-sqlite3`                                                                                                                                                                                       |
| Logged out on every reload in production                      | Site served over plain http with `HTTPS_ONLY=true`, so the browser drops the Secure refresh cookie. Use HTTPS (or `HTTPS_ONLY=false` for testing)                                                                  |
| CORS or socket errors in dev                                  | `CLIENT_URL` must match the Vite origin (`http://localhost:5173`). In Docker, set `PUBLIC_URL`                                                                                                                     |
| Port 3000 / 5173 / 5432 already in use                        | Change `PORT`, the Vite `server.port` in `client/vite.config.ts`, or `APP_PORT` / `POSTGRES_PORT` for Docker                                                                                                       |
| Web font doesn't load                                         | Google Fonts blocked by the network or your CSP. Pick the "System UI" font or self-host the font                                                                                                                   |
| Old schema in dev after editing migration 1                   | Delete `data/` (SQLite/JSON) or `docker compose down -v` (Postgres) and restart                                                                                                                                    |
| `npm install` warns about TypeScript peer versions            | TypeScript is pinned to `~6.0` because `typescript-eslint` doesn't support 6.1+/7 yet. Bump both together                                                                                                          |
