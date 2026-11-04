# Changelog

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
