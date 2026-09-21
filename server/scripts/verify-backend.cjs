// Run from server/: npm run verify:backend
// Requires the local API and development database. Stops at the first failing stage.
const { spawnSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const path = require('node:path');
const cwd = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(cwd, '.env') });
if (process.env.NODE_ENV === 'production') { console.error('Use a development database for integration verification.'); process.exit(1); }
const stages = [
 ['Build', ['node_modules/typescript/bin/tsc']],
 ['Login and permissions', ['node_modules/jest/bin/jest.js','--runInBand','src/services/otp.service.test.ts','src/middlewares/auth.middleware.test.ts']],
 ['Pricing, dispatch and routes', ['node_modules/jest/bin/jest.js','--runInBand','src/services/pricing.service.test.ts','src/services/checkout.service.test.ts','src/services/dispatch.service.test.ts','src/services/dispatch-recovery.test.ts','src/services/road-route.service.test.ts']],
 ['Checkout integration', ['scripts/checkout-smoke.cjs']],
 ['Payment validation', ['node_modules/jest/bin/jest.js','--runInBand','src/modules/bookings/payment.controller.test.ts']],
 ['Work lifecycle and receipts', ['scripts/business-flow-smoke.cjs']],
 ['API failure handling', ['node_modules/jest/bin/jest.js','--runInBand','src/middlewares/api-error.middleware.test.ts']],
 ['Admin and KYC integration', ['scripts/audit-regression.cjs']],
];
const report = { checkedAt: new Date().toISOString(), stages: [] };
for (const [name,args] of stages) {
 console.log(`\nChecking: ${name}`);
 const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', windowsHide: true });
 report.stages.push({name, status:result.status===0?'PASS':'FAIL'});
 writeFileSync(path.join(cwd,'backend-verification.json'), JSON.stringify(report,null,2));
 if(result.status!==0){console.error(`Stopped at ${name}. Later stages were not run.`);process.exit(1);}
}
console.log('All configured backend verification stages passed. This does not verify live SMS, bank payments or production infrastructure.');
