# ServZest launch readiness report

**Assessment date:** 21 September 2026

**Code status:** release candidate for a controlled, single-region pilot after the owner actions below.

**Public launch status:** blocked until the items marked **Launch gate** are completed and verified with real accounts/devices.

This report distinguishes code that can be completed locally from business, legal, provider and production-infrastructure work that requires the company owner. It is not a legal certification, payment certification, KYC certification, or a claim that a local test proves real-world service quality.

## Completed in the repository

### Application and workflows

- Customer, professional and administrator login/workspaces are role gated.
- Customer checkout stores a confirmed pin/address, selected tasks, quote snapshot, schedule, coupon, problem details and idempotency key.
- Professional dispatch validates online state, current approved KYC state, skills, fresh GPS, availability and optionally an active subscription at both offer and acceptance.
- Booking state changes, start OTP, extra-item approval, cancellation, completion, receipt confirmation, rating, complaint and support workflows are server authorized.
- Live worker location, road route, distance, ETA and reconnect recovery are implemented for active bookings.
- Cash and personal UPI QR payments stay pending until the assigned professional confirms actual receipt.
- Subscription plans, expiry, dispatch enforcement, commission ledger, admin activation/settlement APIs and a worker balance view are implemented. Enforcement defaults to off until billing is operational.
- PWA manifest, install prompt, service worker, offline page and mobile layouts are present. API, payment and socket responses are not cached.

### Security and privacy

- Next.js was upgraded from the vulnerable 14.x line to `16.3.5`; React and Lucide were upgraded to compatible versions.
- Final npm audits report zero known vulnerabilities in both client and server dependency trees.
- Browser bearer tokens were removed from `localStorage`. Authentication uses Secure-in-production, HttpOnly, SameSite cookies.
- Sessions are stored server side, expire, can be revoked on logout, and are revoked on account deletion. Production rejects legacy sessionless JWTs.
- Unsafe cookie-authenticated requests validate the production web origin. CORS uses the configured production origin.
- OTP requests and guesses are limited by IP and phone. The mock OTP is disabled in production. A MSG91 adapter is included and production fails to start without its credentials.
- Production fails closed without strong JWT/KYC secrets, an HTTPS client origin, OTP credentials and an admin phone allowlist.
- Admin role is checked against the current database record on every protected request. Production admin login also requires the phone allowlist.
- KYC forms no longer collect a full Aadhaar number. New submissions store only the last four digits, consent, method, submission/review timestamps and reviewer. Resubmission clears legacy full-ID fields.
- General profile responses remove raw identity fields and KYC document URLs. Start OTPs are removed from professional responses.
- Account data export and account deletion are available. Deletion blocks active bookings, removes profile identity/payment/location data, anonymizes the account and revokes sessions.
- Privacy retention removes old precise booking locations after the configured period, clears inactive professional locations and deletes long-expired sessions.
- Critical KYC, settings, subscription, ledger and payment receipt actions create audit records.
- Unsupported public claims and placeholder company/support identities were removed; the UI now describes admin approval and ETA as estimates.
- API body limits, validation, authorization, rate limits, safe database errors, request IDs, JSON request logs and security headers are enabled.
- UPI transaction references are unique and completed payment records are replay safe.

### Production engineering

- Database readiness (`/ready`) is separate from liveness (`/health`).
- SIGTERM/SIGINT stop schedulers, close HTTP traffic and disconnect Prisma.
- Production Dockerfiles, a production Compose definition and migration-on-start path are included.
- CI installs from lockfiles, generates Prisma, tests, builds and audits both applications.
- Demo fixtures require `SEED_DEMO_DATA=true`; the normal seed only creates catalog/settings. Production admin bootstrap requires an explicit CLI phone number.
- Local PostgreSQL binds only to loopback and no longer uses the old QuickKaam database/container names.

## Verification evidence

