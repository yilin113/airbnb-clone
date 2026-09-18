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

## 2026-09-16 — Phase 1B: host decisions and listing fee inputs

### Scope

- Added host form inputs and API validation for monthly utilities, monthly
  management, one-time cleaning, and refundable deposit amounts.
- Added host-only approve and decline transitions for pending booking requests.
- Protected decisions with a conditional pending-state update so two concurrent
  decisions cannot both succeed.
- Kept availability locks when a request is approved and released them in the
  same transaction when a request is declined.
- Reworked guest/host cancellation to verify ownership and remove availability
  locks atomically before deleting the reservation.
- Restricted listing calendar queries to pending and approved reservations, so
  declined requests no longer block dates.
- Added request status display and approve/decline controls to the host
  reservations page.

### Verification

- `pnpm test`: 29 files, 253 tests passed.
- `pnpm test:coverage`: 100% statements, branches, functions, and lines.
- `pnpm lint`: zero errors; the pre-existing React Compiler warning in
  `RentModal.tsx` remains.
- `pnpm typecheck`: passed.

### Deliberately deferred to Phase 2

- Traditional Chinese interface copy and status labels.
- Japan-only prefecture, city, and station location model.
- Email or in-app notifications for booking decisions.
- Payment collection and deposit settlement.

## 2026-09-17 — Phase 2A: Japan locations and Traditional Chinese UI

### Scope

- Replaced the worldwide country picker with an MVP catalogue of 12 major
  Japanese stations across Tokyo, Osaka, Kyoto, Fukuoka, Sapporo, Nagoya,
  Yokohama, and Kobe.
- Added stable prefecture, city, and station codes to listings while retaining a
  composite location value for search compatibility.
- Added server-side catalogue validation so clients cannot submit unsupported
  countries or mismatched Japanese location codes.
- Changed the default map view from Peru/worldwide to Japan and increased the
  selected-station zoom level.
- Localized the primary search, authentication, listing creation, booking,
  favorites, trips, properties, and host decision flows to Traditional Chinese.
- Added Traditional Chinese reservation status labels and date formatting while
  retaining stable English enum values in the database and API.
- Updated product metadata and the document language to `zh-Hant`.

### Verification

- `pnpm test`: 29 files, 254 tests passed.
- `pnpm test:coverage`: 100% statements, branches, functions, and lines.
- `pnpm lint`: zero errors; the pre-existing React Compiler warning in
  `RentModal.tsx` remains.
- `pnpm typecheck`: passed.

### Catalogue limitation

- The current station set is intentionally curated for an offline, testable MVP
  and is not a complete Japan railway database.
- A versioned Japanese railway dataset or licensed map provider should replace
  or extend it before broad public launch.

## 2026-09-17 — Phase 2B: MongoDB Atlas MVP provisioning

### Scope

- Provisioned the `JapanMidtermMVP` free Atlas cluster in the existing project.
- Created a dedicated application database user with read/write access and
  restricted it to the `JapanMidtermMVP` cluster.
- Kept credentials outside the repository and Git history.
- Synchronized the Prisma schema to the `japan_midterm` database.

### Verification

- Created the `User`, `Account`, `Listing`, `Reservation`, and
  `AvailabilityDay` collections.
- Created the unique user-email and OAuth-provider indexes.
- Created the reservation lookup index and the compound unique
  `AvailabilityDay(listingId, date)` index used to prevent overlapping booking
  locks.
- Prisma Client generation completed successfully after schema synchronization.

### Local environment note

- Avast HTTPS scanning intercepted MongoDB TLS traffic during provisioning.
  Synchronization was completed only after validating the direct Atlas
  certificate chain. HTTPS scanning must be re-enabled after provisioning.

## 2026-09-18 — Multi-image upload state fix

### Scope

- Fixed sequential Cloudinary upload callbacks overwriting one another when a
  host selected multiple photos in one upload session.
- Kept the local image reference synchronized for upload, removal, and cover
  selection actions so the gallery preserves every successful upload.
- Added a regression test covering three Cloudinary success callbacks delivered
  before React re-renders the parent form.

### Verification

- `vitest run tests/components/imageUpload.test.tsx`: 8 tests passed.
- `eslint .`: zero errors; the pre-existing React Compiler warning in
  `RentModal.tsx` remains.
- `next typegen && tsc --noEmit`: passed.
