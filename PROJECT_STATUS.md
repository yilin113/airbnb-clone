# MACHI STAY Project Status

Last updated: 2026-09-18

This file is the shared, repo-backed project status source for ChatGPT and Codex. Update it after every important implementation phase, verification milestone, commit, push, or deployment.

## Product Vision

MACHI STAY is an Airbnb-style vertical accommodation marketplace connecting Taiwanese people who own a self-use home or second home in Japan with Taiwanese renters and travelers who want to live in Japan for 30–180+ days. It uses Airbnb as the benchmark for a complete two-sided marketplace journey, while specializing the product rules and information architecture for Taiwan-owned homes, vacant-period supply, 30-night minimum stays, owner approval, and Taiwanese renters. It helps owners use suitable vacant periods without turning the home into an instant-book hotel, and helps renters make monthly living decisions around station access, transparent costs, living conditions, host approval, and Traditional Chinese guidance.

Brand promise: **日本で、暮らすように泊まる — 在日本，暮らすように泊まる。**

## Team Responsibilities

- **ChatGPT**: product strategy, UX, business model, requirement specifications, prioritization, and outcome review.
- **Codex**: engineering implementation, testing, debugging, code quality, commit/PR work, and technical status updates.

## Current MVP Scope

Marketplace scope:

- Supply: self-use homes and second homes in Japan, initially owned by Taiwanese hosts and offered during vacant periods.
- Stay rule: every stay is at least 30 nights; the typical range is 30–180 days.
- Demand: primarily Taiwanese renters and travelers.
- Product benchmark: Airbnb's host-to-renter marketplace journey, adapted for mid-term living rather than nightly tourism.

- Next.js 16 App Router and TypeScript application.
- MongoDB through Prisma.
- NextAuth authentication with credentials and OAuth providers configured by environment variables.
- Host listing creation with Japanese station/location data, private full address, up to 12 Cloudinary images, monthly rent, utilities, management fee, cleaning fee, and deposit.
- Optional OpenAI-assisted listing-description improvement.
- Listing search by location, stay dates, guest/room/bathroom counts, and category.
- Minimum stay of 30 nights, validated server-side for reservation creation.
- Monthly amounts prorated on a 30-night basis.
- Guest service fee 6%, host commission 6%, and a configurable guest-fee cap (default JPY 30,000).
- Booking Request flow with `PENDING`, `APPROVED`, `DECLINED`, and `CANCELLED` states.
- PENDING and APPROVED reservations block overlapping dates.
- Hosts approve or decline requests; guests can view and cancel their requests.
- Full address remains hidden until a reservation is approved.
- Vercel deployment configuration is present; payment collection is not part of the current MVP.

## Completed

### Foundation and rental rules

- Converted the original Airbnb clone pricing and reservation model toward monthly mid-term stays.
- Added separate utilities, management, cleaning, deposit, guest service fee, host commission, and host payout values.
- Added server-authoritative quote calculation and 30-night validation.
- Added transactional overlap protection and day-level availability locks.
- Added host approval/decline and guest/host cancellation handling.
- Added Japanese prefecture, city, station, private address, postal code, station walking time, and map fields.
- Added multi-image upload and AI description assistance.

### Station and address work already committed remotely

- Latest remote branch commit is `dabbe7f fix: restrict location results to railway stations`.
- Earlier station-search commit is `33a9b40 feat: search railway stations across Japan`.

### MACHI STAY brand — committed locally

- Commit: `aedcf5c feat: integrate MACHI STAY brand identity`.
- Added horizontal and mark logos, favicon, App/Apple/PWA icons, metadata, manifest, and Navbar integration.
- Added desktop/mobile Navbar and homepage preview images.
- Branding verification at commit time: 31 test files and 272 tests passed; typecheck and `git diff --check` passed.
- This commit is local and has not been pushed or deployed.

## In Progress

### Existing station-search work, intentionally kept separate

The following four changes existed before the current Phase 2 implementation and remain uncommitted:

- `app/components/Inputs/CountrySelect.tsx`
- `app/components/Inputs/GoogleAddressAutocomplete.tsx`
- `docs/IMPLEMENTATION_LOG.md`
- `tests/components/countrySelect.test.tsx`

### Phase 2 MACHI STAY UX implementation — functionally complete locally, not committed

Work currently present in the working tree:

- New branded homepage hero, trust highlights, popular areas, usage steps, and Taiwan renter guidance.
- Added a Taiwan-owner section explaining self-use vacancy matching and owner approval.
- Homepage listing grid reduced to a living-oriented 1–4 column layout.
- Search copy updated for 30-night stays.
- Search date range defaults to 30 nights and includes 1/2/3/6-month shortcuts.
- Search adds monthly-rent and station-walking-time filters.
- Airbnb category labels/descriptions are being reframed into long-stay living categories while retaining stored category keys for compatibility.
- Listing cards now show title, station, walk time, 30-night pricing, fixed monthly cost, and approval/minimum-stay badges.
- Listing details now show structured location, fees, address-privacy information, and approval rules.
- Reservation UI now displays an itemized quote and refundable deposit separately.
- Added structured long-stay fields for floor area, furniture, internet, foreign-renter acceptance, resident registration, guarantor requirements, and contract type across Prisma, validation, listing creation, cards, and details.
- Added an Inquiry Prisma model, renter inquiry modal, inquiry API, shared renter/host inbox, and host reply API/UI.
- Added a 48-hour expiry for PENDING booking requests; expired holds are excluded from availability and cleaned up before new reservations.
- Added a mobile sticky detail-page action bar and desktop sticky quote card.
- Added and updated automated tests for search, listings, reservations, and inquiries.

