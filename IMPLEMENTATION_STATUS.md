# ServZest implementation status — 21 September 2026

The current release assessment and owner launch gates are in `LAUNCH_READINESS_REPORT.md`. Later sections in this historical log that call subscriptions, commission ledger, real OTP adapter, session revocation, data export/deletion, audit logs, production containers, CI or retention entirely unimplemented are superseded by that report.

This records the implemented local application workflows. It does not certify a production launch or replace the earlier audit.

## Connected workflows

- Customer: task selection, confirmed pin/address, optional problem description, persisted scheduled bookings, first-booking coupon, matching/no-provider status, extra-work approval, cancellation, final bill, review, booking complaint and support tickets.
- Professional: registration role, service/KYC submission, admin review, online/offline, genuine browser GPS updates, offer recovery after reconnect, atomic acceptance, arrival, customer OTP start, extra-item requests, completion, UPI details and receipt confirmation.
- Payments: per-booking UPI QR generated locally from the assigned professional's saved UPI ID, recipient name and finalized amount. Mobile UPI intent link and transaction-reference report. Cash and UPI reports stay PENDING until the assigned professional confirms receipt. Rejected reports can be retried; completed payments cannot be overwritten by repeated customer requests. The QR recipient is frozen for a pending QR request.
- Admin: one dashboard at `/admin` (old dashboard redirects), worker KYC, service prices, validated settings, bookings/cancellation, booking complaints, contact-ticket resolution, customers and reported worker locations.
- Integrity: authenticated sockets and authorized rooms, no random GPS fallback, two-minute location freshness for dispatch, private start OTP omitted from professional responses, transaction-protected booking changes, completion blocked while extra items await approval, persisted pricing rules and customer ownership checks.
- Development: root launcher and file-save refresh. Separate `.next-dev` and `.next` caches prevent dev/build output collisions. OneDrive/antivirus can still temporarily lock generated Windows files.

## How to use QR payment

1. Professional logs in and saves their own UPI ID and recipient name under **UPI & payment receipts**.
2. After the job is completed, customer opens the booking and chooses **Show UPI QR**.
3. Customer checks the recipient in their UPI app, pays, and reports the transaction reference.
4. Professional checks their own bank/UPI credit and selects **Money received**. The receipt then becomes confirmed.

Generating a QR, opening a UPI app, or entering a reference does **not** verify a bank transaction. This integration is professional-confirmed payment collection, not automatic bank verification. No actual money was transferred during testing. Bank/UPI app acceptance needs verification with the professional's real account before rollout.

## Validation

- Backend TypeScript build and frontend production build.
- 18 automated tests covering pricing, checkout schedules/coupons, OTP expiry/reuse/attempt limits, UPI payload and payment-report validation.
- `server/scripts/business-flow-smoke.cjs`: isolated customer/professional/admin records; authenticated sockets, GPS, assignment, OTP privacy, status transitions, pending-extra guard, QR, UPI/cash receipt confirmation/rejection/retry, immutable paid record, review, complaint and support resolution.
- `server/scripts/checkout-smoke.cjs`: scheduling, dispatch, price validation, duplicate request and ownership regression checks.
- Test scripts require a running local API and the configured development database. They delete only their own fixture records.

## Still needed for a real business launch

- A real SMS provider and account configuration. Fixed development OTP is disabled in production; production login deliberately fails closed until a provider is integrated.
- If automatic bank confirmation, booking-time advances, refunds or settlements are required: a payment provider account, server orders, signed webhooks and reconciliation. The current professional QR supports final payment after service.
- Professional subscription plans, renewal/expiry enforcement and actual commission collection/settlement ledger remain separate unimplemented business modules. Dashboard commission is a calculated amount due, not money collected by the company.
- Real road-routing provider, durable multi-instance dispatch jobs, operational KYC evidence storage/review, verified support contacts, production deployment/monitoring/backups and the remaining audit items.
- Identity verification and real field arrival times cannot be established by local software tests. The current map shows reported markers; travel ETA remains an estimate, not a road-routing guarantee.

