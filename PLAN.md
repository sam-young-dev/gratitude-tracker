# Gratitude Tracker: Plan

Working title (easy to change). A private journal for recording moments you saw God working in your life, with a heat map and a few other views to look back over time.

Status: planning complete, no code written yet. Decisions below were settled in a grilling session on 2026-11-01. Change this file when a decision changes.

---

## 1. Product

**Audience.** Anyone can sign up. Each user's entries are visible only to that user. No social or sharing features in v1.

**Platform.** Mobile-first responsive web app, structured so it can become a PWA later.

**Tone.** Warm, plain language: "moments", "remember". No churchy jargon in the UI chrome. Entries carry the user's own words. No streak or guilt language anywhere.

### Entry (a "moment")

| Field | Required | Notes |
|---|---|---|
| Date | yes | Date-only (Postgres `date`), no time zone. Defaults to today in the user's local time. Editable to any past date, blocked for future dates. |
| Title | yes | |
| What happened | yes | Plain text. Blank lines become paragraphs. Rendered safely (no HTML). Roomy textarea. |
| Tags | no | Max 8 per entry. User-defined. Suggested chips: Provision, Protection, Healing, Guidance, Answered prayer, Relationships, Peace, Surprise. |
| Scripture reference | no | Free-text string (for example "Psalm 34:8"). No verse lookup in v1. |
| How it turned out | no | A single field you can add or edit later. |

Also stored: `created_at`, used to order entries within a day.
Out of scope for v1: photos, people, time of day, favorites, sharing, rich text.

### Tags

- Suggested chips are not created in the database until used.
- Unique per user, case-insensitive.
- A Tags screen lets you rename or delete. Deleting a tag removes it from entries and never deletes entries.
- Merge is a later addition.
- No limit on total tags.

### Capture flow

- Fields in order: date, title, body, tag chips. Scripture and "how it turned out" sit under "Add details".
- Unsaved new entries autosave a draft to localStorage per user. The draft clears on successful save.
- Cmd/Ctrl+Enter saves.
- Validate on submit with specific messages, for example "Add a title so you can find this later".
- The save button shows a loading state and cannot double-submit.
- Any field, including the date, can be edited later.
- First-run empty state is a single "Write your first moment" form, not a tour.

### Screens

Bottom tab bar on mobile, left rail on desktop.

| Screen | Contents |
|---|---|
| Home | Warm greeting. "On this day" card, or a random past moment if none. "Add a moment" as the single primary action. Compact heat map linking to Insights. |
| Moments | Chronological list (paginated). Full-text search. Tag and year filters. |
| Insights | Full year heat map, tag breakdown, monthly counts. |
| Entry detail | The entry, plus the "how it turned out" section with an "Add an update" button. |
| Tags | Rename and delete. |
| Settings | Theme, export, delete account. |
| Add / edit | Full-screen form on mobile, dialog on desktop. |

### Heat map

- Intensity is the entry count per day, in 4 steps of a single amber hue built in OKLCH so the steps are perceptually even.
- Calendar-year view with a year switcher (arrows), defaulting to the current year. Entries from past years stay reachable.
- Horizontal scroll on mobile.
- Tapping a cell opens that day's entries.
- Empty days are a faint neutral, never styled as a failure.
- Built as a CSS grid of real `<button>` cells, each with an `aria-label` such as "March 4, 2 moments", and arrow-key navigable.

### Other visuals

- Tag breakdown and monthly counts: TanStack Charts if the installed version is stable (see section 5). Otherwise hand-built SVG or CSS bars.
- "On this day" or random past moment on Home.
- Not in v1: streaks, word cloud.

### Retrieval

Full-text search (title, body, "how it turned out") using Postgres full-text search, plus tag and year filters, plus heat-map tap-through.

### Data ownership

- Delete an entry: hard delete behind a clear confirmation (destructive button visually separated from Cancel), with a brief undo toast before the delete commits.
- Export: JSON, plus a single readable Markdown file.
- "Delete my account and all my entries" in v1.

