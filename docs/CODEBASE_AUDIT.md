# Codebase audit: Japan mid-term stay MVP

Date: 2026-09-16  
Audited upstream: `wrujel/airbnb-clone` at `d0bc2afd707c115eecd32d4df1032959eef96b0d`  
Working branch: `feat/japan-midterm-mvp`

## Decision

Use `wrujel/airbnb-clone` as the starting point, subject to the Phase 0 and
Phase 1 hardening work below.

It is the strongest reviewed candidate because it is a real full-stack
application rather than a UI demo, has an explicit MIT license, uses a current
TypeScript/Next.js stack, and already includes authentication, listing CRUD,
search filters, a date-range calendar, reservations, favorites, host-facing
reservation/property pages, guest trips, image upload, maps, tests, linting,
type checking, and CI.

This is a useful MVP base, not a production-ready booking engine. The current
reservation endpoint trusts client-supplied totals and does not enforce date
availability atomically on the server. Those defects must be fixed before any
real booking traffic or payments.

## Candidate review

| Candidate | Result | Technical/licensing reason |
| --- | --- | --- |
| `wrujel/airbnb-clone` | Selected | Next.js 16, TypeScript, Prisma, MongoDB, NextAuth, listing and reservation flows, Vitest suite, CI, explicit MIT license |
| `koolkishan/nextjs-airbnb-clone` | Rejected | Mixed JavaScript/TypeScript monorepo, core work last changed in 2023, frontend TypeScript was removed, no root license file; larger modernization and licensing risk |
| `mohamedhosni98/stay-booking-platform` | Rejected | Modern Next.js/TypeScript UI, but no auth, database, server booking engine, host workflow, or license file |
| `VadimNotJustDev/AirbnbClone` | Rejected for web MVP | React Native/mobile course project rather than the requested web-first Next.js base |
| `benawad/fullstack-graphql-airbnb-clone` | Rejected | Historically useful full-stack example, but its GraphQL/Prisma-era stack is too old for the preferred modern Next.js path |

## Existing architecture

- Framework: Next.js App Router with a legacy Pages API route for NextAuth.
- Language/UI: TypeScript, React, Tailwind CSS.
- Authentication: NextAuth v4, JWT sessions, Google, GitHub, and credentials.
- Database: MongoDB through Prisma.
- Domain models: `User`, `Account`, `Listing`, and `Reservation`.
- Listing flow: authenticated creation and owner deletion; one Cloudinary image.
- Discovery: country, date, guest, room, bathroom, and category filters; Leaflet map.
- Booking flow: guest creates a reservation immediately; guest or host can cancel.
- Host surfaces: `properties` and `reservations` pages.
- Guest surfaces: `trips` and `favorites` pages.
- Quality tooling: ESLint, TypeScript typecheck, Vitest, coverage thresholds, and GitHub Actions.
- Payments/admin/reviews/messaging: not implemented.

## Reusable parts

- Authentication shell and user ownership checks.
- Listing cards, detail page, creation modal, maps, image upload, and favorites.
- Search-modal structure and date-range calendar components.
- Guest trips plus host property/reservation views.
- Prisma access layer and serialization helpers.
- Unit-test helpers, route tests, component tests, and CI structure.

## Critical findings

### P0: booking integrity and price authority

1. `POST /api/reservations` accepts `totalPrice` from the browser. A caller can
   submit an arbitrary price. The server must calculate every amount from the
   persisted listing and fee configuration.
2. Reservation creation performs no server-side overlap check. Disabling dates
   in the browser is not a concurrency control.
3. The listing availability query only detects ranges whose start or end is
   inside an existing reservation. It misses an existing reservation that is
   fully contained within the requested range. The canonical overlap test is
   `existing.startDate < requested.endDate && existing.endDate > requested.startDate`.
4. MongoDB/Prisma cannot express a simple exclusion constraint for date ranges.
   The MVP needs a documented concurrency strategy (transaction with an
   availability/hold record or another atomic lock). A read-then-create pair
   alone is still race-prone.
5. There is no minimum-stay validation and no booking-request state machine;
   reservations are created as confirmed immediately.

### P0: input and authorization hardening

1. Registration and listing routes do not use a validation schema. Normalize
   email, validate password policy and field lengths, reject malformed numbers,
   and return structured 4xx responses.
2. The registration endpoint returns the created Prisma user record. Explicitly
   select safe fields so the password hash can never be serialized.
3. Listing creation must validate that the property is in Japan and validate all
   new location/fee fields on the server.
4. The Cloudinary upload preset is hard-coded and client-side. Replace it with
   environment-backed, restricted upload configuration and persist asset IDs so
   deleted/rejected listings can clean up their media.

### P1: domain-model gaps

The current schema cannot represent the product requirements. It needs:

- structured Japan location: prefecture, municipality/city, neighborhood,
  station, railway line, walking minutes, latitude/longitude, and a private
  address separated from public search data;
- monthly rent and separately modeled utilities, management, cleaning, and
  deposit amounts, all in JPY minor units;
- configurable guest fee percentage, guest fee cap, and host commission;
- an immutable price quote/snapshot on each request;
- `BookingRequest` status transitions such as `PENDING`, `APPROVED`, `REJECTED`,
  `EXPIRED`, `CANCELLED`, and later `PAYMENT_PENDING`/`CONFIRMED`;
