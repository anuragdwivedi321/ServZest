# ServZest production-readiness audit

20 September 2026. Current workspace code reviewed, including existing uncommitted edits.

**Verdict: working MVP foundation; real customers, live money aur sensitive identity data ke saath public launch ke liye ready nahi.**

Frontend/backend routes, controllers, auth, sockets, dispatch/pricing, Prisma schema/migration/seed, shared UI, public pages, configuration aur tests inspect kiye. Findings source-code review par based hain; vulnerabilities live database par exploit nahi ki gayi. Real provider payments, field GPS, load testing, production hosting aur legal compliance verify nahi hue. Application source modify nahi kiya gaya.

Validation: frontend production build PASS (Next.js 14.2.35); backend TypeScript build PASS; Jest 2 suites / 9 tests PASS. Build success functional/security readiness prove nahi karta.

P0 = public launch blocker. P1 = business pilot/required feature blocker. P2 = operations, reliability ya usability improvement. Severity expected real-business deployment ko assume karti hai.

**1. [P0] Login aur admin creation unsafe**

Evidence: [server/src/services/otp.service.ts:22](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/services/otp.service.ts:22); [server/src/modules/auth/auth.controller.ts:13](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/auth/auth.controller.ts:13).

Abhi: Mock OTP provider har environment mein active hai. Fixed code bina send request ke bhi valid hai. Public signup Role enum se ADMIN accept karke naya admin create kar sakta hai.

Badlav: Real OTP delivery, expiring single-use verification, phone/IP attempt limits; public roles CUSTOMER/WORKER only. Admin provisioning restricted rakho aur admin MFA add karo.

**2. [P0] Booking ownership checks missing**

Evidence: [server/src/modules/bookings/bookings.routes.ts:26](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/bookings/bookings.routes.ts:26).

Abhi: JWT required hai, lekin get/cancel/approve/pay/rate/complaint mein booking owner ya participant verify nahi hota. Kisi doosre booking ID ko jaanne wala logged-in user data read ya action kar sakta hai.

Badlav: Har endpoint par role + ownership policy enforce karo. Customer sirf apni booking; worker sirf assigned booking; admin audited access.

**3. [P0] Unauthenticated socket access aur location writes**

Evidence: [server/src/sockets/socket.server.ts:17](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/sockets/socket.server.ts:17).

Abhi: Socket handshake authentication nahi. Client arbitrary worker/booking rooms join kar sakta hai aur supplied workerId ki location write kar sakta hai.

Badlav: JWT handshake, server-derived worker identity, room membership authorization, event validation, rate limits aur completion ke baad tracking access revoke karo.

**4. [P0] Worker ko customer ka start OTP milta hai**

Evidence: [server/src/modules/worker/worker.controller.ts:53](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/worker/worker.controller.ts:53).

Abhi: Profile activeBooking aur accept response poora booking record return karte hain, jisme startOtp bhi hai. Worker customer se OTP liye bina use padh sakta hai.

Badlav: Role-specific response fields; worker/admin routine responses se OTP hatao. Secure random generation, limited verification attempts aur protected storage use karo.

**5. [P0] KYC data customer response mein leak hota hai**

Evidence: [server/src/modules/bookings/bookings.controller.ts:151](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/bookings/bookings.controller.ts:151).

Abhi: Nested worker include saare scalar fields deta hai, including aadhaarNumber/aadhaarDocUrl. History mein bhi same over-sharing hai.

Badlav: Public professional projection sirf name/photo/rating/relevant contact rakho. ID data restricted, masked aur protected storage mein rakho.

**6. [P0] Payment bina money verification completed**

Evidence: [server/src/modules/bookings/bookings.controller.ts:285](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/bookings/bookings.controller.ts:285).

Abhi: payBill seedha COMPLETED payment upsert karta hai; UPI reference bhi locally generate hota hai. Gateway verification, cash receipt confirmation aur booking-state guard absent hain. Repeat calls paid record overwrite karte hain.

Badlav: Server-created payment order, verified provider signature/event, idempotency aur immutable payment attempts banao. Cash collected professional confirm kare; customer confirmation/dispute record rakho.

**7. [P0] Ineligible aur busy worker booking accept kar sakta hai**