- Backend TypeScript build: **PASS**
- Frontend Next.js production build: **PASS**, 15 routes generated
- Jest: **40/40 tests PASS across 10 suites**
- Secure cookie flow: send OTP, verify, `/me`, logout and revoked-session `/me` = **PASS**; no token returned to browser JavaScript
- Same-origin web proxy on `localhost:3001`: login page, CSP header, OTP session cookie and proxied `/me` = **PASS**
- Health and database readiness = **PASS**
- Checkout integration = **PASS**
- Work lifecycle, authenticated sockets, GPS, assignment, OTP privacy, QR/cash receipt and support integration = **PASS**
- Admin/KYC regression: **23 API checks plus assertions PASS**
- Subscription activation/enforcement, worker ledger view, account export/deletion and deleted-account rejection smoke test: **PASS**
- Prisma migrations `004` through `008` applied successfully to the configured development database
- Client npm audit: **0 vulnerabilities**
- Server npm audit: **0 vulnerabilities**
- Production startup without required secrets: **blocked as designed**

The in-app browser security policy blocked opening localhost for an additional visual automation pass. The production build and prior browser checks cover compilation and the implemented flows, but real-device validation remains a launch gate.

## Owner actions before any public launch

### 1. Legal identity, tax and policies — **Launch gate**

- Register/finalize the operating entity, business bank account, GST/tax treatment and invoicing identity with a qualified CA/lawyer.
- Have counsel finalize customer Terms, Privacy Notice, cancellation/refund/revisit/warranty policy, professional agreement, marketplace/worker classification, liability, insurance and dispute process.
- Replace the placeholders on `/privacy`, `/terms`, `/contact` and invoices with the legal entity name, registered/postal address, monitored email, grievance officer and real support number.
- Decide documented retention periods and legal holds. The code default for precise completed-booking location is 90 days; confirm or change `BOOKING_LOCATION_RETENTION_DAYS` before deployment.
- Document consent withdrawal, correction, grievance and deletion handling. The app provides consent, export and deletion controls, but staff must operate the process.

