# ServZest (सर्वज़ेस्ट) ⚡
> **MVP of an On-Demand Home Services Marketplace for India** (Electricians, Plumbers, Laborers/Majdoor, Mechanics, and AC Technicians) — inspired by Rapido & Urban Company.

The nearest available verified worker reaches within **~20 minutes** at fair, transparent, and pre-estimated pricing.

---

## 🚀 Key Features

### 1. Customer (Mobile-First PWA)
- **Phone OTP Login**: Simple mobile authentication with dev mock code `123456`.
- **Bilingual Interface**: Seamless Hindi (हिन्दी) & English toggle.
- **Service Catalog & Transparent Rate Card**:
  - **Electrician**: Fan/switch fix (₹149-249), MCB/wiring point (₹199-399), Geyser/inverter install (₹349-599).
  - **Plumber**: Tap/shower repair (₹149-299), Leakage/pipe repair (₹249-499), Motor/tank fitting (₹399-699).
  - **Majdoor (Laborer)**: Hourly labor (₹150/hr, min 2 hrs), Half day (4h, ₹550), Full day (8h, ₹1000).
  - **Mechanic**: Bike puncture (₹60-100), Car puncture (₹149), Bike jump-start (₹199), Car jump-start (₹299), Bike service (₹399-599), Towing (₹25-40/km).
  - **AC Technician**: Jet wash (₹499-699), Gas refill (₹1500-2500), Installation/uninstallation (₹1200-1800).
- **Location Picker**: Free Leaflet + OpenStreetMap pin picker with draggable marker and GPS.
- **Pre-Booking Price Breakdown**: Base visit fee (₹99 / ₹199 for AC) + Night surcharge (+25% between 10 PM - 6 AM) + Rush hour surge (hard cap 1.5x).
- **Live Status & Real-time Tracking**:
  - `SEARCHING` $\rightarrow$ `ASSIGNED` $\rightarrow$ `EN_ROUTE` $\rightarrow$ `ARRIVED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` (or `CANCELLED`).
  - Moving worker marker on Leaflet map with live ETA calculation.
- **4-Digit Start OTP**: Prominently displayed to customer, shared with worker on arrival to begin the job safely.
- **In-App Extra Work / Parts Approval**: Worker can request extra work or replacement parts; customer receives instant alert to **Approve** or **Reject** before it is added to the bill.
- **Payment & Rating**: Pay via Cash or UPI, rate 1 to 5 stars with written feedback.
- **Cancellation Policy**: Free within 2 minutes of assignment; ₹40 fee afterwards. If cancelled after arrival, the fee goes to the worker as compensation.

### 2. Worker Console
- **Online / Offline Toggle**: Workers control their availability.
- **GPS Telemetry**: Emits real-time location every 5-10 seconds via Socket.io.
- **Sequential 30-Second Dispatch**:
  - PostGIS `ST_DWithin` finds workers within 5 km radius with ETA $\le$ 20 min (using 1.3 road winding factor and 25 km/h urban speed).
  - Sends job request to **one worker at a time** with a 30-second countdown.
  - If rejected or timed out, automatically advances to the next nearest candidate.
- **Active Job Workflow**:
  - One-tap "Navigate" button opening Google Maps directions.
  - "I Have Arrived" status transition.
  - Customer 4-digit start OTP verification before starting work.
  - Add extra work / parts with description and price.
  - Mark completed to finalize the bill and free worker for new jobs.
- **Earnings Dashboard**: Today and weekly earnings with platform commission deducted.

### 3. Admin Panel
- **Live Worker Map**: Real-time view of all online and busy workers around the city center.
- **KYC Review & Approvals**: Approve or reject worker Aadhaar and skill submissions.
- **Dynamic Marketplace Settings**: Stored in `admin_settings` table (not hardcoded):
  - Platform commission percentage (default: 15%)
  - Cancellation fee (default: ₹40) and grace period (120s)
  - Rush hour surge multiplier and hard cap (1.5x)
  - Night surcharge percentage (25%)