---

## 2. Technical decisions

| Area | Choice |
|---|---|
| App framework | TanStack Start, TypeScript |
| UI | Tailwind, shadcn/ui on Base UI primitives (confirm the shadcn CLI Base UI option at scaffold time) |
| Auth | Better Auth: email and password (email verification required), plus Google sign-in, plus password reset by email |
| Email | Gmail SMTP via Nodemailer, from a dedicated Gmail account with an app password. Wrapped in one `sendEmail()` function so moving to Resend is a one-file change once a domain is owned. Dev logs emails to the console. |
| Database | Neon Postgres, with a dev branch for local work |
| ORM and migrations | Drizzle ORM, Drizzle Kit migrations |
| Search | Generated `tsvector` column with a GIN index |
| Privacy | Every query goes through one data layer scoped by `userId`. Postgres RLS on `entries` as a second layer. |
| Hosting | Netlify (TanStack Start Netlify adapter) |
| Tests | Vitest for core logic. A few Playwright flows. |

Why Gmail SMTP and not Resend: Resend needs DNS records (SPF/DKIM) on a domain you control, and `netlify.app` subdomains don't allow that. Without a domain it only delivers to your own account email.

Assumptions (change here if wrong):
- Passwords: minimum 8 characters, no composition rules. Sessions last 30 days (Better Auth defaults).
- Google sign-ins are treated as verified.
- Rate-limit sign-in and password-reset endpoints.
- Tables: users and sessions (Better Auth), `entries`, `tags`, `entry_tags`.
- Timeline is a paginated list, not virtualized.
- English only. No analytics or third-party trackers.

### Testing scope

- Vitest: heat-map bucketing, date handling (including late-night and time zone edge cases), tag normalization, search.
- Playwright: sign up, create an entry, search, delete.

---

## 3. Design direction

- Warm paper tones in light mode. Warm charcoal in dark mode (not inverted). Both driven by semantic tokens.
- Serif for entry text, capped at 65ch. Neutral sans for UI chrome.
- Amber heat-map ramp in OKLCH.
- Alpha borders in light mode, solid quiet borders in dark mode. Layered shadows.
- `tabular-nums` on counts and dates.
- Visible focus rings, real `<button>` and `<label>` elements, color plus icon plus text for errors.
- `prefers-reduced-motion` respected. No `transition: all`. 150ms-class hover transitions, `ease-out` entrances.
- One primary action per view. Specific copy ("Save moment", never "Submit"). Empty states explain and offer a next step.
- Touch targets at least 44x44px. Inputs 16px to avoid iOS zoom.

---

## 4. Build order

Check items off as they land.

- [x] **1. Scaffold.** TanStack Start, Tailwind, shadcn/ui on Base UI. Design tokens, light and dark themes, fonts, app shell and navigation. Done 2026-11-01; see "Build notes" below.
- [~] **2. Database and auth.** Drizzle schema and migrations on the Neon dev branch. Better Auth with email and password, Google sign-in, email verification, password reset. `sendEmail()` with console logging in dev and Gmail SMTP in production. Rate limits.
  - [x] Neon dev branch, Drizzle schema and migration (`drizzle/0000_auth.sql`, applied to dev)
  - [x] Email and password sign-up, sign-in, sign-out, password reset (link printed to the server console in dev), rate limits, 30-day sessions
  - [x] Route guards: signed-out users go to `/sign-in`, signed-in users skip the auth pages
  - [ ] **Deferred by choice:** Google sign-in (needs a Google OAuth client)
  - [ ] **Deferred by choice:** Gmail SMTP credentials, so reset emails only print to the console for now
  - [ ] **Before launch:** turn on `requireEmailVerification` in `src/lib/auth.ts` (needs email sending working first)
