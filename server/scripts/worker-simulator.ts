import { io } from 'socket.io-client';

// Configurable target worker & starting position (default Connaught Place, New Delhi)
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const WORKER_ID = process.argv[2] || 'simulated-worker-1';

// Starting coordinates (slightly offset from Connaught Place center)
let currentLat = parseFloat(process.argv[3] || '28.6200');
let currentLng = parseFloat(process.argv[4] || '77.2150');

// Target coordinates (destination customer pickup)
const targetLat = parseFloat(process.argv[5] || '28.6139');
const targetLng = parseFloat(process.argv[6] || '77.2090');

console.log(`[WorkerSimulator] Connecting to ${SERVER_URL} as worker: ${WORKER_ID}`);
console.log(`[WorkerSimulator] Start: (${currentLat}, ${currentLng}) -> Target: (${targetLat}, ${targetLng})`);

const socket = io(SERVER_URL);

socket.on('connect', () => {
  console.log(`[WorkerSimulator] Connected to Socket.io with id: ${socket.id}`);
  socket.emit('join_worker', { workerId: WORKER_ID });

  // Move 10% closer to destination every 5 seconds
  const interval = setInterval(() => {
    const latDiff = targetLat - currentLat;
    const lngDiff = targetLng - currentLng;

    // Check if within arrival threshold (~20m)
    if (Math.abs(latDiff) < 0.0002 && Math.abs(lngDiff) < 0.0002) {
      console.log(`[WorkerSimulator] Reached target destination! Worker has arrived.`);
      currentLat = targetLat;
      currentLng = targetLng;
      socket.emit('worker:location_update', {
        workerId: WORKER_ID,
        lat: currentLat,
        lng: currentLng,
      });
      clearInterval(interval);
      return;
    }

    // Move step
    currentLat += latDiff * 0.15;
    currentLng += lngDiff * 0.15;

    console.log(
      `[WorkerSimulator] Moving... Current GPS: (${currentLat.toFixed(6)}, ${currentLng.toFixed(6)})`
    );

    socket.emit('worker:location_update', {
      workerId: WORKER_ID,
      lat: currentLat,
      lng: currentLng,
    });
  }, 5000);
});

socket.on('disconnect', () => {
  console.log('[WorkerSimulator] Disconnected from server');
});

socket.on('worker:new_request', (data) => {
  console.log('🔔 [WorkerSimulator] Received incoming job request:', data);
});