Evidence: [server/src/services/dispatch.service.ts:221](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/services/dispatch.service.ts:221).

Abhi: Booking SEARCHING hone ka atomic check hai, par current offer, expiry, skills, approved KYC, online/busy state acceptance par verify nahi hote. Worker busy update alag write hai; same worker multiple bookings le sakta hai.

Badlav: Booking aur worker reservation ek transaction mein karo; active offer and all eligibility checks enforce karo. Database mein one-active-job invariant protect karo.

**8. [P1] Booking transitions concurrent requests mein inconsistent**

Evidence: [server/src/modules/worker/worker.controller.ts:180](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/worker/worker.controller.ts:180).

Abhi: Status read ke baad unconditional update hai; cancel ke saath arrive/start/complete race ho sakte hain. Busy flag aur booking status alag writes hain.

Badlav: Conditional state transitions + transaction + version/idempotency key; event sirf committed transition ke baad emit karo.

**9. [P1] Admin cancellation completed booking bhi rewrite kar sakta hai**

Evidence: [server/src/modules/admin/admin.controller.ts:162](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/admin/admin.controller.ts:162).

Abhi: API terminal states block nahi karta, dispatch cancel nahi karta, aur worker pehle free karta hai. UI button hide karna backend protection nahi.

Badlav: Shared cancellation service, terminal-state guard, dispatch cancellation, transaction, refund/fee policy aur audit event.

**10. [P1] Dispatch restart ke baad recover nahi hota**

Evidence: [server/src/services/dispatch.service.ts:32](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/services/dispatch.service.ts:32).

Abhi: Offers aur timers process-local Map mein hain. Restart/multiple instances mein coordination lost. Exhaustion booking ko SEARCHING hi chhodta hai; error bhi empty candidates ban jata hai.

Badlav: Persistent offers with expiry, durable jobs, bounded retry, restart recovery, explicit no-provider/expired state, operational alerts.

**11. [P1] Fake GPS aur stale online presence**

Evidence: [client/src/app/worker/dashboard/page.tsx:90](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/app/worker/dashboard/page.tsx:90).

Abhi: GPS fail hone par random Delhi coordinates emit hote hain. Disconnect sirf log hota hai; location freshness se dispatch filter nahi hota.

Badlav: Random fallback remove karo; permission/error UI, lastLocationAt/accuracy, heartbeat expiry, stale-worker exclusion, active-job recovery implement karo.

**12. [P1] Customer route abhi implemented nahi**

Evidence: [client/src/components/map/LeafletMap.tsx:77](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/components/map/LeafletMap.tsx:77).

Abhi: Map markers draw karta hai, road route nahi. ETA fixed straight-distance factor aur speed se calculate hota hai. Worker ke paas external Google Maps link hai.

Badlav: Road routing integration, route polyline, realistic ETA, last-updated label; initial location snapshot and reconnect refresh. 20 minutes ko availability-based target rakho.

**13. [P1] Socket reconnect aur screen changes unsafe/incomplete**

Evidence: [client/src/app/bookings/[id]/page.tsx:99](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/app/bookings/[id]/page.tsx:99).

Abhi: Room join effect reconnect par rerun nahi hota; room leave absent; location listener bookingId filter nahi karta. Worker cancellation/approval updates bhi dashboard ko reliably refresh nahi karte.

Badlav: On-connect authorized rejoin, leave old rooms, ID-filter events, named listener cleanup, server snapshot recovery, worker lifecycle subscriptions.

**14. [P1] Schedule aur coupon sirf screen/address text**

Evidence: [client/src/app/book/[slug]/page.tsx:157](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/app/book/[slug]/page.tsx:157).

Abhi: Schedule/coupon address mein append hote hain. Backend immediately dispatch karta hai; discount calculation persist/apply nahi hoti.

Badlav: scheduledAt/timezone/slot capacity, scheduled dispatch; server coupon eligibility, redemption limit and persisted discount. Implement hone tak controls remove/disable karo.

**15. [P1] Booking-time payment aur service details missing**

Evidence: [server/src/modules/bookings/bookings.controller.ts:15](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/bookings/bookings.controller.ts:15).

Abhi: Create payload mein category aur address only. Payment choice, advance payment, problem description, photos, selected task/quantity stored nahi. Rate card display-only hai.

