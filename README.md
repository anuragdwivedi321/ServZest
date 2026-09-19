# QuickKaam (क्विककाम) ⚡
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
- **Client**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Lucide Icons + Leaflet (OpenStreetMap)
- **Server**: Node.js + Express + TypeScript + Socket.io + Prisma ORM
- **Database**: PostgreSQL 16 with PostGIS 3.4 (`postgis/postgis:16-3.4`)
- **Testing**: Jest + ts-jest

---

## 📦 Project Setup & Running

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

# Seed 1 Admin, 10 Multi-Skilled PostGIS Workers, 5 Services with Rate Cards, 2 Demo Customers, and Admin Settings
npm run seed

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

# Start Next.js mobile-first PWA (port 3000)
npm run dev
```
Open `http://localhost:3000` in your mobile browser or desktop.

---

## 🧪 Testing Tools & Worker Simulator

### Automated Unit Tests
Run the test suites covering pricing calculations, night surcharges, rush caps, cancellation rules, and dispatch ETA:
```bash
cd server
npm test
```

### GPS Worker Simulator
To test live worker movement towards a customer without a physical mobile device:
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
| **Admin** | QuickKaam Admin | `9999999999` | Marketplace Administrator |
