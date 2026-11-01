# Gratitude Graph: Plan

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
- [ ] **2. Database and auth.** Drizzle schema and migrations on the Neon dev branch. Better Auth with email and password, Google sign-in, email verification, password reset. `sendEmail()` with console logging in dev and Gmail SMTP in production. Rate limits.
- [ ] **3. Entries and tags.** Create, edit, delete (with confirm and undo). Tag chips and the Tags screen. Draft autosave. Entry detail with "how it turned out". Data layer scoped by `userId`, plus RLS.
- [ ] **4. Moments list.** Pagination, full-text search, tag and year filters.
- [ ] **5. Insights and Home.** Heat map (full and compact), tag breakdown, monthly counts, "On this day".
- [ ] **6. Data ownership.** JSON and Markdown export. Delete account.
- [ ] **7. Quality.** Vitest and Playwright. Pre-production pass (accessibility, mobile, empty and error states, dark mode, metadata). Netlify deploy.

---

## 4a. Build notes

Things learned while building that are not obvious from the code.

**Step 1 (scaffold)**
- Scaffolded with `npx @tanstack/cli@latest create` (React, Netlify adapter, ESLint and Prettier, no examples, no git repo). The CLI's own `shadcn` add-on uses Radix, so it was skipped.
- shadcn/ui on Base UI: `shadcn init` stalls on a TypeScript prompt in a non-interactive shell, so `components.json` was written by hand (style `base-nova`, aliases under `@/`) and components are added with `npx shadcn@latest add <name>`. The CLI left gaps that were fixed by hand: dependencies (`@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`), `src/lib/utils.ts` (`cn`), and a bad `from "cn"` import in `button.tsx`. Check this on every `shadcn add`.
- **Netlify dev emulation is disabled.** `vite.config.ts` loads the Netlify plugin only for `vite build`. In dev, the plugin starts a Deno edge-functions server that crashes the whole dev server on this machine (`unexpected argument '--allow-scripts'`). The app uses no edge functions. The production build still writes the Netlify function.
- Tokens live in `src/styles.css` (shadcn variable names plus `--heat-0..4`). Dark mode is a `.dark` class set by an inline script in `__root.tsx` before first paint, from `localStorage.theme` or the system preference. There is no theme toggle yet (Settings, step 6).
- Fonts are self-hosted via Fontsource: Inter Variable (UI) and Newsreader Variable with optical size (entry text, `.prose-entry`).
- The app shell (`src/components/app-shell.tsx`) is a left rail on desktop and a bottom tab bar on mobile. Mobile omits Tags from the tab bar, and Settings links to it.
- `routeTree.gen.ts` is generated: after adding a route file, run `npm run build` (or the dev server) before typechecking.
- `npm audit` reports 33 findings, all in dev-time tooling under the Netlify plugin. `npm audit --omit=dev` reports 0.
- Routes exist only as placeholders with empty-state copy. There is no auth guard yet (step 2).

## 5. Open items to verify while building

- **TanStack Charts version.** Sources conflicted: the v1 docs list 1.1.0 as the latest, GitHub releases showed 0.14.0 (called pre-alpha), and InfoQ described it as Alpha. Check `@tanstack/charts` on npm at install time. Use it only if it is a stable 1.x. Otherwise use hand-built bars.
  - https://tanstack.com/charts/v1/docs
  - https://tanstack.com/charts/v0/docs
  - https://github.com/TanStack/charts/releases
  - https://www.infoq.com/news/2026/09/tanstack-charts-alpha-introduced/
- ~~**shadcn on Base UI.**~~ Confirmed in step 1: `base-nova` style generates components on `@base-ui/react`.
- **Better Auth with TanStack Start.** Confirm the current integration docs before wiring.
- **Netlify adapter for TanStack Start.** Confirm the current setup.

## 6. Setup you will do yourself

I will walk through each when we reach it.

1. Create a Neon project (with a dev branch).
2. Create a Google OAuth client (consent screen and redirect URIs).
3. Create a dedicated Gmail account, turn on 2-step verification, and generate an app password.
4. Connect the repo to Netlify and set environment variables.