## Follow-up regression audit — 20 September 2026

This section supersedes earlier test counts. The original production audit is a historical baseline, not a description of every current defect.

### Repairs in this pass

- Dispatch reserves its in-flight lookup, preventing duplicate requests from starting competing offer timers. Cancelling during a database/settings lookup cannot resurrect an offer. Actual lookup failures remain retryable; they no longer become false NO_PROVIDER results. The single-process scheduler retries interrupted SEARCHING bookings every ten seconds. This is not a multi-instance durable queue.
- HTTP authorization checks the current account and role in the database; deleted accounts and revoked admin roles cannot continue using an old signed token. Worker registration saves the account and profile atomically and returns the initialized profile.
- KYC edits lock the professional row before checking active work. Going online checks approval in the write itself. Duplicate assignment socket messages (including one with the phone as the worker name) were removed.
- Authorized booking detail restores fresh professional GPS/ETA after refresh. Coordinates older than two minutes or outside travel states are withheld. Throttled socket GPS requests receive an acknowledgement instead of hanging.
- Admin settings save atomically. Admin filters, cancellation reasons, reviews and route identifiers are validated. India-day earnings do not depend on the hosting server timezone.
- Admin OTP sending and verification are separate steps; verification no longer sends a replacement OTP. Demo login controls are excluded from production builds. Shared API calls have bounded waits and readable non-JSON/rate-limit failures; failed admin actions show errors.
- FAQ now points to the working support form rather than a placeholder helpline; selected unsupported verification claims and illustrative review labels were corrected. Remaining marketing/legal text still needs an owner review against actual business operations.

### Verification matrix

| Area | Evidence/result | Remaining boundary |
| --- | --- | --- |
| Authentication and roles | Unit tests for deleted accounts, malformed tokens and role revocation; admin OTP login checked in browser | Live SMS integration and admin MFA not implemented |
| Customer checkout | Checkout integration script passed: quotes, tasks, coupon, duplicate retry, schedules, ownership, cancellation, dispatch | Real coverage/capacity policies need business configuration |
| Professional matching | Five new concurrency/recovery tests pass; actual API assignment and offer recovery pass | Multi-instance persistence, load tests and real road routing pending |
| Work lifecycle | Business-flow integration passed arrival, OTP privacy/start, extra approval guard and completion | Real field arrival/quality not established by software tests |
| Payment and reviews | QR payload, pending report, professional confirmation, rejection/retry, paid-record replay, cash, ratings pass | No bank webhook verification, advances, refunds or settlement ledger |
| Admin operations | KYC gating, pricing rollback, all eight dashboard read APIs, support resolution and permissions checked | Large-dataset pagination, audit log and KYC evidence protection remain |
| Live location | Fresh/stale GPS API recovery assertions pass; address autocomplete/map selection checked in previous pass | Browser GPS permission and actual outdoor tracking depend on device/network |
| Customer support | Complaint and contact-ticket creation/admin resolution pass | Staff staffing/response SLAs and real support contacts are operational work |
| Public UI | Admin login/overview and operations panel checked; production build passes | Not every screen/device/browser combination has been manually verified |

Validation: 26 Jest tests across 7 suites; backend TypeScript build; frontend production build; existing business-flow and checkout integration suites; `server/scripts/audit-regression.cjs` with 20 API checks and additional assertions. All passed. Integration scripts cleaned up their own fixture data; no real payment was made. Initial sandbox database connection failed; tests passed with network access. Next build emitted a non-fatal webpack cache warning under OneDrive.

Still unimplemented: subscriptions/renewals/expiry enforcement, collection of company commission, cancellation-fee collection, real SMS, payment gateway and reconciliation, operational KYC evidence, road routing, durable multi-instance dispatch, deployment/monitoring/backups. Do not describe this as equivalent to a fully operated Uber/Zepto-scale production service.

