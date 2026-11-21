# MentorLagbe — Backend API

Express 5 + MongoDB API for the MentorLagbe tuition marketplace. It provides Better Auth email/password authentication with JWT/JWKS, role-based authorization, tuition and application workflows, Stripe Checkout payments and ImgBB image uploads.

Frontend: sibling repository `mentor-app` (Next.js 16).

## Live deployment

| Service | URL |
| --- | --- |
| API | <https://mentor-server-three.vercel.app> |
| Health check | <https://mentor-server-three.vercel.app/api/health> |
| Frontend | <https://mentor-app-snowy.vercel.app> |

## Highlights

- **Exactly four business collections**: `users`, `tuitions`, `applications`, `payments`
- **Better Auth** email/password + MongoDB adapter + JWT plugin (`/api/auth/*`)
- **Roles** `student | tutor | admin` and plans `free | pro`, always re-read from MongoDB
- **Middleware chain** `verifyToken` → `verifyStudent` / `verifyTutor` / `verifyAdmin`
- **Stripe Checkout** for Tutor Pro ($15) and Student Pro ($10), with signed webhooks, session verification and idempotent payment records
- **ImgBB** uploads for profile photos and tuition banners; the API key stays server-side
- **Zod** request validation, consistent JSON envelopes and centralized error handling
- **Idempotent seed** with demo tutors, students, tuitions, applications and payments

## Tech stack

| Area | Choice |
| --- | --- |
| Runtime | Node.js 20+ (ES modules) |
| Framework | Express 5 |
| Database | MongoDB (official driver, no ODM) |
| Auth | Better Auth + `@better-auth/mongo-adapter` + JWT/JWKS (`jose`) |
| Payments | Stripe Checkout + webhooks |
| Uploads | ImgBB via `multer` memory storage |
| Validation | Zod |

## Getting started

```bash
npm install
cp .env.example .env      # fill in MongoDB + secrets
npm run seed              # optional: demo data + admin account
npm run dev               # nodemon on http://localhost:5000
```

Health check:

```bash
curl http://localhost:5000/api/health
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | no (default `5000`) | HTTP port |
| `NODE_ENV` | no | `development` / `production` |
| `MONGODB_URI` | **yes** | MongoDB connection string |
| `DB_NAME` | no (default `mentorlagbe`) | Database name |
| `CLIENT_URL` | **yes** | Frontend origin used for CORS and Stripe redirects |
| `BETTER_AUTH_URL` | **yes** | Public API origin used by Better Auth and JWKS |
| `BETTER_AUTH_SECRET` | **yes** | Long random secret for signing |
| `JWT_ISSUER` / `JWT_AUDIENCE` | no | Default to `BETTER_AUTH_URL` |
| `STRIPE_SECRET_KEY` | for payments | Stripe secret key (`sk_test_…` / `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | for webhooks | Stripe endpoint signing secret (`whsec_…`) |
| `IMGBB_API_KEY` | for uploads | ImgBB API key |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | for seeding | Initial admin account |
| `DEMO_PASSWORD` | no | Password for seeded demo accounts |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never commit `.env`. Only `.env.example` is tracked.

## Scripts

```bash
npm run dev     # nodemon
npm start       # production server
npm run seed    # idempotent demo data (requires ADMIN_EMAIL + ADMIN_PASSWORD)
npm run health  # hit the local health endpoint
npm test        # Node test runner (unit tests)
```

## Data model

### `users`
Better Auth fields plus `role` (`student|tutor|admin`), `plan` (`free|pro`), `phone`, `bio`, `image`, timestamps. Indexed by unique `email`, `role` and `plan`.

### `tuitions`
`title`, `subject`, `classLevel`, `mode` (`Online|Offline`), `location`, `monthlyFee`, `daysPerWeek`, `bannerImage`, `description`, `tutorId`, `tutorName`, `tutorEmail`, `approvalStatus` (`pending|approved|rejected`), `isActive`, `createdAt`, `updatedAt`.

### `applications`
`tuitionId`, tuition snapshot fields, `studentId`, `studentName`, `studentEmail`, `phone`, `preferredSchedule`, `studentNote`, `status` (`pending|accepted|rejected`), `appliedAt`. A unique compound index on `{ tuitionId, studentEmail }` prevents duplicates.