Official basis to review: [Digital Personal Data Protection Act, 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf) and [MeitY explanatory note on the DPDP Rules, 2025](https://www.meity.gov.in/writereaddata/files/Explanatory-Note-DPDP-Rules-2025.pdf).

### 2. Real OTP — **Launch gate**

- Open and verify an MSG91 account, complete applicable DLT sender/template registration, create the OTP template and provide `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` through the secret manager.
- Set `OTP_PROVIDER=msg91`, test delivery/expiry/retry on Airtel, Jio and Vi numbers, and monitor cost/failure/abuse alerts.
- Never expose these values in the client, Git repository or screenshots.

Provider flow used by the adapter: [MSG91 OTP documentation](https://docs.msg91.com/otp) and [verification API](https://docs.msg91.com/otp/verify-otp).

### 3. Professional identity and safety — **Launch gate**

- The current last-four-digit submission is a privacy-safe intake marker; it is **not identity verification**. Do not advertise professionals as verified from this field alone.
- Choose an authorized identity/background-check workflow, obtain explicit consent, define reviewer training/evidence/rejection/appeal/re-verification rules and integrate the resulting provider reference.
- If Aadhaar offline verification is used, complete the required OVSE/provider onboarding and legal review. Prefer UIDAI paperless offline e-KYC so the Aadhaar number is not collected or stored.
- Verify skills, address/background checks, emergency escalation and appropriate business/worker insurance before approving real professionals.

Official references: [UIDAI Offline Aadhaar e-KYC](https://uidai.gov.in/en/307-faqs/aadhaar-online-services/aadhaar-paperless-offline-e-kyc/10726-what-is-aadhaar-offline-e-kyc.html) and [UIDAI OVSE registration](https://uidai.gov.in/as/2-uncategorised/19593-ovse-registration.html).

### 4. Payments, refunds, subscription and commission — **Launch gate for automatic online collection**

- Decide the launch model:
  - A controlled pilot may use cash/personal UPI with professional receipt confirmation and manual commission settlement from the ledger.
  - Booking-time online payments, automatic confirmation, refunds, payouts and automatic subscription purchase require a regulated payment provider integration.
- Complete merchant onboarding/KYC, webhook signing, order idempotency, refund rules, settlement/payout reconciliation, chargeback handling and finance access controls with the selected provider.
- Reconcile the ledger daily during a pilot. Activate each paid professional subscription through the admin API, then set `subscription_required=1` only after all eligible professionals have active records.
- Test one real low-value UPI payment, refund and settlement in the provider sandbox/live pilot. Local tests transferred no money.

Review the selected arrangement against RBI payment-aggregator requirements: [RBI payment aggregator guidelines](https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=11996).

### 5. Production infrastructure and secrets — **Launch gate**

- Buy/configure the production domain and HTTPS. Put the web/API behind a managed load balancer or reverse proxy and set `CLIENT_URL` to the exact HTTPS origin.
- Provision managed PostgreSQL with PostGIS, private networking, encryption at rest, automated point-in-time recovery and a tested restore. Do not expose port 5432 publicly.
- Create unrelated random secrets for `JWT_SECRET` and `KYC_ENCRYPTION_KEY` in a secret manager. Set all values in `.env.example`; never create a committed `.env.production`.
- Use one API replica for the initial pilot. Current booking searches recover after a restart, but in-flight offer timers are process-local and multiple API replicas require a durable queue/lock architecture.
- Configure dedicated/contracted Photon-compatible geocoding and OSRM-compatible routing capacity; the public demo endpoints have no production availability guarantee.
- Store logs securely in India for the required period, restrict access, alert on auth/payment/admin anomalies, designate a CERT-In point of contact and rehearse breach reporting/response.
- Configure uptime, error, latency, database, queue/dispatch, SMS, payment, backup and certificate-expiry alerts. Run a restore and rollback drill before opening bookings.

CERT-In directions require covered entities to report specified incidents promptly and securely retain ICT logs for a rolling period: [CERT-In Directions under section 70B](https://www.cert-in.org.in/Directions70B.jsp) and [official FAQ on six-hour reporting](https://www.cert-in.org.in/PDF/FAQs_on_CyberSecurityDirections_May2022.pdf).

### 6. Operations and real-device release — **Launch gate**

- Define the first service zones, working hours, slot capacity, rate card, taxes, cancellation compensation, service warranty, quality rubric and no-provider escalation.
- Add a trained support rota with response SLAs, complaint/refund authority, safety escalation and emergency contacts. Replace every placeholder before launch.
- Onboard enough approved professionals for the promised geography and measure actual acceptance and arrival times. Publish “~20 minutes” only where operational data supports it.
- Test customer and professional flows on representative Android devices, iPhone/Safari, weak networks, denied GPS, background/resume, low battery, screen readers and Hindi text.
- Run load tests at expected peak plus headroom and an independent VAPT/pentest. Resolve all critical/high findings and retest.
- Start with a small invite-only area, monitor failed dispatch/payment/support rates, then expand through an explicit go/no-go review.

## Production setup sequence

1. Copy `.env.example` values into the hosting secret manager and fill every production field.
2. Deploy the PostGIS database and verify backups/PITR.
3. Build and deploy `docker-compose.prod.yml` (or equivalent managed services). The API applies checked-in migrations before starting.
4. Run `ADMIN_PHONE=... ADMIN_NAME=... npm run bootstrap:admin --prefix server` in a protected one-time admin job and include the phone in `ADMIN_PHONE_ALLOWLIST`.
5. Seed catalog/settings without demo data: keep `SEED_DEMO_DATA=false`.
6. Verify `/health`, `/ready`, HTTPS headers, OTP, login/logout/session revocation, KYC review, one complete cash job and one payment-provider sandbox job if online payment is enabled.
7. Confirm backup restore, alert delivery, support ownership and rollback before enabling real customer traffic.

## Pilot boundaries that must be respected

- Run one API instance until durable multi-instance dispatch is implemented.
- Treat self-declared ID last four digits as pending intake, not verification evidence.
- Treat personal UPI QR as manual professional collection, not bank-verified platform payment.
- Keep subscription enforcement off until billing/activation and support are live.
- Do not promise a 20-minute arrival, 24×7 support, insurance, background verification or refunds unless operations can prove and deliver them.