- **Emergency Cancellation**: Admins can cancel any booking, even when `IN_PROGRESS`.

---

## 🛠️ Tech Stack

- **Monorepo**: `/client` and `/server`
- **Client**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS + Lucide Icons + Leaflet (OpenStreetMap)
- **Server**: Node.js + Express + TypeScript + Socket.io + Prisma ORM
- **Database**: PostgreSQL 16 with PostGIS 3.4 (`postgis/postgis:16-3.4`)
- **Testing**: Jest + ts-jest

---

## 📦 Project Setup & Running

### Daily development (automatic updates)

After installing client/server dependencies and configuring the database below, run
`npm run dev` from the **ServZest root folder** to start both servers together.
On Windows, you can instead double-click **Start-ServZest.cmd**.

Open http://localhost:3001 and keep the development terminal running. Saving frontend
files automatically updates the page; backend changes restart the API watcher.
There is no need to run `cd client` or restart the servers after each edit.
Press **Ctrl+C** to stop both servers. If the terminal is closed or the PC restarts,
start the launcher again. The database must also be running for booking features.

### 1. Database (PostgreSQL + PostGIS)
Start the PostGIS container with Docker Compose:
```bash
docker compose up -d
```

*(Note: Docker image `postgis/postgis:16-3.4` automatically provides PostGIS extensions).*

### 2. Server Setup & Seeding
In the `/server` directory:
```bash
cd server
npm install

# Run database migrations (creates PostGIS extension & GiST index)
npm run prisma:migrate

# Seed catalog/settings only (safe default)
npm run seed

# Local fixture accounts only; never enable this against production
$env:SEED_DEMO_DATA='true'; npm run seed

# Run unit tests (Pricing & Dispatch logic)
npm test

# Start the server (port 4000)
npm run dev
```

### 3. Client Setup
In the `/client` directory:
```bash
cd client
npm install

# Start Next.js mobile-first PWA (the root launcher uses port 3001)
npm run dev
```
Open `http://localhost:3001` when using the root launcher. Running the client package by itself uses Next.js's default port unless you pass `--port`.

---

## 🧪 Testing Tools & Worker Simulator

### Booking checkout

Checkout saves selected tasks, a manually confirmed map pin and full address, optional problem details, coupon, and schedule. Selected tasks use the listed starting price; extra work requires approval. `WELCOME50` applies to a customer's first booking (cancelled and unmatched bookings do not consume eligibility). Its discount reduces the labor amount before commission.

Slots use India time, require at least 30 minutes' notice, and cover the next seven days. Scheduled bookings remain `SCHEDULED` until their window starts. The running API checks due bookings every ten seconds and then starts matching. An exhausted search becomes `NO_PROVIDER`; a customer can make a fresh booking. This scheduler requires the API to stay running and currently targets a single server process.

Cash or professional UPI QR can be used after service. Customer-reported payments remain pending until the assigned professional confirms receipt. A payment gateway and automatic bank verification are not configured. See `IMPLEMENTATION_STATUS.md` for the current flows and remaining business launch requirements; the older `PRODUCTION_READINESS_AUDIT.md` is the original audit snapshot.

For an integration check against the configured **development database**, keep the API running, then run `node scripts/checkout-smoke.cjs` from `server`. It creates isolated fixture customers, tests pricing, concurrent retries, ownership, cancellation and scheduled dispatch, and removes only its own records.

### Automated Unit Tests
Run the test suites covering pricing calculations, night surcharges, rush caps, cancellation rules, and dispatch ETA:
```bash
cd server
npm test
```

