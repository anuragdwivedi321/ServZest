// Run only against the configured development database and local API.
// All records created by this test are removed in finally; no real payment is sent.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const db = new PrismaClient(); const users = []; const sockets = []; const tickets = [];
const base = 'http://127.0.0.1:4000';
async function call(path, token, body, status = 200, method) {
 const response=await fetch(base+path,{method:method || (body === undefined?'GET':'POST'),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
 const result=await response.json(); assert.equal(response.status,status,`${path}: ${JSON.stringify(result)}`);return result;
}
async function connect(token) {
 const socket=io(base,{auth:{token},transports:['websocket'],reconnection:false});sockets.push(socket);
 await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);setTimeout(()=>reject(new Error('Socket timeout')),10000).unref();});return socket;
}
(async()=>{try{
 for(const role of ['CUSTOMER','WORKER','CUSTOMER','ADMIN']) users.push(await db.user.create({data:{phone:`flow-test-${randomUUID()}`,name:'Business flow test',role}}));
 const tokens=users.map(u=>jwt.sign({id:u.id,phone:u.phone,role:u.role},process.env.JWT_SECRET||'servzest-super-secret-jwt-key-change-in-prod',{expiresIn:'15m'}));
 const service=await db.service.findUniqueOrThrow({where:{slug:'plumber'},include:{items:true}});
 const worker=await db.workerProfile.create({data:{userId:users[1].id,skills:['plumbing'],kycStatus:'APPROVED',isOnline:true,services:{create:{serviceId:service.id}}}});
 await assert.rejects(connect(undefined));
 const socket=await connect(tokens[1]);
 await new Promise((resolve,reject)=>socket.timeout(10000).emit('worker:location_update',{lat:0,lng:0},(err,res)=>err||!res?.success?reject(err||new Error('GPS failed')):resolve()));
 await call('/api/worker/upi',tokens[1],{upiId:'test-only@invalid',upiName:'TEST ONLY NO TRANSFERS'},200,'PUT');
 const quote=await call('/api/bookings/estimate',tokens[0],{serviceId:service.id,itemIds:[]});
 const created=await call('/api/bookings',tokens[0],{serviceId:service.id,itemIds:[],pickupLat:0,pickupLng:0,pickupAddress:'Isolated automated test location',locationConfirmed:true,requestKey:randomUUID(),acceptedTotal:quote.bill.totalAmount},201);
 const id=created.booking.id;
 for(let i=0;i<20;i++){const p=await call('/api/worker/profile',tokens[1]);if(p.incomingRequest?.bookingId===id)break;await new Promise(r=>setTimeout(r,200));}
 const accepted=await call(`/api/worker/bookings/${id}/accept`,tokens[1],{});assert.equal(accepted.booking.startOtp,undefined);
 const profile=await call('/api/worker/profile',tokens[1]);assert.equal(profile.activeBooking.startOtp,undefined);
 const stranger=await connect(tokens[2]);
 const forbidden=await new Promise((resolve,reject)=>stranger.timeout(5000).emit('join_booking',{bookingId:id},(err,res)=>err?reject(err):resolve(res)));assert.equal(forbidden.success,false);
 await call(`/api/worker/bookings/${id}/status`,tokens[1],{status:'EN_ROUTE'});
 await call(`/api/worker/bookings/${id}/status`,tokens[1],{status:'ARRIVED'});
 const detail=await call(`/api/bookings/${id}`,tokens[0]);assert.equal(detail.booking.worker.aadhaarNumber,undefined);
 await call(`/api/worker/bookings/${id}/start`,tokens[1],{otp:detail.booking.startOtp});
 const extra=await call(`/api/worker/bookings/${id}/add-item`,tokens[1],{description:'Test approved extra',quantity:1,unitPrice:75,isPart:true});
 await call(`/api/worker/bookings/${id}/complete`,tokens[1],{},400);
 await call(`/api/bookings/${id}/approve-item`,tokens[2],{itemId:extra.item.id,action:'APPROVE'},403);
 await call(`/api/bookings/${id}/approve-item`,tokens[0],{itemId:extra.item.id,action:'APPROVE'});
 const completed=await call(`/api/worker/bookings/${id}/complete`,tokens[1],{});
 await call(`/api/bookings/${id}/cancel`,tokens[0],{},400);
 const qr=await call(`/api/bookings/${id}/payment-qr`,tokens[0],{});
 assert.ok(qr.qrDataUrl.startsWith('data:image/png;base64,'));assert.ok(qr.uri.includes('pa=test-only%40invalid'));assert.equal(qr.amount,completed.bill.totalAmount);
 await call(`/api/bookings/${id}/payment-qr`,tokens[2],{},404);
 const report=await call(`/api/bookings/${id}/pay`,tokens[0],{method:'UPI',transactionRef:'TEST-REFERENCE'});assert.equal(report.payment.status,'PENDING');
 const receipt=await call(`/api/worker/bookings/${id}/receipt`,tokens[1],{action:'CONFIRM'});assert.equal(receipt.payment.status,'COMPLETED');
 const retry=await call(`/api/bookings/${id}/pay`,tokens[0],{method:'CASH'});assert.equal(retry.payment.method,'UPI');assert.equal(retry.payment.id,receipt.payment.id);
 const cashBooking=await db.booking.create({data:{customerId:users[0].id,workerId:worker.id,serviceId:service.id,status:'COMPLETED',completedAt:new Date(),pickupLat:0,pickupLng:0,pickupAddress:'Isolated cash test',startOtp:'1234',totalAmount:100}});
 await call(`/api/bookings/${cashBooking.id}/pay`,tokens[0],{method:'CASH'});
 await call(`/api/worker/bookings/${cashBooking.id}/receipt`,tokens[1],{action:'REJECT'});
 assert.equal((await db.payment.findUnique({where:{bookingId:cashBooking.id}})).status,'FAILED');
 await call(`/api/bookings/${cashBooking.id}/pay`,tokens[0],{method:'CASH'});
 await call(`/api/worker/bookings/${cashBooking.id}/receipt`,tokens[1],{action:'CONFIRM'});
 assert.equal((await db.payment.findUnique({where:{bookingId:cashBooking.id}})).status,'COMPLETED');
 await call(`/api/bookings/${id}/rate`,tokens[0],{stars:5,comment:'Test review'},201);
 const complaint=await call(`/api/bookings/${id}/complaint`,tokens[0],{issue:'Automated complaint test'},201);
 await call(`/api/admin/complaints/${complaint.complaint.id}`,tokens[3],{status:'RESOLVED'},200,'PATCH');
 const ticket=await call('/api/support',undefined,{name:'Test fixture',phone:'9000000000',category:'Other',message:'Isolated automated support test'},201);tickets.push(ticket.ticketId);
 const queue=await call('/api/support',tokens[3]);assert.ok(queue.tickets.some(t=>t.id===ticket.ticketId));
 await call(`/api/support/${ticket.ticketId}`,tokens[3],{status:'RESOLVED',resolution:'Test completed'},200,'PATCH');
 await call('/api/admin/customers',tokens[0],undefined,403);
 await call('/api/admin/settings',tokens[3],{settings:{platform_commission_pct:-1}},400,'PUT');
 console.log('PASS: authenticated sockets, real GPS, offer recovery, assignment, OTP privacy, lifecycle, pending approval guard, QR, pending receipt, confirmation, payment replay, review, complaint, support/admin permissions');
}finally{
 sockets.forEach(s=>s.disconnect());
 const ids=users.map(u=>u.id);const bookings={customerId:{in:ids}};
 await db.complaint.deleteMany({where:{userId:{in:ids}}});await db.rating.deleteMany({where:{customerId:{in:ids}}});await db.payment.deleteMany({where:{booking:bookings}});await db.bookingItem.deleteMany({where:{booking:bookings}});await db.booking.deleteMany({where:bookings});await db.workerProfile.deleteMany({where:{userId:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});await db.supportTicket.deleteMany({where:{id:{in:tickets}}});await db.$disconnect();
}})().catch(error=>{console.error(error.message);process.exitCode=1;});