- availability/hold timestamps and auditable status-change metadata;
- listing lifecycle (`DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `SUSPENDED`);
- host/guest profile fields and roles; do not store passport images in the base
  user model.

### P1: product and operations gaps

- English and worldwide-country assumptions are embedded throughout the UI;
  `lang="en"`, dollar labels, and country selection must become Traditional
  Chinese, JPY, and Japan-only location data.
- Pricing is nightly (`dayCount * listing.price`) and must be replaced with one
  shared quote engine used by both server and UI.
- The host pages are lists, not a real dashboard or approval queue.
- There is no admin moderation, audit log, notification mechanism, or support
  workflow.
- There are no database-backed integration tests; current route tests mock
  Prisma, so concurrency and real query semantics are unverified.
- The build intentionally needs a live database during prerendering. Phase 0
  should make build validation deterministic without production credentials.

## Recommended target architecture for the MVP

Keep the Next.js application and most UI components, but treat pricing and
booking as server-owned domain modules rather than component calculations.

- `domain/stays`: date normalization, 30-night minimum, and overlap rules.
- `domain/pricing`: monthly proration policy, itemized fees, guest cap, host
  commission, rounding, and immutable quote output.
- `domain/booking-requests`: allowed status transitions and authorization.
- route handlers/server actions: validate input, call domain services, and map
  domain errors to stable API responses.
- persistence: store money as integer JPY amounts and snapshot every component
  used to form a quote.

For a production marketplace, PostgreSQL would provide stronger relational
constraints and better booking/reporting ergonomics. To keep the first MVP
small, MongoDB can be retained through Phase 2 only if an atomic hold strategy
and integration tests prove that concurrent overlapping requests cannot both
succeed. Otherwise migrate before payment integration.

## Delivery phases

### Phase 0 — reproducible baseline and safety rails

- Add `.env.example`, deterministic build behavior, seed/demo fixtures, and a
  local database setup.
- Add request validation and consistent error responses to existing write APIs.
- Run and record `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- Add integration-test infrastructure for the real database.

Exit: a clean baseline can be installed and verified by a new developer.

### Phase 1 — stay rules and server-owned pricing

- Implement the 30-night minimum and canonical overlap rule.
- Add monthly rent plus utilities, management, cleaning, and deposit.
- Add configurable 6% guest fee with optional cap and configurable 6% host fee.
- Calculate totals only on the server and persist an immutable quote snapshot.
- Add concurrency-safe availability/hold behavior and tests.

Exit: price tampering and overlapping accepted stays are impossible in tests.

### Phase 2 — Japan listing model and host publishing

- Add prefecture, city, station, railway line, walking time, Japan coordinates,
  furnished/Wi-Fi/utility attributes, and private address fields.
- Replace country data with maintained Japan location data.
- Add draft/review/publish listing states, multi-image support, and host edit.

Exit: a host can create and publish a testable Japan monthly-rental listing.

### Phase 3 — booking requests and host approval

- Replace instant reservation creation with a booking-request workflow.
- Add host approve/reject, expiration, cancellation, and audit history.
- Reserve dates only according to documented pending/approved hold rules.
- Add in-app/email notification adapters without payment processing.

Exit: the full request-to-approval lifecycle works without money movement.

### Phase 4 — Traditional Chinese guest MVP

- Make `zh-TW` the default locale and replace hard-coded English strings.
- Add Japan-focused search by prefecture/city/station and 30–180 day UX.
- Show JPY itemization, guest fee cap behavior, and clear deposit semantics.
- Complete guest application/profile fields and mobile accessibility pass.

Exit: a Taiwanese guest can discover a listing and submit a valid request.

### Phase 5 — operations/admin and pilot readiness

- Add admin review for hosts/listings/booking requests, support notes, and logs.
- Add privacy/retention boundaries for identity documents and personal data.
- Add rate limits, observability, backups, and deployment runbooks.
- Pilot with demo/no-payment settlement instructions only.

Exit: staff can safely operate a small closed beta.

### Later — payments

Only after the no-payment funnel is validated, design payment collection,
refunds, deposits, host payouts, tax/invoice handling, and marketplace KYC with
Japanese and Taiwanese legal/accounting advice.

## Verification record

Static inspection completed for schema, authentication, listing/reservation
routes, availability query, pricing UI, image upload, tests, package scripts,
and CI configuration.

The repository declares:

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

Baseline verification completed after enabling Node's Windows system CA support
for the install command; SSL verification remained enabled:

- `pnpm test`: passed, 28 files and 222 tests.
- `pnpm lint`: passed with one existing React Compiler compatibility warning in
  `RentModal.tsx` (`react-hook-form`'s `watch` API); zero errors.
- `pnpm typecheck`: passed.

`pnpm build` was not treated as a baseline gate because the upstream workflow
documents that authenticated routes are prerendered against a live Prisma
database. Phase 0 will make build validation deterministic and add a safe local
database setup before build is required.

## Commercial-use note

The code is MIT licensed and therefore permits commercial modification and
distribution as long as the copyright and license notice are retained. This
does not grant rights to Airbnb trademarks, branding, copied content, or third-
party assets. Rebrand the product and review the licenses/terms of every service
and dataset (Cloudinary, maps/tiles, OAuth providers, and Japan location data)
before launch. This is an engineering review, not legal advice.
