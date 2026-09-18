# MACHI STAY Decisions

Last updated: 2026-09-18

This file records confirmed product and technical decisions. Update it whenever a decision materially changes product behavior, architecture, pricing, data handling, or delivery workflow.

## Collaboration Responsibilities

### ChatGPT

Owns product strategy, UX direction, business model, requirement specifications, prioritization, and review of delivered outcomes.

### Codex

Owns engineering implementation, automated testing, debugging, code quality, commit/PR work, and accurate technical status updates based on the repository.

Reason: product decisions and implementation status need distinct owners while sharing the same repo-backed source of truth.

## Product Positioning

**Decision:** MACHI STAY is an Airbnb-style vertical accommodation marketplace for Japan mid-term stays. Airbnb is the product benchmark for the end-to-end marketplace standard: host onboarding and listing management, renter discovery and search, listing presentation, inquiries, booking requests, host approval, availability, trust and safety, reviews, notifications, support, and—when introduced—payments and dispute handling. MACHI STAY does not copy Airbnb's brand or UI and is not positioned as a nightly vacation-rental clone.

**Reason:** benchmarking a mature two-sided marketplace gives the product a coherent operating model, while the narrower audience and 30-night rule require different information, pricing, approval, and compliance flows.

**Decision:** the initial marketplace focus is the following three-part model:

1. Hosts are primarily Taiwanese people who own a self-use home or second home in Japan.
2. Hosts make that home available only during vacant periods, for stays of at least 30 nights.
3. Renters are primarily Taiwanese people seeking a place to live temporarily in Japan.

**Reason:** mid-term renters compare commute, monthly cost, furniture, utilities, contracts, and move-in requirements. These are different decisions from short leisure accommodation.

## Target Users

**Decision:** the primary renter audience is Taiwanese travelers and renters planning a stay of at least 30 days in Japan. The initial supply-side audience is Taiwanese people who own a self-use home or second home in Japan and want to accept suitable mid-term guests during vacant periods.

**Reason:** the product must solve cross-border trust and information problems for Taiwanese users on both sides. Owners need control over when their personal home is available and who stays there; renters need Traditional Chinese information, transparent costs, station access, and a clear approval process.

**Decision:** MACHI STAY is not initially positioned as a general Japanese property-management marketplace or a hotel-style instant-book service. Professional property managers may be considered later, but they are not the primary MVP persona.

**Reason:** prioritizing Taiwan-owned, primarily self-use homes gives the product a clearer trust model and prevents early requirements from expanding into the full complexity of general Japanese leasing.

## Minimum Stay

**Decision:** every reservation must be at least 30 nights. Typical stays are 30–180 days, with longer stays allowed where the listing supports them.

**Implementation:** the reservation API validates the minimum server-side. Search and listing UI must also guide users toward valid ranges, but client validation is not the security boundary.

**Reason:** server enforcement prevents invalid or manipulated requests, while UI enforcement reduces user errors.

## Pricing Model

**Decision:** listings use JPY monthly pricing rather than Airbnb-style nightly pricing. Monthly recurring amounts are prorated on a 30-night basis for the selected stay.

Price components:

- Monthly base rent.
- Monthly utilities.
- Monthly management fee.
- One-time cleaning fee.
- Refundable deposit.
- Guest service fee: 6%, configurable, with a configurable cap; current default cap is JPY 30,000.
- Host commission: 6%, configurable.

**Reason:** renters need both a comparable 30-night price and a transparent total for their actual入住 period. Deposits must be separated from non-refundable living costs.

## Booking Request and Payment

**Decision:** a renter submits a Booking Request; the host must approve it before confirmation. The current MVP does not collect formal payment.

**Reason:** Japanese mid-term stays often require eligibility and date confirmation. The UI must not imply immediate booking or immediate charging before payment integration and operating procedures are ready.

## Availability and Overlap

**Decision:** PENDING and APPROVED reservations are treated as blocking for overlap checks. Reservation creation uses a transaction and unique listing/date locks.

**Reason:** server-side concurrency protection prevents two renters from acquiring the same dates even if they submit simultaneously.

**Decision:** PENDING requests expire after 48 hours. Expired holds are excluded from availability and released when the reservation service next processes that listing.

**Reason:** unhandled requests must not block a property indefinitely while still giving hosts a practical review window.

## Inquiry Versus Booking Request

**Decision:** the UX should provide two separate actions:

- **詢問房東**: non-binding question about the listing, requirements, or dates; it must not reserve inventory or create a charge.
- **送出入住申請**: formal request for selected dates and displayed costs; it enters host review and blocks availability under the current rule.

