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
