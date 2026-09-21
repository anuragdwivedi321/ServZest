// Development-only UI fixture. Never transfer money using the intentionally invalid UPI address.
require('dotenv').config();
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const file = '.payment-preview.json';
(async()=>{try {
 if (process.env.NODE_ENV === 'production') throw new Error('Development only');
 if(process.argv[2]==='route-refresh'){
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  await db.workerProfile.updateMany({where:{userId:{in:data.userIds},user:{name:'ServZest UI test fixture'}},data:{lastLocationAt:new Date()}});
  console.log('Test GPS refreshed');return;
 }
 if (process.argv[2] === 'cleanup') {
   const data=JSON.parse(fs.readFileSync(file,'utf8'));
   const users=await db.user.findMany({where:{id:{in:data.userIds}}});
   if(users.some(u=>u.name!=='ServZest UI test fixture')) throw new Error('Fixture identity mismatch');
   const where={customerId:{in:data.userIds}};
   await db.payment.deleteMany({where:{booking:where}});await db.bookingItem.deleteMany({where:{booking:where}});await db.booking.deleteMany({where});await db.workerProfile.deleteMany({where:{userId:{in:data.userIds}}});await db.user.deleteMany({where:{id:{in:data.userIds}}});fs.unlinkSync(file);console.log('Preview fixtures cleaned');return;
 }
 if(fs.existsSync(file))throw new Error('Clean previous preview first');
 const routePreview=process.argv[2]==='route';
 const phone='9'+String(Date.now()).slice(-9);
 const customer=await db.user.create({data:{phone,name:'ServZest UI test fixture',role:'CUSTOMER'}});
 const workerUser=await db.user.create({data:{phone:'preview-worker-'+Date.now(),name:'ServZest UI test fixture',role:'WORKER'}});
 fs.writeFileSync(file,JSON.stringify({userIds:[customer.id,workerUser.id]}));
 const worker=await db.workerProfile.create({data:{userId:workerUser.id,skills:[],upiId:'preview@invalid',upiName:'TEST ONLY - DO NOT PAY'}});
 const service=await db.service.findUniqueOrThrow({where:{slug:'plumber'}});
 const booking=await db.booking.create({data:{customerId:customer.id,workerId:worker.id,serviceId:service.id,pickupLat:0,pickupLng:0,pickupAddress:'Test location - no visit requested',startOtp:'1234',status:'COMPLETED',completedAt:new Date(),baseVisitCharge:149,totalAmount:149,pricingSnapshot:{nightSurgeRate:0,rushSurgeRate:1,commissionPct:15}}});
 if(routePreview){ await db.booking.update({where:{id:booking.id},data:{status:'EN_ROUTE',completedAt:null,pickupLat:28.628,pickupLng:77.435,pickupAddress:'Public ABES-area route test - no visit requested'}}); await db.$executeRaw`UPDATE worker_profiles SET current_location=ST_SetSRID(ST_MakePoint(77.4458036,28.6337977),4326)::geography,last_location_at=NOW() WHERE id=${worker.id}`; }
 console.log(JSON.stringify({phone,bookingUrl:`http://localhost:3001/bookings/${booking.id}`}));
} finally {await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