- [x] **3. Entries and tags.** Create, edit, delete (with confirm and undo). Tag chips and the Tags screen. Draft autosave. Entry detail with "how it turned out". Data layer scoped by `userId`, plus RLS. Done 2026-11-01; see "Build notes". Deviation: add and edit are full pages on every screen size, not a dialog on desktop.
- [x] **4. Moments list.** Pagination, full-text search, tag and year filters. Done 2026-11-02; see "Build notes".
- [x] **5. Insights and Home.** Heat map (full and compact), tag breakdown, monthly counts, "On this day". Done 2026-11-02; see "Build notes".
- [x] **6. Data ownership.** JSON and Markdown export. Delete account. Done 2026-11-02; see "Build notes". Also added the theme control to Settings.
- [~] **7. Quality.** Vitest and Playwright. Pre-production pass (accessibility, mobile, empty and error states, dark mode, metadata). Netlify deploy.
  - [x] Vitest (`npm test`): 36 tests over heat-map bucketing and date math, date handling (checked under UTC, Kiritimati, Los Angeles), tag normalization, entry validation, export. Playwright already covers sign up, create, search, delete (4 flows, all passing).
  - [x] Pre-production pass, code side: favicon and theme-color, default error page, `transition-all` removed from shadcn button and badge, typecheck, lint and build clean.
  - [x] Ship check (prep for prod): `.env.dev-backup` untracked and `.env.*` gitignored. Rotating the dev credentials is skipped by choice.
  - [ ] **Pre-production pass, needs a device or a person:** screen reader and keyboard walk-through, real phone (iOS Safari: input zoom, safe areas, bottom tab bar), dark mode look, the sign-in, sign-up and reset forms in a real browser (see step 2 notes).
  - [x] **Netlify deploy (yours to do, see section 6 and "Build notes, step 7").**

---

## 4a. Build notes

Things learned while building that are not obvious from the code.

**Step 1 (scaffold)**
- Scaffolded with `npx @tanstack/cli@latest create` (React, Netlify adapter, ESLint and Prettier, no examples, no git repo). The CLI's own `shadcn` add-on uses Radix, so it was skipped.
- shadcn/ui on Base UI: `shadcn init` stalls on a TypeScript prompt in a non-interactive shell, so `components.json` was written by hand (style `base-nova`, aliases under `@/`) and components are added with `npx shadcn@latest add <name>`. The CLI left gaps that were fixed by hand: dependencies (`@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`), `src/lib/utils.ts` (`cn`), and a `from "cn"` import in `button.tsx`. Check this on every `shadcn add`: the `base-nova` style imports `cn` from shadcn's own `cn` npm package, which the CLI installs. We use `@/lib/utils` (clsx + tailwind-merge) instead, so after each `add`: replace `from "cn"` with `from "@/lib/utils"` and run `npm uninstall cn`.
- **Netlify dev emulation is disabled.** `vite.config.ts` loads the Netlify plugin only for `vite build`. In dev, the plugin starts a Deno edge-functions server that crashes the whole dev server on this machine (`unexpected argument '--allow-scripts'`). The app uses no edge functions. The production build still writes the Netlify function.
- Tokens live in `src/styles.css` (shadcn variable names plus `--heat-0..4`). Dark mode is a `.dark` class set by an inline script in `__root.tsx` before first paint, from `localStorage.theme` or the system preference. There is no theme toggle yet (Settings, step 6).
- Fonts are self-hosted via Fontsource: Inter Variable (UI) and Newsreader Variable with optical size (entry text, `.prose-entry`).
- The app shell (`src/components/app-shell.tsx`) is a left rail on desktop and a bottom tab bar on mobile. Mobile omits Tags from the tab bar, and Settings links to it.
- `routeTree.gen.ts` is generated: after adding a route file, run `npm run build` (or the dev server) before typechecking.
- `npm audit` reports 33 findings in dev-time tooling under the Netlify plugin (see step 2 notes for the production-tree findings).
- Routes exist only as placeholders with empty-state copy. There is no auth guard yet (step 2).

