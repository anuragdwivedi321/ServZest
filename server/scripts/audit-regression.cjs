require('dotenv').config();
const {PrismaClient}=require('@prisma/client');
const jwt=require('jsonwebtoken');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
const db=new PrismaClient(), users=[], bookingIds=[];
let service;
let checks=0;
async function call(path,token,body,status=200,method){
 const r=await fetch('http://127.0.0.1:4000'+path,{method:method||(body===undefined?'GET':'POST'),headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
 const data=await r.json();assert.equal(r.status,status,`${path}: ${JSON.stringify(data)}`);checks++;return data;
}
(async()=>{try{
 for(const role of ['CUSTOMER','WORKER','ADMIN'])users.push(await db.user.create({data:{phone:`audit-${randomUUID()}`,name:'Audit fixture',role}}));
 const tokens=users.map(u=>jwt.sign({id:u.id,role:u.role,phone:u.phone},process.env.JWT_SECRET||'servzest-super-secret-jwt-key-change-in-prod',{expiresIn:'10m'}));
 service=await db.service.create({data:{slug:`audit-${randomUUID()}`,nameEn:'Audit fixture',nameHi:'Audit fixture',icon:'test',visitCharge:99,items:{create:{nameEn:'Task',nameHi:'Task',minPrice:100,maxPrice:200}}},include:{items:true}});
 const worker=await db.workerProfile.create({data:{userId:users[1].id,skills:[],kycStatus:'PENDING',identityLast4:'0000',identityMethod:'SELF_DECLARED_LAST4',services:{create:{serviceId:service.id}}}});
 await call('/api/worker/toggle-online',tokens[1],{isOnline:true},400);
 await call(`/api/admin/workers/${worker.id}/kyc`,tokens[2],{status:'APPROVED'});
 await call('/api/worker/toggle-online',tokens[1],{isOnline:true});
 await call(`/api/admin/services/${service.id}`,tokens[2],{visitCharge:123,items:[{id:service.items[0].id,minPrice:80,maxPrice:150}]},200,'PUT');
 await call(`/api/admin/services/${service.id}`,tokens[2],{visitCharge:999,items:[{id:randomUUID(),minPrice:80,maxPrice:150}]},400,'PUT');
 assert.equal((await db.service.findUnique({where:{id:service.id}})).visitCharge,123);
 await call(`/api/admin/workers/${randomUUID()}/kyc`,tokens[2],{status:'APPROVED'},404);
 await call('/api/admin/workers/not-an-id/kyc',tokens[2],{status:'APPROVED'},400);
 await call(`/api/support/${randomUUID()}`,tokens[2],{status:'RESOLVED',resolution:'test'},404,'PATCH');
 await call('/api/admin/workers?kycStatus=INVALID',tokens[2],undefined,400);
 await call('/api/admin/settings',tokens[2],{settings:{unknown_setting:10}},400,'PUT');
 for(const path of ['metrics','workers','bookings','complaints','services','customers','live-workers','settings']) {
  const result=await call('/api/admin/'+path,tokens[2]);
  if(path==='workers'){assert.equal(result.workers[0].aadhaarNumber,undefined);assert.equal(result.workers[0].identityLast4,undefined);assert.match(result.workers[0].maskedAadhaar,/^XXXX XXXX \d{4}$/);}
 }
 const b=await db.booking.create({data:{customerId:users[0].id,workerId:worker.id,serviceId:service.id,status:'EN_ROUTE',pickupLat:0,pickupLng:0,pickupAddress:'Isolated audit test',startOtp:'1234'}});bookingIds.push(b.id);
 await db.$executeRaw`UPDATE worker_profiles SET current_location=ST_SetSRID(ST_MakePoint(0,0),4326)::geography,last_location_at=NOW() WHERE id=${worker.id}`;
 const fresh=await call(`/api/bookings/${b.id}`,tokens[0]);assert.equal(fresh.workerLocation.lat,0);assert.equal(fresh.workerLocation.lng,0);
 await db.workerProfile.update({where:{id:worker.id},data:{lastLocationAt:new Date(Date.now()-180000)}});
 assert.equal((await call(`/api/bookings/${b.id}`,tokens[0])).workerLocation,null);
 await db.workerProfile.update({where:{id:worker.id},data:{isBusy:true}});
 await call('/api/worker/kyc',tokens[1],{identityLast4:'0000',consentAccepted:true,skills:[],serviceIds:[service.id]},409);
 await db.user.update({where:{id:users[2].id},data:{role:'CUSTOMER'}});
 await call('/api/admin/metrics',tokens[2],undefined,403);
 await db.user.delete({where:{id:users[2].id}});
 await call('/api/auth/me',tokens[2],undefined,401);
 console.log(`PASS: ${checks} API checks plus assertions: KYC gating, admin reads, pricing rollback, validation, fresh/stale GPS recovery, busy KYC guard, role revocation and deleted-account rejection`);
}finally{
 await db.booking.deleteMany({where:{id:{in:bookingIds}}});
 await db.workerProfile.deleteMany({where:{userId:{in:users.map(u=>u.id)}}});
 await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});
 if(service){await db.serviceItem.deleteMany({where:{serviceId:service.id}});await db.service.delete({where:{id:service.id}});}
 await db.$disconnect();
}})().catch(e=>{console.error(e.message);process.exitCode=1});