### `payments`
`userId`, `userEmail`, `userName`, `userRole`, `planName`, `amount`, `currency`, `stripeSessionId` (unique), `transactionId`, `paymentStatus` (`pending|paid|failed`), `paidAt`. `userId` is present on new records; older records may only have `userEmail`.

## Authentication and authorization

1. The browser signs in through Better Auth at `/api/auth/sign-in/email`, which sets an HTTP-only session cookie.
2. The frontend requests a short-lived JWT from `/api/auth/token` and sends it as `Authorization: Bearer <jwt>`.
3. `verifyToken` verifies the JWT against the Better Auth JWKS (signature, issuer, audience). If that fails, it falls back to the Better Auth cookie session.
4. The user document is re-read from MongoDB on every request. Roles and plans from the token or request body are **never trusted**.
5. `verifyStudent`, `verifyTutor` and `verifyAdmin` return `403` for the wrong role.
6. Admin sign-up is blocked; the admin account is created by the seed script only.
7. Google OAuth calls back to `<BETTER_AUTH_URL>/api/auth/callback/google`, then redirects to the absolute frontend `callbackURL` (normally `<CLIENT_URL>/dashboard`). Relative callback URLs are resolved against the API origin, so the frontend must always send absolute frontend URLs. `/dashboard` then applies role-based routing.

## API reference

All routes are prefixed with `/api`. Responses use `{ success, data, meta? }` or `{ success: false, message, details? }`.

### Public
| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Database ping + uptime |
| GET | `/stats/public` | Landing page counters |
| GET | `/tuitions` | Approved tuitions: search, filters, pagination |
| GET | `/tuitions/filters` | Available subjects/class levels/modes |
| GET | `/tuitions/:id` | Single approved tuition |

### Auth (Better Auth)
| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/sign-up/email` | Register student/tutor (admin rejected) |
| POST | `/auth/sign-in/email` | Sign in, sets session cookie |
| POST | `/auth/sign-out` | Sign out |
| GET | `/auth/get-session` | Current session |
| GET | `/auth/token` | Short-lived JWT |
| GET | `/auth/jwks` | Public keys for JWT verification |

### Profile
| Method | Path | Description |
| --- | --- | --- |
| GET | `/profile/me` | Current user |
| PATCH | `/profile/me` | Update name, phone, bio, image |

### Student
| Method | Path | Description |
| --- | --- | --- |
| POST | `/student/applications` | Apply to a tuition |
| GET | `/student/applications` | My applications |
| DELETE | `/student/applications/:id` | Withdraw a pending application |
| GET | `/student/stats` | Student dashboard metrics |

### Tutor
| Method | Path | Description |
| --- | --- | --- |
| POST | `/tutor/tuitions` | Create a tuition (Free plan: max 2) |
| GET | `/tutor/tuitions` | My tuitions |
| GET | `/tutor/tuitions/:id` | My tuition detail |
| PATCH | `/tutor/tuitions/:id` | Update my tuition |
| PATCH | `/tutor/tuitions/:id/status` | Open/close a listing |
| DELETE | `/tutor/tuitions/:id` | Delete my tuition |
| GET | `/tutor/applications` | Applicants across my tuitions |
| PATCH | `/tutor/applications/:id` | Accept or reject an applicant |
| GET | `/tutor/stats` | Tutor dashboard metrics |

### Admin
| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/stats` | Platform metrics and revenue |
| GET | `/admin/users` | Paginated users with search/role filter |
| PATCH | `/admin/users/:id/role` | Change a user role |
| GET | `/admin/tuitions` | All tuitions with moderation filter |
| PATCH | `/admin/tuitions/:id/approval` | Approve or reject |
| GET | `/admin/transactions` | Payment history and totals |

### Payments
| Method | Path | Description |
| --- | --- | --- |
| POST | `/payments/checkout` | Create a Stripe Checkout session |
| GET | `/payments/verify-session?session_id=…` | Verify and fulfill a session |
| GET | `/payments/mine` | My payments |
| GET | `/payments/status` | Current plan |
| POST | `/payments/webhook` | Stripe webhook (raw body, signed) |

