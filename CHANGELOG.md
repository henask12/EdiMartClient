# Changelog

## Phase 2 - design system

### Added
- **Semantic token system.** `globals.css` registers colour tokens (`bg`, `surface`, `primary`,
  `accent`, `text`, `border`, etc.) via Tailwind 4 `@theme`. A `.dark` class flips every token;
  `next-themes` handles the switching (attribute="class", defaultTheme="dark").
- **Light and dark themes.** Primary: deep teal `#0F6B5F`; accent: saffron `#D9922E`; warm
  neutrals. Users cycle dark → light → system from the top-bar icon.
- **i18n with `next-intl`.** All shell chrome and the most-used pages are translated (English
  complete, Amharic for shell/POS/common actions). Locale stored in `User.locale` on the API and
  a `NEXT_LOCALE` cookie; no locale prefix in URLs.
- **Fonts.** Inter (Latin) and Noto Sans Ethiopic (Amharic) loaded via `next/font/google`.
- **App shell.** Collapsible sidebar (240 → 72 px) with grouped navigation, permission-filtered
  links, and tooltips when collapsed. Mobile: hamburger → sheet overlay + fixed bottom tab bar
  (Dashboard, Sell, Scan placeholder, Products, More). Top bar: command-palette trigger (`⌘K`),
  theme toggle, language toggle, user avatar, logout.
- **Command palette** (cmdk + Radix Dialog). `Ctrl+K / ⌘K` opens a searchable list of all
  permission-visible pages grouped by category.
- **Component library** (all `components/ui/`): `Button` (cva, 6 variants × 7 sizes, `asChild`),
  `Input`, `Select`, `Badge`, `Card` + `StatCard`, `Dialog`, `Sheet`, `Skeleton`/`SkeletonCard`,
  `EmptyState`, `Kbd`, `Tooltip`, `IconButton`, `PageHeader`, `ActionGroup`.
- **`formatMoney()`** — single money formatter (`lib/format-money.ts`): handles `string | number
  | null`, outputs `Br 1,250.00` with non-breaking space. `formatBirr` re-exports for backward
  compatibility.