Badlav: Structured booking details, address components, task selection, payment timing/method, estimate acceptance, advance and remaining balance add karo.

**16. [P1] Worker subscription module missing**

Evidence: [server/prisma/schema.prisma:66](C:/Users/91905/OneDrive/Desktop/ServZest/server/prisma/schema.prisma:66).

Abhi: Subscription plan, purchase, expiry, renewal, entitlements aur dispatch subscription checks nahi hain.

Badlav: Plan + subscription + payment events + renewal/expiry policy implement karo. Offer/accept dono par subscription eligibility check.

**17. [P1] Commission calculation hai, collection ledger nahi**

Evidence: [server/src/modules/worker/worker.controller.ts:382](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/worker/worker.controller.ts:382).

Abhi: Earnings totalAmount-platformFee se dikhte hain, lekin wallet/top-up/commission collection/payout/refund ledger nahi. Admin revenue completed unpaid jobs ko bhi count karta hai.

Badlav: Immutable ledger, per-booking unique fee entry, cash commission collection policy, online settlements, reversals, reconciliation. Collected/pending/earned amounts alag dikhao.

**18. [P1] Old bills current settings se change ho sakte hain**

Evidence: [server/src/services/pricing.service.ts:43](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/services/pricing.service.ts:43).

Abhi: Get/pay/complete current commission and surcharge settings use karte hain. Booking ke baad setting badalne se bill ya old receipt recalculate ho sakta hai. Night window server-local timezone use karta hai.

Badlav: Booking quote/rules snapshot, explicit Asia/Kolkata timezone, versioned approved changes, immutable finalized invoice. Money integer paise ya Decimal mein rakho.

**19. [P1] Extra approvals final bill ke baad badal sakte hain**

Evidence: [server/src/modules/bookings/bookings.controller.ts:252](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/bookings/bookings.controller.ts:252).

Abhi: approveItem booking active/PENDING state check nahi karta. Completed booking ke items mutate ho sakte hain. Completion pending approvals ignore karta hai.

Badlav: Only owning customer, only pending item, correct active state; pending requests settle/reject before finalization. Later adjustments separate records mein.

**20. [P1] Invoices paid status aur surcharges galat dikhate hain**

Evidence: [client/src/app/history/page.tsx:306](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/app/history/page.tsx:306).

Abhi: Invoice rates ko rupee amounts dikhata hai (e.g. 0.25 as rupees). Completed job invoice unconditional Paid via label dikhata hai, even without payment.

Badlav: Saved monetary line items, true payment status, unique invoice number, issuer details, advance/outstanding/refund fields; common invoice component.

**21. [P1] Professional onboarding operational nahi**

Evidence: [client/src/app/login/page.tsx:56](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/app/login/page.tsx:56).

Abhi: Normal signup role/name nahi bhejta, isliye naya user customer banta hai. KYC form ID number/skills only hai; photo/document upload aur verification evidence absent.

Badlav: Partner registration, profile/contact verification, private uploads, skill approval evidence, reviewer/reason/timestamp, suspension and re-verification workflow.

**22. [P1] Support form message save nahi karta**

Evidence: [client/src/app/contact/page.tsx:15](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/app/contact/page.tsx:15).

Abhi: Contact form sirf setSubmitted(true) karta hai. Backend complaint endpoint hai, par customer API helper/booking complaint UI wired nahi. SOS helpline ownership/staffing code se verify nahi hoti.

Badlav: Persistent support tickets, booking-linked complaint UI, admin queue/assignment, acknowledgement and resolution trail. Verified real support contacts configure karo.

**23. [P1] Input validation aur error handling gaps**

Evidence: [server/src/modules/admin/admin.controller.ts:246](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/admin/admin.controller.ts:246).

Abhi: Pricing updates Number() par depend hain, min/max/ownership guard nahi. Settings arbitrary keys/strings accept karte hain. Coordinates unbounded, stars/quantity noninteger accepted. Many Express 4 async handlers catch/next wrapper ke bina registered hain.

Badlav: Endpoint schemas, integer/range/length limits, typed settings allowlist, error middleware, safe Prisma error mapping, async wrapper and structured logs.

**24. [P1] Production deployment safeguards missing**

