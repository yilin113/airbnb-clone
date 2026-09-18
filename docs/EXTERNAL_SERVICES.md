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

### Google Maps Platform

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` activates Japan-only address autocomplete
  in the host listing flow. Manual address entry remains available if the API
  is unavailable.
- Restrict the browser key to the production web origin and only the Places API
  (New) plus Maps JavaScript API.
- Place selection fills the Japanese postal code, private full address, and map
  coordinates. The curated station catalogue remains the canonical public
  station identifier until a versioned Japanese railway dataset is adopted.

## Post-MVP

### Stripe

- Collects guest payments, platform fees, host payouts, refunds, and deposit
  handling after the booking workflow is stable.
- Not required for the current no-payment MVP.

### Vercel

- Recommended deployment target for the Next.js application.
- Add only after environment variables and the Atlas network policy are ready.
