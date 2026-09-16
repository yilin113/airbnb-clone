# External services roadmap

The repository can be developed and tested without installing an additional
Codex plugin. The product will need the following service accounts or API keys
as each capability is activated.

## Required for the testable MVP

### MongoDB Atlas

- Stores users, listings, reservations, price snapshots, and availability-day
  locks.
- Must use an Atlas cluster or another MongoDB replica set because atomic
  reservation creation uses transactions.
- Run `prisma db push` once `DATABASE_URL` is configured so compound unique
  indexes are created.

### Cloudinary

- Stores listing photographs.
- Requires `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and a deliberately configured
  upload preset before real uploads are enabled.

## Optional during MVP

### Google and GitHub OAuth

- Social login is already scaffolded through NextAuth.
- Email/password registration remains available while OAuth credentials are
  absent.

### Map and station provider

- Needed in Phase 2 for Japan-only prefecture, city, and station selection.
- Select either Mapbox or Google Maps only after comparing Japanese address,
  station, licensing, and expected traffic costs.
- Prefer a versioned open Japanese railway dataset for canonical station IDs;
  do not use a map search result as the permanent station identifier.

## Post-MVP

### Stripe

- Collects guest payments, platform fees, host payouts, refunds, and deposit
  handling after the booking workflow is stable.
- Not required for the current no-payment MVP.

### Vercel

- Recommended deployment target for the Next.js application.
- Add only after environment variables and the Atlas network policy are ready.
