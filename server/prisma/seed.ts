import { PrismaClient, Role, KycStatus } from '@prisma/client';

const prisma = new PrismaClient();

const CITY_LAT = parseFloat(process.env.DEFAULT_LAT || '28.6139');
const CITY_LNG = parseFloat(process.env.DEFAULT_LNG || '77.2090');

async function main() {
  console.log('Seeding ServZest database...');

  // 1. Seed Admin Settings
  console.log('Seeding admin_settings...');
  const settings = [
    { key: 'platform_commission_pct', value: '15', description: 'Platform commission percentage' },
    { key: 'cancel_fee_after_grace', value: '40', description: 'Cancellation fee after 2 min grace period (Rs)' },
    { key: 'cancel_grace_period_sec', value: '120', description: 'Free cancellation window (seconds)' },
    { key: 'rush_surge_cap', value: '1.5', description: 'Maximum rush hour surge multiplier' },
    { key: 'rush_surge_multiplier', value: '1.0', description: 'Active rush hour surge multiplier' },
    { key: 'night_charge_pct', value: '25', description: 'Night charge surcharge percentage (10 PM to 6 AM)' },
    { key: 'max_dispatch_radius_meters', value: '5000', description: 'Worker search radius in meters' },
    { key: 'max_eta_minutes', value: '20', description: 'Maximum allowed worker ETA in minutes' },
    { key: 'worker_dispatch_timeout_sec', value: '30', description: 'Timeout per worker request (seconds)' },
    { key: 'subscription_required', value: '0', description: 'Set to 1 after production subscription billing is configured' },
  ];

  for (const s of settings) {
    await prisma.adminSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }
  await prisma.subscriptionPlan.upsert({
    where: { id: '00000000-0000-4000-8000-000000000030' },
    update: { name: 'Professional Monthly', price: 299, durationDays: 30, isActive: true },
    create: { id: '00000000-0000-4000-8000-000000000030', name: 'Professional Monthly', price: 299, durationDays: 30 },
  });

  // 2. Seed Services & Rate Card
  console.log('Seeding services & rate card items...');
  const servicesData = [
    {
      slug: 'electrician',
      nameEn: 'Electrician',
      nameHi: 'बिजली मिस्त्री (इलेक्ट्रीशियन)',
      icon: 'Zap',
      visitCharge: 99.0,
      items: [
        { nameEn: 'Fan / Switch fix', nameHi: 'पंखा / स्विच मरम्मत', unit: 'job', minPrice: 149, maxPrice: 249 },
        { nameEn: 'MCB / Wiring point', nameHi: 'MCB / वायरिंग पॉइंट', unit: 'job', minPrice: 199, maxPrice: 399 },
        { nameEn: 'Geyser / Inverter install', nameHi: 'गीजर / इन्वर्टर स्थापना', unit: 'job', minPrice: 349, maxPrice: 599 },
      ],
    },
    {
      slug: 'plumber',
      nameEn: 'Plumber',
      nameHi: 'प्लम्बर (नलसाज़)',
      icon: 'Wrench',
      visitCharge: 99.0,
      items: [
        { nameEn: 'Tap / Shower repair', nameHi: 'नल / फव्वारा मरम्मत', unit: 'job', minPrice: 149, maxPrice: 299 },
        { nameEn: 'Leakage / Pipe repair', nameHi: 'पाइप रिसाव मरम्मत', unit: 'job', minPrice: 249, maxPrice: 499 },
        { nameEn: 'Motor / Tank fitting', nameHi: 'मोटर / टंकी फिटिंग', unit: 'job', minPrice: 399, maxPrice: 699 },
      ],
    },
    {
      slug: 'majdoor',
      nameEn: 'Laborer (Majdoor)',
      nameHi: 'मजदूर (सहायक)',
      icon: 'HardHat',
      visitCharge: 99.0,
      items: [
        { nameEn: 'Hourly labor (min 2 hrs)', nameHi: 'प्रति घंटा मजदूरी (न्यूनतम 2 घंटे)', unit: 'per hour', minPrice: 150, maxPrice: 150 },
        { nameEn: 'Half day labor (4 hrs)', nameHi: 'आधा दिन (4 घंटे)', unit: '4 hours', minPrice: 550, maxPrice: 550 },
        { nameEn: 'Full day labor (8 hrs)', nameHi: 'पूरा दिन (8 घंटे)', unit: '8 hours', minPrice: 1000, maxPrice: 1000 },
      ],
    },
    {
      slug: 'mechanic',
      nameEn: 'Mechanic',
      nameHi: 'मैकेनिक',
      icon: 'Cog',
      visitCharge: 99.0,
      items: [
        { nameEn: 'Puncture repair (Bike)', nameHi: 'पंचर मरम्मत (बाइक)', unit: 'job', minPrice: 60, maxPrice: 100 },
        { nameEn: 'Puncture repair (Car)', nameHi: 'पंचर मरम्मत (कार)', unit: 'job', minPrice: 149, maxPrice: 149 },
        { nameEn: 'Jump-start (Bike)', nameHi: 'जंप-स्टार्ट (बाइक)', unit: 'job', minPrice: 199, maxPrice: 199 },
        { nameEn: 'Jump-start (Car)', nameHi: 'जंप-स्टार्ट (कार)', unit: 'job', minPrice: 299, maxPrice: 299 },
        { nameEn: 'Basic bike service', nameHi: 'सामान्य बाइक सर्विस', unit: 'job', minPrice: 399, maxPrice: 599 },
        { nameEn: 'Towing service', nameHi: 'टोइंग सेवा', unit: 'per km', minPrice: 25, maxPrice: 40 },
      ],
    },
    {
      slug: 'ac',
      nameEn: 'AC Technician',
      nameHi: 'एसी तकनीशियन',
      icon: 'AirVent',
      visitCharge: 199.0,
      items: [
        { nameEn: 'Jet wash service', nameHi: 'जेट वॉश सर्विस', unit: 'job', minPrice: 499, maxPrice: 699 },
        { nameEn: 'Gas refill', nameHi: 'गैस रीफिल', unit: 'job', minPrice: 1500, maxPrice: 2500 },
        { nameEn: 'AC Installation / Uninstallation', nameHi: 'एसी फिटिंग / हटाना', unit: 'job', minPrice: 1200, maxPrice: 1800 },
      ],
    },
  ];

  const serviceMap = new Map<string, string>();

  for (const s of servicesData) {
    const service = await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
        nameEn: s.nameEn,
        nameHi: s.nameHi,
        icon: s.icon,
        visitCharge: s.visitCharge,
      },
      create: {
        slug: s.slug,
        nameEn: s.nameEn,
        nameHi: s.nameHi,
        icon: s.icon,
        visitCharge: s.visitCharge,
      },
    });

    serviceMap.set(s.slug, service.id);

    // Delete existing items to avoid duplicates
    await prisma.serviceItem.deleteMany({ where: { serviceId: service.id } });

    for (const item of s.items) {
      await prisma.serviceItem.create({
        data: {
          serviceId: service.id,
          nameEn: item.nameEn,
          nameHi: item.nameHi,
          unit: item.unit,
          minPrice: item.minPrice,
          maxPrice: item.maxPrice,
        },
      });
    }
  }

  if (process.env.SEED_DEMO_DATA !== 'true') {
    console.log('Catalog/settings seeded. Demo accounts skipped (set SEED_DEMO_DATA=true only in a local development database).');
    return;
  }

  // 3. Seed Admin
  console.log('Seeding admin user...');
  await prisma.user.upsert({
    where: { phone: '9999999999' },
    update: { name: 'ServZest Admin', role: Role.ADMIN },
    create: { phone: '9999999999', name: 'ServZest Admin', role: Role.ADMIN },
  });

  // 4. Seed Demo Customers
  console.log('Seeding demo customers...');
  await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: { name: 'Rahul Sharma', role: Role.CUSTOMER },
    create: { phone: '9876543210', name: 'Rahul Sharma', role: Role.CUSTOMER },
  });
  await prisma.user.upsert({
    where: { phone: '9876543211' },
    update: { name: 'Pooja Verma', role: Role.CUSTOMER },
    create: { phone: '9876543211', name: 'Pooja Verma', role: Role.CUSTOMER },
  });

  // 5. Seed 10 Demo Workers around Delhi Center
  console.log('Seeding 10 demo workers with PostGIS coordinates...');
  const workersData = [
    {
      name: 'Ramesh Kumar',
      phone: '9811100001',
      skills: ['Fan Repair', 'Wiring', 'Switch Board'],
      vehicle: 'Hero Splendor (DL 1S AB 1234)',
      services: ['electrician'],
      latOffset: 0.005, // ~550m North
      lngOffset: 0.004, // ~400m East
      rating: 4.9,
      totalRatings: 124,
    },
    {
      name: 'Suresh Yadav',
      phone: '9811100002',
      skills: ['Pipe Fitting', 'Leakage Detection', 'Tap Repair'],
      vehicle: 'Honda Activa (DL 3S CD 5678)',
      services: ['plumber'],
      latOffset: -0.007, // ~770m South
      lngOffset: 0.006,  // ~600m East
      rating: 4.8,
      totalRatings: 88,
    },
    {
      name: 'Mukesh Pal',
      phone: '9811100003',
      skills: ['Electrician', 'Plumbing'],
      vehicle: 'Bajaj Pulsar (DL 4S EF 9012)',
      services: ['electrician', 'plumber'], // Multi-skilled worker!
      latOffset: 0.009, // ~1.0 km North
      lngOffset: -0.008, // ~800m West
      rating: 4.95,
      totalRatings: 210,
    },
    {
      name: 'Santosh Mishra',
      phone: '9811100004',
      skills: ['Construction Support', 'Shifting', 'Loading'],
      vehicle: 'Bicycle',
      services: ['majdoor'],
      latOffset: -0.012, // ~1.3 km South
      lngOffset: -0.005,
      rating: 4.7,
      totalRatings: 65,
    },
    {
      name: 'Vijay Verma',
      phone: '9811100005',
      skills: ['Bike Mechanic', 'Puncture Repair', 'Towing'],
      vehicle: 'TVS Apache (DL 7S GH 3456)',
      services: ['mechanic'],
      latOffset: 0.003, // ~330m North
      lngOffset: -0.011, // ~1.1 km West
      rating: 4.85,
      totalRatings: 142,
    },
    {
      name: 'Imran Khan',
      phone: '9811100006',
      skills: ['AC Jet Wash', 'Gas Refill', 'AC PCB Repair'],
      vehicle: 'Honda Shine (DL 8S IJ 7890)',
      services: ['ac'],
      latOffset: -0.004,
      lngOffset: 0.012, // ~1.2 km East
      rating: 4.9,
      totalRatings: 178,
    },
    {
      name: 'Deepak Sharma',
      phone: '9811100007',
      skills: ['AC Fitting', 'Inverter Wiring', 'Geyser Installation'],
      vehicle: 'Suzuki Access (DL 9S KL 2345)',
      services: ['ac', 'electrician'], // Multi-skilled
      latOffset: 0.014, // ~1.5 km North
      lngOffset: 0.007,
      rating: 4.75,
      totalRatings: 96,
    },
    {
      name: 'Anil Chauhan',
      phone: '9811100008',
      skills: ['Plumbing', 'Tank Cleaning'],
      vehicle: 'Hero HF Deluxe (DL 2S MN 6789)',
      services: ['plumber'],
      latOffset: -0.015, // ~1.6 km South
      lngOffset: 0.010,
      rating: 4.8,
      totalRatings: 112,
    },
    {
      name: 'Ramvilas Paswan',
      phone: '9811100009',
      skills: ['Manual Labor', 'Gardening', 'Demolition'],
      vehicle: 'None',
      services: ['majdoor'],
      latOffset: 0.008,
      lngOffset: 0.016, // ~1.6 km East
      rating: 4.85,
      totalRatings: 83,
    },
    {
      name: 'Mohd. Salim',
      phone: '9811100010',
      skills: ['Car Battery Jump-start', 'Car Puncture', 'Bike Service'],
      vehicle: 'Maruti Omni Utility (DL 1V OP 4321)',
      services: ['mechanic'],
      latOffset: -0.010,
      lngOffset: -0.014, // ~1.5 km West
      rating: 4.92,
      totalRatings: 320,
    },
  ];

  for (const w of workersData) {
    // 1. Create or update user
    const user = await prisma.user.upsert({
      where: { phone: w.phone },
      update: { name: w.name, role: Role.WORKER },
      create: { phone: w.phone, name: w.name, role: Role.WORKER },
    });

    // 2. Create or update worker profile
    const profile = await prisma.workerProfile.upsert({
      where: { userId: user.id },
      update: {
        skills: w.skills,
        vehicleType: w.vehicle,
        kycStatus: KycStatus.APPROVED,
        isOnline: true,
        isBusy: false,
        rating: w.rating,
        totalRatings: w.totalRatings,
        aadhaarNumber: 'XXXX-XXXX-1234',
        photoUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${w.phone}`,
      },
      create: {
        userId: user.id,
        skills: w.skills,
        vehicleType: w.vehicle,
        kycStatus: KycStatus.APPROVED,
        isOnline: true,
        isBusy: false,
        rating: w.rating,
        totalRatings: w.totalRatings,
        aadhaarNumber: 'XXXX-XXXX-1234',
        photoUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${w.phone}`,
      },
    });

    // 3. Set PostGIS geography location
    const workerLat = CITY_LAT + w.latOffset;
    const workerLng = CITY_LNG + w.lngOffset;

    await prisma.$executeRaw`
      UPDATE worker_profiles
      SET current_location = ST_SetSRID(ST_MakePoint(${workerLng}, ${workerLat}), 4326)::geography
      WHERE id = ${profile.id}
    `;

    // 4. Link worker_services (Many-to-Many)
    await prisma.workerService.deleteMany({ where: { workerId: profile.id } });
    for (const slug of w.services) {
      const serviceId = serviceMap.get(slug);
      if (serviceId) {
        await prisma.workerService.create({
          data: {
            workerId: profile.id,
            serviceId,
          },
        });
      }
    }
  }

  console.log('Seeding complete! Database successfully initialized.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
