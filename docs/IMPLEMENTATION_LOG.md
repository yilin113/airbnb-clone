# Implementation log

## 2026-09-16 — Phase 0A: API validation baseline

### Scope

- Added Zod as a direct runtime dependency.
- Added reusable JSON parsing and structured API error helpers.
- Added server-side schemas for registration, listing creation, and reservation
  creation.
- Normalized registration email/name input and enforced password length.
- Prevented the registration response from selecting or returning the password
  hash.
- Added explicit duplicate-email and safe internal-error responses.
- Replaced opaque authentication errors on listing/reservation creation with a
  stable `401 UNAUTHORIZED` JSON response.
- Added `.env.example` with the current database, auth, OAuth, and Cloudinary
  variables.

### Verification

- `pnpm test`: 28 files, 228 tests passed.
- `pnpm test:coverage`: 100% statements, branches, functions, and lines.
- `pnpm lint`: passed with the pre-existing React Compiler warning in
  `RentModal.tsx`; zero errors.
- `pnpm typecheck`: passed.

### Deliberately deferred to Phase 1

- Reservation totals are still accepted from the client.
- Minimum 30-night stays are not yet enforced.
- Reservation overlap/concurrency protection is not yet implemented.
- The current reservation still confirms immediately instead of entering a
  host-approval request state.

## 2026-09-16 — Phase 1A: reservation integrity and server-owned pricing

### Scope

- Reinterpreted the existing listing `price` as monthly base rent in JPY and
  added monthly utilities, monthly management, one-time cleaning, and deposit
  fields.
- Added deterministic 30-day proration and reservation price snapshots for
  rent, utilities, management, cleaning, deposit, guest service fee, host
  commission, guest total, and host payout.
- Moved all authoritative price calculations to the server. Client-provided
  totals are ignored.
- Added configurable guest and host fee rates (6% defaults) plus a configurable
  guest-fee cap (JPY 30,000 default). Deposits are excluded from both fees.
- Enforced a minimum stay of 30 nights at the API boundary.
- Normalized selected calendar dates as date-only UTC values so Taiwan/Japan
  timezone conversion cannot move a booking to the previous day.
- Replaced the incomplete availability filter with the canonical overlap rule:
  existing start is before requested end and existing end is after requested
  start. Checkout dates remain reusable.
- Added a per-listing, per-day unique availability lock. Reservation creation,
  snapshot creation, and day-lock insertion happen in one database transaction,
  preventing simultaneous requests from double-booking the same night.
- New reservations now start in `PENDING` status, laying the foundation for
  host approval. Pending and approved requests both block availability.
- Updated listing cards and the reservation panel to label JPY monthly rent,
  calculate the preview with the same pricing formula, and submit only dates
  plus the listing ID.

### Database rollout requirement

- Run `prisma db push` against the MVP MongoDB database before exercising the
  new flow so the `AvailabilityDay` unique index is created.
- MongoDB transactions require Atlas or another replica-set deployment; a
  standalone local MongoDB server is not sufficient for atomic booking locks.

### Verification

- `pnpm test`: 29 files, 239 tests passed.
- `pnpm test:coverage`: 100% statements, branches, functions, and lines.
- `pnpm lint`: zero errors; the pre-existing React Compiler warning in
  `RentModal.tsx` remains.
- `pnpm typecheck`: passed.

### Deliberately deferred to Phase 1B

- Host approve/decline endpoints and dashboards.
- Host form controls for utilities, management, cleaning, and deposit amounts.
- Full Traditional Chinese product copy and Japan prefecture/city/station data.
- Formal payment collection and deposit settlement.
