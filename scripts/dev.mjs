import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { networkInterfaces } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const services = [
  { name: 'Backend', folder: 'server', entry: 'tsx/dist/cli.mjs', args: ['watch', 'src/index.ts'] },
  { name: 'Website', folder: 'client', entry: 'next/dist/bin/next', args: ['dev', '--hostname', '0.0.0.0', '--port', '3001'] },
];

for (const service of services) {
  service.cwd = path.join(root, service.folder);
  service.bin = path.join(service.cwd, 'node_modules', service.entry);
  if (!existsSync(service.bin)) {
    console.error(`Dependencies missing. Run: npm --prefix ${service.folder} install`);
    process.exit(1);
  }
}

const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === 'win32') {
      // Stop the watcher and its child server together.
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      killer.on('error', () => child.kill());
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Already stopped. */ }
    }
  }
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

console.log('\nServZest development: http://localhost:3001');
for (const addresses of Object.values(networkInterfaces())) for (const address of addresses || []) {
  if (address.family === 'IPv4' && !address.internal) console.log(`Mobile (same Wi-Fi): http://${address.address}:3001`);
}
console.log('Save files to update the website automatically. Keep this running; Ctrl+C stops both servers.\n');

for (const service of services) {
  const child = spawn(process.execPath, [service.bin, ...service.args], {
    cwd: service.cwd,
    stdio: 'inherit',
    windowsHide: true,
    detached: process.platform !== 'win32',
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(`${service.name} failed: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${service.name} stopped. Restart with npm run dev.`);
      stop(code || 1);
    }
  });
}