### GPS Worker Simulator
To test live worker movement towards a customer without a physical mobile device:
Set `WORKER_TOKEN` in your terminal to a development worker's login token. The worker ID must belong to that token; unauthenticated simulations are rejected.
```bash
cd server
npm run simulate:worker <workerId> <startLat> <startLng> <destLat> <destLng>
```
*Example (moves worker smoothly towards Connaught Place):*
```bash
npm run simulate:worker simulated-worker-1 28.6250 77.2180 28.6139 77.2090
```

---

## 👤 Pre-Seeded Demo Accounts (Mock OTP: `123456`)

| Role | Name | Phone Number | Description |
|---|---|---|---|
| **Customer** | Rahul Sharma | `9876543210` | Standard customer profile |
| **Customer** | Pooja Verma | `9876543211` | Standard customer profile |
| **Worker** | Ramesh Kumar | `9811100001` | Electrician (Hero Splendor) |
| **Worker** | Suresh Yadav | `9811100002` | Plumber (Honda Activa) |
| **Worker** | Mukesh Pal | `9811100003` | Multi-skilled: Electrician + Plumber |
| **Worker** | Vijay Verma | `9811100005` | Mechanic (TVS Apache) |
| **Worker** | Imran Khan | `9811100006` | AC Technician (Honda Shine) |
| **Admin** | ServZest Admin | `9999999999` | Marketplace Administrator |

### Address search and location selection
Booking now supports debounced address suggestions, selecting a suggestion, map clicks, dragging the pin, selecting the map centre, and browser GPS. Pin selection fills a nearby address when available; customers add house/flat details and confirm the location. Search failures leave manual map/address selection available.

The Next.js `/api/locations` route uses Photon with an 8-second timeout and a bounded five-minute cache. Optional server-only `PHOTON_URL` in `client/.env.local` selects a dedicated Photon instance. The default public demo is suitable for reasonable development usage, has no availability guarantee, and should be replaced with a dedicated service before significant production traffic: https://github.com/komoot/photon . Address search text and reverse-lookup coordinates are sent to this provider; house/flat details entered separately are not sent by the picker. GPS requires browser permission and HTTPS (localhost is supported).

### Road route tracking
Accepted bookings now show an OSRM road polyline, road distance (m/km), estimated driving minutes and latest GPS time between the assigned professional and the booked service pin. The authenticated booking API refreshes this from fresh GPS; the existing socket moves the marker. Missing/stale GPS and routing failure have explicit waiting/unavailable states. Completion/cancellation stops the travel display. ETA does not include live traffic.

Set `OSRM_URL` in `server/.env` to a dedicated OSRM-compatible routing endpoint for production; the default is `https://router.project-osrm.org`. The routing provider receives the two coordinates, not account names or phones. Requests have a five-second timeout, concurrent deduplication and a bounded 30-second cache. Provider reference: https://project-osrm.org/docs/v5.24.0/api/ . A production routing service and real-device field testing remain necessary.

### Mobile preview on the same Wi-Fi
Run `Start-ServZest.cmd` or root `npm run dev`; website listens on port 3001 and the launcher prints LAN URLs. API/auth/socket requests now use the website origin, forwarded internally to `BACKEND_URL` (default http://127.0.0.1:4000). Socket.IO uses polling through the proxy. `NEXT_PUBLIC_API_URL` is no longer used. Only the website port needs LAN access; no backend firewall opening is required.

Both devices must be on a network that permits device-to-device traffic. Campus/guest Wi-Fi may isolate clients. Windows firewall access requires an explicitly approved rule for the intended network scope. Phone GPS requires a trusted HTTPS origin; plain LAN HTTP supports manual address selection but not full live GPS testing. Do not expose development mock login publicly to obtain HTTPS; use a secured deployment with real authentication or a trusted private HTTPS setup.

### Sequential backend checks
With the development API running, use `npm --prefix server run verify:backend`. It checks one module at a time and stops on the first failed stage; it writes the stage results to `server/backend-verification.json`. Integration stages create and delete their own development fixtures. Never point these tests at a live business database.