### Live road tracking follow-up
The road-routing integration is now implemented for assigned/en-route/arrived bookings: authenticated fresh GPS, OSRM route geometry, distance and estimated driving time, rendered polyline and both markers, stale/missing location feedback and automatic retry when the provider is unavailable. Traffic-aware ETA, dedicated production routing and field-device validation remain pending. Backend build, client TypeScript check and 29 tests passed; public ABES-area routing returned 1,845.3 metres / 229 seconds. The earlier sections describing road routing as entirely unimplemented are superseded by this follow-up.

## Sequential backend verification — 21 September 2026

Completed existing backend checks in order: login/permissions; pricing/checkout/dispatch/road-route tests; database checkout integration; payment validation; full work lifecycle and receipt integration; API error handling; admin/KYC integration. Each stage passed before the next stage was started. A final small-bill commission edge case was fixed and the pricing tests rerun.

Repairs:
- Monetary totals and earnings round to paise; commission cannot exceed labor revenue and create negative earnings on small amounts.
- Existing booking pricing uses saved rules without unnecessary current-settings database reads.
- QR/report/receipt transactions use the shared booking lock and 20-second transaction timeout.
- Shared error responses return 404 for missing records, 409 for conflicting records, 503 for database availability/transaction timeouts, and readable malformed-JSON errors without database internals.
- Added `npm run verify:backend` inside `server`: ordered verification which stops at the first failure and writes `backend-verification.json`. Requires the running local API and a development database. The new runner syntax was checked; its component commands were executed sequentially in this session.

Results: 38 unique unit/regression tests passed across the individually executed suites; checkout integration PASS; lifecycle/cash/UPI/support integration PASS; admin audit 23 API checks plus assertions PASS; backend TypeScript build PASS. Temporary integration records were cleaned. Initial checkout attempt failed because the API was not running; the local backend was started and the test then passed.

Scope: these results cover implemented local workflows. Real SMS delivery, automatic bank verification/refunds, subscription billing, commission/cancellation-fee collection, protected operational KYC storage and production infrastructure remain unimplemented or unverified. They are not certified by this test pass. No live money was transferred.

## Internal wiring and mobile-app pass — 21 September 2026

- Customer-only booking mutations are enforced at the route and controller layers. History, booking checkout, header, account and bottom navigation now route each authenticated role to its own workspace.
- Expired sessions clear automatically after any API 401. The app now shows a connection banner when offline and registers a lightweight service worker with an offline page; API, payment and socket responses are never cached.
- Native browser alerts, prompts and confirmations were replaced in customer payment, professional workflow and admin operations with accessible in-app dialogs and status messages.
- KYC responses never contain raw Aadhaar. Admin receives only a masked value; new Aadhaar submissions are encrypted with AES-256-GCM before database storage. Production startup requires a separate `KYC_ENCRYPTION_KEY`. Existing legacy plaintext remains readable only server-side until resubmission converts it.
- Location socket writes now require the authenticated professional, approved KYC, and either online availability or an assigned active job. JWT algorithms are restricted and basic API security headers/body/rate limits are enabled.
- Leaflet moved into a client-only bundle after browser testing exposed a missing lazy chunk. Address suggestion selection and the draggable map were then verified in the running mobile viewport.
- Current validation: frontend production build PASS; frontend TypeScript PASS; backend TypeScript PASS; 40 tests across 10 suites PASS; every stage of `npm run verify:backend` PASS, including checkout, scheduling, dispatch, lifecycle, QR/cash receipt, permissions, admin/KYC and database cleanup.

Still outside the implemented product boundary: real SMS delivery, payment-gateway/bank webhooks, refunds, subscription billing and expiry, commission settlement ledger, operational KYC document verification, multi-instance durable dispatch, production hosting/monitoring/backups, and field-device GPS/payment validation.
