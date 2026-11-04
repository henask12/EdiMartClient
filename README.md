# EdiMart Client

Next.js 15 (App Router, React 19, Tailwind 4) web app for Edi's Collection. It talks to
[EdiMartApi](../EdiMartApi) and never calls it directly from the browser.

## How it talks to the API

```
browser -> Next /api/auth/login   -> API /auth/login   (JWT stored in an httpOnly cookie)
browser -> Next /api/proxy/*      -> API /*            (cookie -> Authorization: Bearer)
```

- The cookie lifetime comes from the API (`SESSION_TTL_HOURS` there), so cookie and token agree.
- When the API answers **401** the proxy clears the cookie and the app sends the person to
  `/login?next=<page>`. A **403 `PASSWORD_CHANGE_REQUIRED`** sends them to *My account*.
- Seeded, admin-created and admin-reset accounts must choose a new password on first sign-in.
- Selling sends an `Idempotency-Key` per attempt (`lib/idempotency.ts`), so a retry after a dropped
  connection can never record the same sale twice.

## Run

```bash
npm install
cp .env.example .env.local      # API_INTERNAL_URL, NEXT_PUBLIC_API_URL
npm run dev                     # http://localhost:3000
npm run build && npm start
```

`next start` / Vercel refuse `localhost` / `127.0.0.1` as `API_INTERNAL_URL` on purpose (it catches
a forgotten environment variable on deploy). To test a production build against a local API use
another loopback address such as `http://127.0.0.2:4000`.

## Environment

| Variable | Purpose |
|---|---|
| `API_INTERNAL_URL` | Where the Next server reaches the API (server-side only). |
| `NEXT_PUBLIC_API_URL` | Public URL of the API, used for product image links. |
| `AUTH_COOKIE_NAME` | Name of the login cookie (default `edisims_access`). |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | Optional: public URL of the image bucket/CDN when the API uses S3 storage. |

See [CHANGELOG.md](CHANGELOG.md).