No Phase 2 code has been committed, pushed, or deployed.

## Pending

- Add multi-message inquiry threads and explicit conversation closing if the one-question/one-host-reply MVP proves insufficient.
- Add remaining structured rental fields such as utility limits, house rules, earliest move-in date, required documents, and key-handover details.
- Improve no-result handling with nearby-station or expanded-area suggestions.
- Refine mobile full-screen search/filter UX after visual Preview review.
- Add host/renter status timelines and clearer post-approval next steps.
- Perform browser E2E and responsive visual verification for Phase 2.
- Separate, review, and commit station-search and Phase 2 work independently.
- Push approved commits and deploy only after review.
- Formal payment integration remains outside the current MVP.

## Current Branch / Latest Commit

- Branch: `feat/japan-midterm-mvp`
- Local HEAD: `aedcf5c feat: integrate MACHI STAY brand identity`
- Remote tracking branch: `origin/feat/japan-midterm-mvp`
- Remote tracking commit: `dabbe7f fix: restrict location results to railway stations`
- Local branch is one branding commit ahead of the remote tracking branch.

## Uncommitted Changes

### Modified

- `app/actions/getListings.ts`
- `app/actions/getReservations.ts`
- `app/api/listings/route.ts`
- `app/api/reservations/route.ts`
- `app/components/CategoryBox.tsx`
- `app/components/Inputs/CountrySelect.tsx` — pre-existing station-search work
- `app/components/Inputs/GoogleAddressAutocomplete.tsx` — pre-existing station-search work
- `app/components/listings/ListingCard.tsx`
- `app/components/listings/ListingInfo.tsx`
- `app/components/listings/ListingReservation.tsx`
- `app/components/modals/SearchModal.tsx`
- `app/components/modals/RentModal.tsx`
- `app/components/navbar/Categories.tsx`
- `app/components/navbar/Search.tsx`
- `app/components/navbar/UserMenu.tsx`
- `app/libs/schemas.ts`
- `app/listings/[listingId]/ListingClient.tsx`
- `app/page.tsx`
- `docs/IMPLEMENTATION_LOG.md` — pre-existing station-search work
- `prisma/schema.prisma`
- `tests/components/countrySelect.test.tsx` — pre-existing station-search work
- `tests/components/listings.test.tsx`
- `tests/components/navbar.test.tsx`
- `tests/pages/listingClient.test.tsx`
- `tests/actions/listings.test.ts`
- `tests/api/listings.test.ts`
- `tests/api/reservations.test.ts`
- `tests/helpers/factories.ts`
- `tests/helpers/prisma.ts`

### Untracked before adding these status documents

- `app/api/inquiries/`
- `app/actions/getInquiries.ts`
- `app/components/home/`
- `app/components/inquiries/`
- `app/components/reservations/`
- `app/inquiries/`
- `tests/api/inquiries.test.ts`

`PROJECT_STATUS.md` and `DECISIONS.md` are also untracked until approved and committed.

## Known Issues

- Latest verification: all 32 Vitest files and 278 tests passed; TypeScript and `git diff --check` passed. ESLint has zero errors and one existing React Hook Form compiler warning in `RentModal.tsx`.
- The working tree currently contains three logically separate groups: four station-search changes, Phase 2 UX/inquiry work, and these project-status documents. They must not be combined accidentally in one commit.
- Popular-area homepage cards are currently informational and do not yet apply search filters.
- The 30-night calendar behavior has component tests but still needs browser E2E verification with the real date-range widget.
- Inquiry is currently one question plus one editable host response, not a multi-message chat thread.
- Local browser testing could load the new Navbar/categories but data-backed pages failed because this workspace has no local `DATABASE_URL`. Full responsive testing requires a Vercel Preview or a local Atlas connection string.
- The production build compiled and passed its TypeScript phase, then stopped while prerendering `/properties` for the same missing local `DATABASE_URL`.
- The local branding commit has not been pushed; the deployed site may therefore differ from local HEAD.

## Next Actions

1. Review and approve `PROJECT_STATUS.md` and `DECISIONS.md`.
2. Provide a Vercel Preview or local `DATABASE_URL`, then browser-test the new homepage, search, cards, details, quote, inquiry, and responsive layouts.
3. Review station-search changes separately from Phase 2.
4. Review the Prisma schema additions before deployment; MongoDB collections/fields will be used when the new flows run.
5. Create separate, scoped commits only after visual and functional approval.