- **Date helpers** (`lib/date-helpers.ts`): `formatDate`, `formatDateShort`, `toDateInput`,
  `formatEthiopianDate` (Ge'ez calendar via `Intl.DateTimeFormat`, feature-detected).
- **`cn()` upgraded** from simple filter+join to `clsx` + `tailwind-merge`.
- **`/design` page** — owner-only component showcase showing every token, component variant,
  formatter, and loading state.
- **TanStack Query** provider (`QueryProvider.tsx`, staleTime 30 s, retry 1) — wired in layout
  but not yet used by pages (ready for Phase 3 data-fetching refactor).

### Changed
- **Every page and component** migrated from hardcoded Tailwind colours (`text-white/50`,
  `bg-black/30`, `border-white/10`, `text-[var(--accent)]`, etc.) to semantic tokens
  (`text-text-muted`, `bg-surface-muted`, `border-border`, `text-accent`, etc.).
- All `formatBirr` / `format-price` imports replaced with `formatMoney` / `format-money`.
- Old CSS utility classes (`section-card`, `card-surface`, `btn-primary`) removed; pages use
  `Card` component or inline token classes instead.
- `ConfirmDialog` rewritten on Radix Dialog. Hand-rolled modal wrappers in modals replaced with
  semantic token classes (old `rounded-[var(--radius-lg)]` → `rounded-xl`, etc.).
- Products / new and / edit pages: raw `<input>` elements replaced with `Input` component.
- Product types page: fully rewritten with `Input`, `IconButton`, `ActionGroup`.
- Settings / account: fully rewritten with `Card`, `Input`, `Button`, translations.
- Settings / emails: rewritten with `PageHeader`, `Input`, `Button`.

### API (additive)
- `User.locale` column (`ALTER TABLE "User" ADD COLUMN "locale" TEXT`).
- `PATCH /auth/me` accepts `locale` field; `GET /auth/me` returns `locale`.
- JWT payload includes `locale`.

### New dependencies (client)
- `next-intl` — i18n without locale-prefix routing
- `next-themes` — dark / light / system theme switching
- `@tanstack/react-query` — data-fetching cache (wired, not yet used)
- `cmdk` — command palette
- `@radix-ui/react-dialog` — Dialog + Sheet
- `@radix-ui/react-tooltip` — Tooltip
- `@radix-ui/react-slot` — `asChild` pattern in Button
- `class-variance-authority` — type-safe component variants
- `clsx` + `tailwind-merge` — utility for merging Tailwind classes
- `lucide-react` — icons (tree-shaken)

### Known gaps
- Ethiopian calendar display requires a browser that supports `Intl` with `calendar: 'ethiopic'`.
- Amharic translations are machine-generated; a native speaker review is recommended.
- No automated client tests yet (Playwright setup deferred to Phase 3 since no behaviour changed).
- Brand logo image does not load locally (pre-existing; not investigated).

## Phase 1 - one permission model

### Added
- `usePermission()` (`can`, `canAny`, `meets`, `canSeeCost`): one place answers "can this person do X?",
  fed by `/auth/me` through the app shell.
- **"You don't have access to this"** page, naming the permission that is missing, instead of a blank or
  broken page. Navigation links and page access come from one table (`ROUTE_REQUIREMENTS` in
  `lib/permissions.ts`), so a link shows exactly when its page would open. A 403 from any call shows a
  clear message.
- **Roles screen is a permission matrix**: permissions grouped by area with a one-line description,
  one column per role, "Sensitive" flags, a warning when switching sensitive ones on, and a Save bar.
  The owner column is locked.
- **Approval PIN** form on My account (set, change, remove).
- Dashboard start page for roles without report access.

### Changed
- **Cost and profit are hidden** when the API does not send them: sales ledger and period details,
  dashboard, product forms (cost field and what is sent), Stocks page cost column.
- Selling needs "Record sales" (not "Sell products"); adding stock needs "Receive stock". Edit and
  History buttons on the Stocks page show only for people who may use them.
- The web proxy forwards `X-Approval-Token` and supports `PUT`.
- Sales page loads its filter lists only for people who can view products.

### Removed
- The old per-role permission editor (replaced by the matrix) and the per-page `/auth/me` fetches.

## Phase 0 - correct and safe

### Fixed
- **Build.** `next build` failed on Tailwind 4.3 (`@apply` of the plain classes `focus-ring` and
  `card-surface` in `globals.css`). The two compositions are now spelled out; styling is unchanged.
  The latest commit before this phase did not build on a clean install.
- **Login form** no longer pre-fills the owner e-mail and password.
- **Sessions.** The cookie lifetime now comes from the API (`expiresInSeconds`), not a separate
  12 h constant. When the API answers 401 the proxy clears the cookie and the app goes to
  `/login?next=...`; a 403 `PASSWORD_CHANGE_REQUIRED` goes to the account page.
- **Forced password change** after the first sign-in of seeded / admin-created accounts.
- **Double-selling on retry.** Sell flows send an `Idempotency-Key`. After a dropped connection
  the same key is kept, so pressing the button again cannot sell twice; after a definite refusal
  (e.g. not enough stock) a new key is used.
- The API proxy forwards `Idempotency-Key` and answers 502 JSON when the API is unreachable.

### Added
- Payment method (cash, Telebirr, CBE Birr, M-Pesa, bank transfer, card) and optional transaction
  ID on both sell flows; the sales ledger shows how each sale was paid.
- Optional `NEXT_PUBLIC_IMAGE_BASE_URL` for product photos served from an S3-compatible bucket.
- Sales ledger "Payment" column.

### Known gaps
- No automated client tests yet (Playwright arrives with the design-system phase).
- Brand logo image does not load locally (pre-existing; not investigated).