### Uploads
| Method | Path | Description |
| --- | --- | --- |
| POST | `/uploads/image` | Multipart `image` upload to ImgBB (max 5 MB) |

## Payments flow

1. `POST /api/payments/checkout` requires an authenticated student or tutor and validates the plan for that role.
2. The server creates a Stripe Checkout session with `client_reference_id` and metadata (`userEmail`, `planName`), then returns the hosted URL.
3. Stripe redirects to `CLIENT_URL/payment/success?session_id=…`.
4. The success page calls `GET /api/payments/verify-session`, which retrieves the session from Stripe, verifies payment status and upgrades the user exactly once.
5. `POST /api/payments/webhook` independently verifies the signature with `STRIPE_WEBHOOK_SECRET` and applies the same idempotent fulfillment, so upgrades are not lost if the browser closes early.
6. A unique index on `stripeSessionId` guarantees a session can only produce one payment record.

Without Stripe keys, checkout returns `503` with a clear message; no fake payments are created.

## Image uploads

`POST /api/uploads/image` accepts a single `image` field (JPG/PNG/WebP/GIF, max 5 MB). The server uploads the buffer to ImgBB using `IMGBB_API_KEY` and returns `{ url, displayUrl, deleteUrl }`. Without a key the route returns `503`.

## Seed data

```bash
ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="<strong-unique-password>" npm run seed
```

Creates (idempotently):

- Admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (both are required; there is no default admin password)
- Demo tutors and students (password `DEMO_PASSWORD`, default `Password123!`)
- 12 approved tuitions plus 3 moderation examples
- 12 applications and 3 payments

Demo logins:

| Role | Email | Password |
| --- | --- | --- |
| Tutor | `tutor@mentorlagbe.com` | `DEMO_PASSWORD` |
| Student | `student@mentorlagbe.com` | `DEMO_PASSWORD` |

The real admin password is never published. Generate a unique password and
rotate `ADMIN_PASSWORD` / `DEMO_PASSWORD` before deploying anywhere public.
The seed script refuses to run without `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Security notes

- Helmet-like hardening is not included; put the API behind a reverse proxy with TLS.
- CORS is restricted to `CLIENT_URL`, `BETTER_AUTH_URL` and localhost (development only). Rejected origins receive `403`.
- JSON bodies are limited to 2 MB; uploads to 5 MB.
- All database queries that accept IDs require the canonical 24-hex ObjectId form.
- Role changes cannot be made through Better Auth's `POST /api/auth/update-user`; only the admin role endpoint can promote or demote users.
- Image URLs are restricted to the hosts allowed by the frontend (`i.ibb.co`, `ibb.co`, `images.unsplash.com`, `lh3.googleusercontent.com`).
- Error responses never expose stack traces in production.
- Stripe webhooks are verified with the raw request body before JSON parsing.
- Payment fulfilment is idempotent and re-applies the Pro upgrade if a previous attempt stored the payment but failed to update the user.

## Deployment

1. Provision MongoDB Atlas and set `MONGODB_URI` / `DB_NAME`.
2. Deploy to Render, Railway, Fly.io or similar with `npm start`.
3. Set `CLIENT_URL` to the deployed frontend origin and `BETTER_AUTH_URL` to the deployed API origin.
4. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `IMGBB_API_KEY`.
5. Register the Stripe webhook endpoint `https://<api>/api/payments/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
6. Run `npm run seed` once with a unique `ADMIN_EMAIL` / `ADMIN_PASSWORD` (or create the admin manually) and verify `GET /api/health`.
7. Add the Google OAuth redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google` in Google Cloud Console.

## Known limitations

- Stripe and ImgBB integrations require real credentials for end-to-end use. Stripe can be tested with test-mode keys and signed test webhooks; no live charge is required.
- No transactional email provider, so email verification and password reset emails are not enabled.
- Automated tests cover HTTP helpers, validation, auth role guards, OAuth origin configuration and pricing (`npm test`, 28 tests). Full API/browser workflows are verified with local integration smoke tests plus frontend lint/build.