Evidence: [docker-compose.yml:3](C:/Users/91905/OneDrive/Desktop/ServZest/docker-compose.yml:3).

Abhi: Compose only local DB; default credentials and published DB port. Health always ok, DB readiness nahi. Runtime graceful shutdown, backup/restore procedure and CI configuration repo mein nahi.

Badlav: HTTPS deployment, private database, managed secrets, fail-fast production config, DB readiness, connection budget, migrations pipeline, backups with restore drill, monitoring and rollback.

**25. [P1] Known default JWT secret aur demo data safeguards**

Evidence: [server/src/config/index.ts:10](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/config/index.ts:10).

Abhi: Missing JWT_SECRET fallback known value use karta hai. Seed demo users/approved-online workers insert/reset karta hai aur existing pricing overwrite karta hai.

Badlav: Production startup missing secret par fail; separate explicit demo seeds and production catalog migrations. Demo admin shortcuts disable; secret files ignore pattern broaden.

**26. [P1] Next.js 14 unsupported line**

Evidence: [client/package.json](C:/Users/91905/OneDrive/Desktop/ServZest/client/package.json).

Abhi: Build mein installed Next.js 14.2.35 mila; official support policy 14.x ko unsupported list karti hai.

Badlav: Supported release par compatibility-tested upgrade, dependency advisories scan, pinned runtime and reproducible npm ci pipeline.

**27. [P1] Business-critical automated tests missing**

Evidence: [server/src/services/dispatch.service.test.ts:3](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/services/dispatch.service.test.ts:3).

Abhi: Existing 9 tests sirf pricing/night/cancellation math aur ETA cover karte hain; actual dispatch acceptance/concurrency, routes, sockets, database, payments aur UI nahi.

Badlav: Authorization, race, OTP, verified payment/replay, cash ledger, state transitions, PostGIS, reconnect, restart and full 3-role booking integration tests.

**28. [P2] Admin panels duplicated aur live map disconnected**

Evidence: [client/src/app/admin/dashboard/page.tsx:187](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/app/admin/dashboard/page.tsx:187).

Abhi: /admin aur /admin/dashboard alag features rakhte hain; login/mobile link old dashboard par jaate hain. liveWorkers fetched hai par map ko pass nahi hota.

Badlav: Single admin navigation: customers, professionals, bookings, live multi-worker map, pricing, subscriptions, ledger, complaints, staff roles and audit trail.

**29. [P2] Large lists aur polling scale nahi karenge**

Evidence: [server/src/modules/bookings/bookings.controller.ts:402](C:/Users/91905/OneDrive/Desktop/ServZest/server/src/modules/bookings/bookings.controller.ts:402).

Abhi: Bookings/workers/earnings all rows fetch karte hain; metrics aggregation application memory mein. Customer every 4 sec completed bookings bhi poll karta hai.

Badlav: Server pagination/search, database aggregates, relevant composite indexes (customer/time, worker/status, status/time), stopped/backoff polling and event-driven invalidation.

**30. [P2] Auth restore aur network errors user ko stuck chhodte hain**

Evidence: [client/src/context/AuthContext.tsx:33](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/context/AuthContext.tsx:33).

Abhi: Local saved user trusted for UI, boot par /me verification nahi. Protected pages isLoading wait nahi karte. Some non-success responses endless skeleton ya silent failure dete hain.

Badlav: Hydration-aware route guards, session validation, central 401 handling, session revocation, explicit loading/empty/error/retry states, request timeout/cancel.

**31. [P2] Address text aur coordinates mismatch**

Evidence: [client/src/app/book/[slug]/page.tsx:33](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/app/book/[slug]/page.tsx:33).

Abhi: Default Delhi address GPS change hone par update nahi hota. Typed address coordinate se link nahi hota; service area validation nahi.

Badlav: Confirmed map pin + geocoded address, flat/floor/landmark, location permission handling, city/zone serviceability checks and saved addresses.

**32. [P2] Public claims backend evidence se match nahi**

Evidence: [client/src/app/page.tsx:232](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/app/page.tsx:232).

Abhi: Testimonials/review totals hardcoded; 100% verification/safety and 24x7 support claims operational evidence se linked nahi. Cancellation wording FAQ/terms/modal/backend mein different.