**Reason:** cross-border renters frequently need clarification before they are ready to make a formal application.

**MVP scope:** one renter inquiry and one editable host response are stored per inquiry. A full multi-message chat thread is deferred until product usage justifies it.

## Location and Address Privacy

**Decision:** users search by Japanese prefecture, city, administrative area, or railway station. Public listing pages show the city/area, nearest station, walking time, and approximate map location. The full address remains private until a reservation is approved.

**Reason:** station access is a primary housing decision in Japan, while hiding the exact address protects hosts and properties before a legitimate stay is approved.

## Taiwan-Focused Rental Information

**Decision:** MACHI STAY listing UX should progressively add structured information for:

- Foreign-renter acceptance and supported languages.
- Passport, visa/residence status, and required documents.
- Japanese guarantor or guarantee-company requirements and fees.
- Contract type and whether overseas signing is possible.
- Whether resident registration is allowed.
- Furniture, appliances, bedding, internet, and utility limits.
- Smoking, pets, guests, noise, and garbage rules.
- Deposit refund, cleaning, restoration, insurance, and key handover.
- Railway operator, line, station, exit, and walking time.

**Reason:** these fields materially determine whether a Taiwanese renter can actually use a property; they are not secondary travel amenities.

**Scope clarification:** resident registration, guarantor, and formal lease-type fields are optional property facts, not universal MACHI STAY requirements. The platform should only surface them when relevant to a specific home or stay arrangement.

## Search UX

**Decision:** the primary search uses location/station, move-in date, stay length, and renter count. Stay-length presets are 30, 60, 90, and 180 nights, with exact dates also supported.

**Reason:** medium-term renters commonly know an approximate arrival and number of months rather than treating check-in and checkout as two independent hotel dates.

**Decision:** search should later support monthly budget, station walking time, furnished status, utilities, internet, foreign-renter acceptance, and availability.

**Reason:** these are the highest-value filters for a place to live, unlike the original clone's leisure-property categories.

## Listing Card and Detail UX

**Decision:** listing cards prioritize title, area, station, walk time, 30-night rent, estimated monthly fixed cost, minimum stay, and approval requirement.

**Decision:** listing details provide an itemized stay quote, separate refundable deposit, transit information, approximate map, rental conditions, and address-privacy explanation.

**Reason:** the product should help users evaluate housing suitability and total cost before visual novelty or vacation categories.

## Brand Identity

**Decision:** the product brand is **MACHI STAY**, with subline **JAPAN RENTAL** and Japanese line **日本で、暮らすように泊まる**.

Approved palette:

- Sakura Pink: `#D98B86`
- Charcoal Brown: `#3A2E28`
- Soft Beige: `#F8F4EE`
- Misty Grey: `#D9D4CF`

**Decision:** use the supplied final Brand Reference without redesigning the logo, proportions, brand name, or specified colors. The visual direction is minimal, natural, Japanese-lifestyle oriented, and lightly hand-drawn without an obvious generated-AI appearance.

**Reason:** consistent identity must be established before broader UI redesign. Brand assets were therefore completed as an isolated first-phase commit.

## Technical Direction

**Decision:** evolve the selected existing Next.js/TypeScript Airbnb clone incrementally rather than rebuild from scratch.

Current foundation:

- Next.js 16 App Router and React 19.
- TypeScript.
- Prisma with MongoDB.
- NextAuth.
- Cloudinary image upload.
- Leaflet map display, with Google-powered address/station autocomplete work present locally.
- OpenAI-assisted listing-description endpoint.
- Vitest and Testing Library.
- Vercel deployment.

**Reason:** the repository already contains working authentication, listings, reservations, image upload, and dashboards. Incremental conversion reduces delivery risk while preserving tested behavior.

## Server Authority and Security

**Decision:** pricing, minimum stay, overlap detection, ownership checks, and approval transitions must be validated server-side. Client-calculated totals are display-only and are not trusted by the reservation API.

**Reason:** rental availability and financial amounts cannot rely on editable browser state.

## Git and Delivery Workflow

**Decision:** branding, station search, and Phase 2 product work remain separate commits. Do not mix unrelated uncommitted files into a commit.

**Decision:** each important stage must run relevant tests, typecheck, lint, and `git diff --check` before commit. Do not push or deploy until the user approves the result.

**Reason:** scoped commits are reviewable, reversible, and prevent unrelated work from being accidentally shipped together.

## Project Documentation

**Decision:** update `PROJECT_STATUS.md` after every important phase. Update `DECISIONS.md` whenever a major product or technical decision is confirmed or changed.

**Reason:** ChatGPT and Codex need a durable shared source that reflects the repository rather than relying on conversation history.
