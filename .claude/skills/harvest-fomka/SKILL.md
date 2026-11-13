---
name: harvest-fomka
description: Port reusable components and systems from the Fomka app (~/Projects/housekeeping_stock) into this boilerplate, one numbered step per session. Use when asked to "do step N of harvest-fomka", "continue the harvest" or "/harvest-fomka".
---

# Harvesting Fomka into the boilerplate

Fomka (`~/Projects/housekeeping_stock`, below `FOMKA/`) was built from this boilerplate and grew
generic pieces the boilerplate lacks. This skill ports them back, **one step per session**: the user
clears the context between steps.

## Routine for every step

1. Work in `~/Projects/boilerplate` on its current branch (`git branch --show-current`; use the
   branch the user set up, never `FOMKA/`'s). The tree must be clean before you start; if not, ask.
2. Do only the requested step (or the first unchecked one below). Read only the files it lists, on
   both sides. Compare with `diff`, don't read whole files you don't change.
3. **Make it generic while porting:** no Fomka words (stock, items, rooms, departures, checklist,
   housekeeping), no Fomka-only imports (`StockContext`, `@app/shared` stock rules). Keep comments
   short, in the boilerplate's tone. Semantic colour tokens only.
4. Every new generic UI component: `components/ui/` + export in `ui/index.ts` + a demo on
   `pages/UiKit.tsx` + a test in `components/ui/ui.test.tsx` (or next to it).
5. Tests next to the code, as in Fomka. Run the touched test file first, then once at the end:
   `npm run lint && npm run typecheck && npm test`. Paste failures, don't paraphrase.
6. Update `README.md` (layout, cheat sheet, conventions, the section the step touches) in the same
   commit.
7. Tick the step here (`- [x]`), add one line under it for any decision that differs from the
   plan, commit with `Harvest step N: <what>` (plus the attribution line from the system prompt).
   Never push.
8. Stop and report in 3–5 lines: what was ported, what was left, anything the next step must know.

Token savers: never read `FOMKA/client/src/i18n/et.ts`/`ru.ts`, `package-lock.json`, `dist/`,
`data/`. Grep big files (`FOMKA/client/src/context/StockContext.tsx`,
`FOMKA/server/src/db/sqlite/index.ts`) for the part you need. Don't re-read files after editing.

## Steps

- [x] **1. Server and deploy plumbing**
  - Build info in `/api/health`: `FOMKA/server/src/build.ts`, the `define`/`commit()` part of
    `FOMKA/server/tsup.config.ts`, `routes/system.ts` (`builtAt`, `commit`; keep the boilerplate's
    `/meta` and `/info`). Test: health returns `commit: 'source'` from source.
  - Static files in `app.ts`: only `/assets` (hashed) is `immutable, 1y`; the rest of `client/dist`
    (theme-init.js, favicon) is served without long caching.
  - `HttpError.tooManyRequests` (`lib/errors.ts`); `FOMKA/server/src/lib/params.ts` → `param`,
    `found` (`dateParam` comes in step 2 with the date schema).
  - `docker-compose.yml`: `APP_BIND` on the port, json-file log rotation. `.gitignore`/`.dockerignore`:
    `backups/`.
  - `deploy.sh` from `FOMKA/deploy.sh`, generic: branch, image and service names from variables at
    the top; the DB copy step works for SQLite and is skipped for json/postgres (say so). README:
    "Deploying to a server" section (from `FOMKA/README.md`).
  - CLAUDE.md in Fomka mentions a stale-build check with `curl -s localhost:3000/api/health`; add it
    to the README troubleshooting table.
  - Done on branch `harvest`. `param`/`found` used in `routes/users.ts`. deploy.sh refuses to run
    without `.env` (JWT secrets are required) and reads `DB_DRIVER` from the running container.
    Committed untested (no Node in that session): run lint/typecheck/tests before step 3.

- [x] **2. Shared helpers and client test tooling**
  - `FOMKA/shared/src/dates.ts` (local `YYYY-MM-DD`: `formatDate`, `addDays`, `todayLocal`…) + a
    `dateSchema` in `schemas.ts` + tests; then `dateParam` in `server/src/lib/params.ts`.
  - `FOMKA/client/src/lib/numbers.ts` (`parseQty`, `parseNumber`) with a test, `lib/download.ts`.
  - `FOMKA/client/src/test/setup.ts` (`afterEach(cleanup)`) and `test/fetch.ts` (`mockApi`). The
    boilerplate's `api.ts` uses bearer tokens + refresh; make sure `mockApi` works with it and add
    one example test (e.g. `pages/Login.test.tsx`, pattern from `FOMKA/client/src/pages/Login.test.tsx`).
  - `mockApi`'s route also gets the request `Headers` (bearer check). `shared` got vitest + a test
    script, root `npm test` runs it first. Login test mocks `@/lib/socket`. Untested (no Node).

- [ ] **3. UI kit additions**
  - `FOMKA/client/src/components/ui/CommitInput.tsx` (`CommitInput`, `CommitTextarea`).
  - `FOMKA/client/src/components/AddForm.tsx`, `ClearableInput.tsx` → `components/ui/`.
  - `Tooltip` `align="end"`, `PageHeader` centred on phones (diff both files).
  - `FOMKA/client/src/context/ConfirmContext.tsx` (`useConfirm()`), provider in `App.tsx`; in
    `Notes.tsx` replace the `ConfirmDialog` + open-state for delete with `await confirm(…)`.
  - `styles/index.css`: the iOS 16px field rule (`@media (pointer: coarse)`), `scrollbar-thick`,
    `no-spin`. Not the `val-*` utilities (Fomka-only).
  - Text stays English literals in this step; step 6 moves it into the dictionary.

- [ ] **4. Drag-and-drop containers**
  - `FOMKA/client/src/lib/useDragSort.ts` (incl. `free` mode) and `lib/useListsDragSort.ts`.
  - Generic pieces around them in `components/ui/`: a `DragHandle` (grip button, `touch-none`,
    `aria-label`, ↑/↓ keys via `handleProps`), and a `CardHeader` slot for the grip (from
    `FOMKA/client/src/pages/stock/StockCardHeader.tsx`).
  - UiKit demos: a reorderable card grid (`free`, highlight `over`, like `FOMKA/client/src/pages/Stock.tsx`)
    and grouped lists where rows move between cards (like `FOMKA/client/src/pages/Checklist.tsx` +
    `pages/checklist/TaskGroupCard.tsx`, `TaskList.tsx`).
  - Tests: port the pointer-drag test technique from `FOMKA/client/src/pages/Checklist.test.tsx`
    (faked row positions) to a hook/demo test.

- [ ] **5. Palettes and extra components**
  - Palette switcher: `PALETTES` in `ThemeContext.tsx`, `[data-palette]` blocks in `index.css`,
    `public/theme-init.js`, `components/layout/PaletteToggle.tsx`, in the `AppShell` header.
  - The boilerplate also has the Appearance customizer, whose inline vars on `<html>` beat
    `[data-palette]`. Make them work together: palettes are named sets of the Layer 1 knobs, so
    either add them as Appearance presets and have the toggle cycle presets, or have the toggle
    clear the brand/neutral overrides. Pick one, note it under this step.
  - `FOMKA/client/src/components/Salute.tsx` (canvas fireworks that spell a text) → `components/ui/`,
    demo button on UiKit.

- [ ] **6. i18n core**
  - `FOMKA/client/src/context/I18nContext.tsx`, `i18n/plural.ts`, `i18n/en.ts` (only the generic
    sections: `common`, `theme`, `palette`, kit texts), `components/layout/LanguageSwitcher.tsx`,
    `i18n/i18n.test.tsx`. Languages: `en` + `ru` (`ru` shows the 4-form plurals); the README
    says how to add one (see "Adding a language" in `FOMKA/.claude/skills/i18n/SKILL.md`).
  - Translate the kit: `ConfirmDialog`, `Modal`, `Spinner`, `ToastContext`, `ThemeToggle`,
    `PaletteToggle`, `CommitInput`, `AddForm`, `ClearableInput`, `DragHandle`, `Salute` callers
    (diff Fomka's versions). `useI18n()` without a provider returns English, so kit tests still render.
  - `apiErrorMessage(err, t)` from `FOMKA/client/src/lib/api.ts`; keep the boilerplate's
    `fieldErrors`. `lib/format.ts` takes a `locale`.

- [ ] **7. i18n of the demo pages, part 1**: `AppShell` (NAV labels as `(t) => …`), `App.tsx`
  fallbacks, `Login`, `Register`, `Forbidden`, `NotFound`, `Home`, `Profile`, `Notes`. Add each
  page's section to `en.ts` and `ru.ts`. Server error messages stay English.

- [ ] **8. i18n of the demo pages, part 2**: `Moderation`, `Admin`, `Chat`, `Appearance`, `UiKit`.
  Then a "Text" convention in the README: never hard-code UI text.

- [ ] **9. Permission matrix**
  - `FOMKA/shared/src/auth.ts` → `shared/src/permissions.ts`: `PERMISSIONS`, `MATRIX` for the
    boilerplate roles (`user`, `moderator`, `admin`; e.g. `notes.moderate`, `users.manage`,
    `settings.appearance`), `can(role, perm)` + `permissions.test.ts`. Keep `hasRole` for
    rank checks.
  - Server: `auth.allow(perm)` next to `requireRole` (`auth/middleware.ts`); switch the demo routes
    to it. Note the `'/'`-mount rule from `FOMKA/server/src/app.ts` in a comment. 403 tests.
  - Client: `useAuth().can(perm)`, `NAV` items with `perm`, a `<Can perm>` (or `RoleGate perm`).

- [ ] **10. Day-based helpers**
  - `FOMKA/client/src/context/DateContext.tsx` (`DAYS_BACK`/`DAYS_AHEAD` as provider props,
    `locked`), `components/layout/DateSwitcher.tsx`, `formatLongDate`.
  - `FOMKA/client/src/lib/qr.ts` (dep `qrcode`, lazy import) + a `QrCode` kit component (svg, PNG
    download, print).
  - Excel export: a generic `lib/excel.ts` (`exportSheets(fileName, sheets)` with ExcelJS lazily
    imported; the column/number-format ideas from `FOMKA/client/src/lib/excel.ts`), vite
    `chunkSizeWarningLimit` comment. Demo on UiKit (export the demo table).

- [ ] **11. Optimistic data store**
  - Generalize the pattern in `FOMKA/client/src/context/StockContext.tsx` (grep `edit(`, `send(`,
    `POLL_MS`, `named(`): one dataset in context, `edit(draft => …)` applies at once, `send()` does
    one small request, on failure a toast + reload, polling, `rethrow` for pages with their own
    errors. Make it a small factory (`lib/createDataStore.tsx` or similar) and use it on `Notes.tsx`.
  - Test: an edit shows at once; a failed request toasts and reloads.

- [ ] **12. PIN auth module, server** (needs step 9)
  - `AUTH_MODE=accounts|pin` in `config.ts` (default `accounts`), `.env.example`, compose.
  - From `FOMKA/server/src/auth/`: `pins.ts` (scrypt), `sessions.ts` (cookie token, SHA-256 in DB),
    the `session`/`requireAuth` middleware, `routes/auth.ts` (login, logout, me, `PUT /auth/pins`,
    QR `GET/POST/DELETE /auth/qr`, `POST /auth/link`), `ADMIN_PIN`/`WORKER_PIN` env with the refine.
    Put it under `server/src/auth/pin/` and mount by mode. Pin-mode roles (`admin`, `worker`, link
    role `counter` → name it `link`) get their own rows in the matrix; `linkOnly(role)` replaces
    `todayOnly`.
  - Storage: a `PinAuthRepo` on `Db` (`pins`, `sessions`, `qr_links` with `sessions.link_id`),
    implemented in **json, sqlite and postgres** with new migrations (see Fomka migration 1).
  - Tests: port `FOMKA/server/tests/auth.test.ts`, `qr.test.ts`; they run per driver like the rest.

- [ ] **13. PIN auth module, client**
  - Pin-mode `AuthContext` (`FOMKA/client/src/context/AuthContext.tsx`: `/auth/me`, `?key=`
    exchange, `AUTH_EXPIRED` on 401), `pages/PinLogin.tsx` (from Fomka's `Login.tsx`, keep the
    "don't auto-submit an autofilled PIN" fix), `pages/Settings.tsx` (PIN forms + QR card).
  - The client learns the mode from `/api/meta` and picks the provider and routes.
  - Link mode in `AppShell`: no sidebar/menu, every path outside the allowed one redirects (Fomka's
    `/counter` handling; make the allowed path a setting). Port `CounterMode.test.tsx` as
    `LinkMode.test.tsx`, `Settings.test.tsx`, `AuthContext.test.tsx`.
  - README: "PIN auth" section (when to use it, env, QR flow, what's not supported: user accounts,
    sockets auth in pin mode unless you add it).

- [ ] **14. Claude tooling**
  - A `CLAUDE.md` for the boilerplate (commands, architecture, rules; model it on
    `FOMKA/CLAUDE.md`, keep it short), and generic skills in `.claude/skills/`: `ui`, `i18n`
    (glossary emptied, rules kept), `db` (all three drivers, migrations, repo methods), `auth`
    (accounts, pin mode, permission matrix), `plan-step`. Base them on `FOMKA/.claude/skills/*`,
    but describe the boilerplate as it is after steps 1–13; check every path you name exists.
  - Remove this skill's step list only if the user says so; otherwise leave it as a record.

## Not harvested (Fomka-only, on purpose)

Stock rules (`shared/src/stock.ts`), checklist history (`shared/src/checklist.ts`), the Stock,
Counter and Checklist pages, `DataMenu` and the Backup/Restore of `StockData`, the daily JSON
snapshot in the sqlite driver (shaped around `StockData`), the `val-*` styles, the et dictionary.
If the user later wants backup/restore in the boilerplate, it needs a dataset export on `Db` for
all three drivers first.