Badlav: Only verified business facts publish karo; actual reviews and moderation, shared policy content; refund, warranty/revisit, dispute and privacy processes define and review.

**33. [P2] Accessibility aur UI maintainability**

Evidence: [client/src/app/layout.tsx:16](C:/Users/91905/OneDrive/Desktop/ServZest/client/src/app/layout.tsx:16).

Abhi: Zoom disabled. Worker buttons bg-primary use karte hain par theme mein brand palette only. Repeated large pages, any types and partial translation hain. Map teardown absent.

Badlav: Enable zoom, accessible dialogs/labels/keyboard focus, correct button colors, mobile QA, shared typed contracts and components, complete translations, map cleanup.

**Implementation order**

1. Security: real OTP, admin restrictions, ownership, socket authorization, response-field privacy and safe secrets.
2. Booking reliability: atomic worker reservation/state machine, durable dispatch, real GPS, reconnect and no-provider recovery.
3. Money: immutable pricing/invoice, booking advance versus cash choice, verified payments, refunds, ledger, subscription eligibility and reconciliation.
4. Operations: professional onboarding/verification, unified admin, support tickets, service areas and accurate public policies.
5. Release: integration tests, dependency upgrade, staging, HTTPS, monitoring, restore/rollback drill; phir limited service-area pilot.

**Aapke intended payment model ke liye proposed behavior**

- Booking par payment preference save ho. Online choice par server-authoritative quote/order ke against actual payment verify ho; cash choice par amount pending rahe.
- Booking-time payment ko advance ke roop mein record karo jab final repair amount abhi unknown ho. Extra parts/labor approval ke baad remaining balance nikle.
- Service completion, customer acceptance aur money received separate facts hon. Cash receipt professional record kare aur discrepancy customer report kar sake.
- Commission sirf arithmetic display na ho: har booking se ledger entry linked ho. Cash ke liye agreed credit/prepaid balance policy; online ke liye provider settlement and payout reconciliation.
- Subscription purchase/expiry har offer aur acceptance ke eligibility checks mein ho. No-work guarantees ya renewals ki conditions clearly define karo.

**Minimum acceptance scenarios before pilot**

- Customer A cannot view/cancel/pay/rate/approve customer B booking; worker cannot read start OTP or others' rooms; customer cannot read professional ID documents.
- Public registration cannot create ADMIN. Expired/reused OTP and repeated guesses fail; disabled account/token access is revoked.
- Two professionals race one booking: exactly one wins. One professional races two bookings: at most one active assignment. Expired/unoffered/wrong-skill/rejected-KYC acceptance fails.
- Cancel versus accept/arrive/start/complete race has one consistent outcome; terminal booking cannot be reopened by stale request.
- Restart during dispatch resumes offers or returns a clear failure. No workers gives actionable terminal/retry behavior.
- GPS denied never fabricates location. Disconnect/reconnect restores only authorized rooms and current state; old booking events never alter a different booking screen.
- Invalid/replayed/out-of-order payment events never create fake payment or duplicate commission; partial advance, top-up and refund reconcile to the ledger.
- Price setting update cannot alter an accepted quote or finalized invoice. Pending item approvals cannot change a completed bill.
- Cash marked pending stays unpaid until confirmed; invoice, earnings and company collection reports agree.
- Scheduled booking dispatches at intended local time; coupon server-side total matches checkout and invoice.
- New professional can register, submit evidence, be reviewed, subscribe and receive a real job. Expired subscription blocks new work per policy.
- Customer complaint reaches admin queue. Backup restores into staging; rollback and operational incident response are exercised.

**Technical references verified**

- Supported production framework selection: Next.js currently lists 16.x Active LTS, 15.x Maintenance LTS and 14.x unsupported. [Official support policy](https://nextjs.org/support-policy).
- Socket.IO supports handshake middleware authentication; room subscriptions must be authorized by the application. [Official middleware documentation](https://socket.io/docs/v4/middlewares/).
- Socket rooms are left on disconnection; application reconnect behavior needs restoration. [Official rooms documentation](https://socket.io/docs/v4/rooms/).

Legal/company registration, identity-verification permissions, taxation and payment-provider onboarding requirements require a separate review for your actual business arrangement. This audit does not claim those are already satisfied or prescribe specific legal obligations.