**Step 2 (database and auth)**
- Pieces: `src/db/index.ts` (pg Pool over the pooled URL, Drizzle), `src/db/schema/` (Better Auth tables generated with `npx auth@latest generate --config src/lib/auth.ts --output src/db/schema/auth.ts`, re-exported from `index.ts`), `src/lib/auth.ts` (server config), `src/lib/auth-client.ts`, `src/lib/auth.functions.ts` (`getSession` server function), `src/lib/email.ts` (`sendEmail`), `src/routes/api/auth/$.ts` (handler).
- Migrations: edit the schema, then `npx drizzle-kit generate --name <name>` and `npx drizzle-kit migrate`. Both read `DATABASE_URL_UNPOOLED` through `drizzle.config.ts`. `migrate` writes to whichever branch `.env` points at.
- Env: `.env` needs `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`; see `.env.example`. `vite.config.ts` copies `.env` into `process.env` because Vite doesn't do that for server code.
- Route layout: `_app.tsx` (auth guard plus app shell) wraps `index`, `moments`, `insights`, `tags`, `settings` under `src/routes/_app/`. `_guest.tsx` wraps `sign-in`, `sign-up`, `forgot-password`. `reset-password.tsx` sits outside both so a signed-in user can still use an emailed link.
- Verified against the real dev server and the Neon dev branch with curl: unauthenticated redirect, sign-up (auto signs in), session, wrong password (401), sign-out, reset link (single use, old password stops working), and rate limits (sign-in locks after 3 tries, reset requests after 2 per minute). The sign-in, sign-up and reset forms have **not** been exercised in a browser, only the endpoints and server-rendered pages.
- Reset emails are sent without `await` (so timing doesn't reveal whether an account exists). On Netlify's serverless runtime that promise may be cut off after the response is sent, so before launch confirm the email actually arrives, and if not, use the platform's wait-until mechanism or await it.
- `pg` warns that `sslmode=require` will change meaning in a future release. Harmless today. If it becomes an error, change `sslmode=require` to `sslmode=verify-full` in the connection strings.
- `npm audit --omit=dev` reports 4 moderate findings, all one chain: `better-auth` depends on `drizzle-kit`, which pulls in an old `esbuild`. The advisory concerns esbuild's dev server, which neither runs. Do **not** run `npm audit fix --force`: it downgrades `drizzle-kit` to 0.18.1.
- Sessions last 30 days, password minimum 8 characters, built-in Better Auth rate limiting is stored in the database (`rate_limit` table).

**Step 3 (entries and tags)**
- Tables: `entries`, `tags`, `entry_tags` (`src/db/schema/journal.ts`). `entry_date` is a Postgres `date` read as a `"YYYY-MM-DD"` string, never a `Date`. Tags store `name` (first-used casing) and `name_key` (lower-case, unique per user).
- **RLS is only real because the app doesn't connect as the Neon owner.** `neondb_owner` has `BYPASSRLS`, so policies (and `FORCE`) do nothing for it. `scripts/create-app-role.mjs` creates a limited `app_user` role and rewrites `DATABASE_URL` in `.env` to use it; migration `0003` grants it table privileges. `DATABASE_URL_UNPOOLED` stays the owner and is used only by drizzle-kit. Anything that makes a new connection string (Netlify, a fresh Neon branch) must repeat this: run the script against that branch, migrate, and use the `app_user` pooled URL as `DATABASE_URL`.
- Data layer: `src/server/journal.ts` (server only; every call runs in a transaction that sets `app.user_id`, and every query also filters by `userId`). Server functions in `src/lib/journal.functions.ts`. This TanStack Start version names the input method `.validator(...)`, not `.inputValidator(...)`.
- Validation is shared by the form and the server (`src/lib/entry-schema.ts`, zod 4). The server accepts dates up to tomorrow-in-UTC because it doesn't know the person's time zone; the form enforces the exact "not in the future" rule in the browser.
- Routes under `src/routes/_app/`: `index` (first run shows the form; otherwise the 5 most recent), `moments/` (list, `new`, `$entryId/` detail, `$entryId/edit`), `tags`. Loaders must return an object (not a bare value), and `head` must not read `loaderData`: either one breaks the route's inferred types.
- Delete with undo (`src/lib/pending-deletes.ts`): the moment is hidden at once and really deleted when the 6-second toast closes. Closing the tab inside that window leaves the moment in place.
- Drafts autosave to `localStorage` under `gg:draft:<userId>` and are cleared on save or "Start over".
- shadcn gotchas: the CLI's `sonner` wraps `next-themes`; ours reads the `dark` class instead (`src/components/ui/sonner.tsx`). `shadcn add` stalls on an overwrite prompt if a dependency like `button.tsx` already exists; pipe `n` answers in.
- Password forms use `method="post"` so a submit before hydration can never put a password in the URL. `<html data-hydrated>` (set by `HydrationMarker`) lets tests wait until the page is interactive.
- Tested: 24 data-layer and RLS checks (two users: isolation, tag rules, updates, deletes, unscoped queries, cross-user inserts) and 2 Playwright flows (`npm run test:e2e`: sign up, validation, write with tags and Scripture, Ctrl+Enter, add an update, edit, future date, draft restore, tag rename/conflict/delete, delete with undo, real delete, and a second account unable to open the first's moment). The flows also assert no console errors or hydration warnings. Playwright runs against the dev server and the Neon dev branch, and its teardown deletes only `e2e+...@example.com` accounts. A cold first run can flake if the machine sleeps or Vite reloads mid-test; rerun.

**Step 4 (moments list)**
- Filters live in the URL (`/moments?q=&tag=&year=&page=`), validated in the route's `validateSearch`, so results can be bookmarked and Back works. Changing a filter resets to page 1. Page size is `PAGE_SIZE` (20) in `src/lib/entry-schema.ts`, kept out of `src/server/` so the route doesn't pull the database into the browser bundle.
- Search is Postgres full-text (`english` config, `websearch_to_tsquery`, so quotes, `or` and `-word` work) over title, body, Scripture and "how it turned out". Migration `0004` adds a GIN index on that expression; the query in `searchEntries` must repeat the expression exactly or the index goes unused. Tag text is not searched; use the tag filter. Stemming means "doctor" finds "doctors".
- Pagination is offset-based (Newer / Older). Fine at journal scale; revisit only if a person reaches tens of thousands of entries.
- The tag filter matches on `name_key`, and the year filter on `extract(year from entry_date)`. The year list only offers years that have entries.
- Tested in a third Playwright flow: seeds 23 moments straight into the dev DB as the owner, then checks paging, stemmed search, no-match message, and tag and year filters combined.

**Step 5 (insights and home)**
- Charts: `@tanstack/charts@1.2.0` (React adapter, `@tanstack/charts/react`), pinned exactly. Definitions are `defineChart(...)` inside `useMemo`; the definition's identity is the update boundary, so memoize against the data. Tooltips come from `{ use: tooltip, format }`; `point.datum` is typed from the data.
- Heat map (`src/components/heat-map.tsx`): a `cell` mark on two band scales (x = week start, y = weekday). The library takes one constant `fill` per mark, so there is one mark per level (0 to 4), each filled with `var(--heat-N)`; that is how the cells follow light and dark mode. Levels: 0, 1, 2, 3 and 4 or more moments in a day. Date math is in `src/lib/heat.ts` (UTC, weeks start Sunday).
- Month labels come from explicit tick values (only weeks that contain a 1st) with label thinning off; without that the library drops labels that look too close. Count axes use explicit whole-number tick values, otherwise `nice` produced repeats like 0, 1, 1, 2, 2.
- Bars use `fill: 'var(--primary)'`; the library's default palette is blue and clashes with the warm theme.
- **"Today" on Insights and the Home heat map is the server's UTC date**, because the loader runs on the server. Someone far from UTC may see the grid end a day early or late. "On this day" is different: it is fetched in the browser (`OnThisDay`) with the local date.
- Each chart has a "Show as a table" fallback with the exact values (tag rows link to the Moments list filtered by that tag). The heat map has a text summary only, no table.
- The full heat map is 53 weeks and scrolls sideways under 640px wide. Home shows 14 weeks, capped at 300px wide so cells stay close to square.
- The e2e suite now clears `rate_limit` before each sign-up; three sign-ups from one IP in a run otherwise trip the limiter.
- Tested: a fourth Playwright flow seeds moments (today, yesterday, a week ago, 40 days ago, one a year ago, tagged), checks the heat map paints, the table fallback, Home, and On this day, with no console errors.

**Step 6 (data ownership)**
- Export: `exportEntriesFn` returns every moment (oldest first, no ids) and the browser builds the file with `src/lib/export.ts` (`toJson`, `toMarkdown`) and downloads it as a Blob. Markdown lists newest first. Filenames are `gratitude-tracker-YYYY-MM-DD.<ext>`.
- Delete account: Better Auth `user.deleteUser` is enabled in `src/lib/auth.ts`; Settings calls `authClient.deleteUser({ password })` from a confirm dialog. Entries, tags and sessions go via the `onDelete: 'cascade'` foreign keys. Google-only accounts (once Google sign-in exists) have no password, so the dialog will need a different confirmation for them.
- Theme: Light, Dark, or Match device (removes `localStorage.theme`).
- App renamed from "Gratitude Graph" to "Moment Tracker" and then to "Gratitude Tracker" (UI copy, page titles, reset email, export filenames, `package.json`). The folder name and the `gg:draft:` localStorage prefix (kept so existing drafts survive) are unchanged.

**Step 7 (quality)**
- Unit tests: `npm test` runs Vitest through `vitest.config.ts`, a separate config so the TanStack Start and Netlify plugins don't load. Tests sit beside the code as `src/**/*.test.ts`. The data layer and RLS are tested through the Playwright flows and the earlier two-user script, not Vitest.
- The unit tests found a real bug: `normalizeTag` stripped a leading `#` before trimming, so `" #Peace "` kept its `#`. Fixed by trimming first.
- Deploy checklist: (1) create the Netlify site from the repo (`netlify.toml` already sets `vite build` and `dist/client`); (2) on the production Neon branch run `scripts/create-app-role.mjs`, then `drizzle-kit migrate`, and use the `app_user` pooled URL as `DATABASE_URL` (see step 3 notes); (3) set `DATABASE_URL`, `BETTER_AUTH_SECRET` (new, not the dev one), `BETTER_AUTH_URL` (the Netlify URL), `GMAIL_USER`, `GMAIL_APP_PASSWORD`; (4) turn on `requireEmailVerification` in `src/lib/auth.ts` once email works; (5) confirm a reset email actually arrives (see the step 2 note about the un-awaited send).
- Without Gmail credentials production throws on any email send, by design, so sign-up with verification and password reset will fail until step 3 of section 6 is done.

## 5. Open items to verify while building

- ~~**TanStack Charts version.**~~ Decided: `@tanstack/charts@1.2.0`, pinned exactly (no caret). Used in step 5.
- ~~**shadcn on Base UI.**~~ Confirmed in step 1: `base-nova` style generates components on `@base-ui/react`.
- ~~**Better Auth with TanStack Start.**~~ Confirmed and wired in step 2 (cookie plugin last, handler at `/api/auth/$`, `getSession` in `beforeLoad`).
- **Netlify adapter for TanStack Start.** Confirm the current setup.

## 6. Setup you will do yourself

I will walk through each when we reach it.

1. Create a Neon project (with a dev branch).
2. Create a Google OAuth client (consent screen and redirect URIs).
3. Create a dedicated Gmail account, turn on 2-step verification, and generate an app password.
4. Connect the repo to Netlify and set environment variables.
