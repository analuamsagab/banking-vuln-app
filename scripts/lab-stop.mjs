import { PORT } from '../server/config.js';
import { isPortInUse, stopPort } from './lib.mjs';

const stopped = [...stopPort(PORT), ...stopPort(5173)];
const running = await isPortInUse(PORT);

console.log(
  stopped.length
    ? `Server dihentikan (PID: ${stopped.join(', ')}).`
    : 'Tidak ada proses server yang ditemukan di port 3001/5173.'
);
console.log(`Port ${PORT} ${running ? 'masih terbuka' : 'sudah tertutup'}.`);
