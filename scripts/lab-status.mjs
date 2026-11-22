import fs from 'fs';
import path from 'path';
import {
  DB_PATH,
  EVIDENCE_DIR,
  HOST,
  LOG_DIR,
  PORT,
  RETENTION_DAYS,
  UPLOAD_DIR,
} from '../server/config.js';
import { getCounts, isPortInUse } from './lib.mjs';

const counts = await getCounts(DB_PATH);
const running = await isPortInUse(PORT);

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).length;
}

const evidence = fs.existsSync(EVIDENCE_DIR)
  ? fs
      .readdirSync(EVIDENCE_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const full = path.join(EVIDENCE_DIR, entry.name);
        const stat = fs.statSync(full);
        return {
          name: entry.name,
          size_kb: Math.round(
            fs
              .readdirSync(full, { withFileTypes: true })
              .reduce((total, child) => {
                const childPath = path.join(full, child.name);
                try {
                  return total + (child.isDirectory() ? 0 : fs.statSync(childPath).size);
                } catch {
                  return total;
                }
              }, 0) / 1024
          ),
          age_days: Math.floor((Date.now() - stat.mtimeMs) / (24 * 60 * 60 * 1000)),
        };
      })
  : [];

console.log('=== Lab Status ===');
console.log(`URL        : http://${HOST}:${PORT}`);
console.log(`Server     : ${running ? 'RUNNING' : 'STOPPED'}`);
console.log(`DB         : ${DB_PATH}`);
console.log(`Counts     : ${JSON.stringify(counts)}`);
console.log(`Uploads    : ${countFiles(UPLOAD_DIR)} file`);
console.log(`Logs       : ${countFiles(LOG_DIR)} file`);
console.log(`Evidence   : ${evidence.length} folder (retensi ${RETENTION_DAYS} hari)`);
for (const item of evidence) {
  console.log(`  - ${item.name} (${item.size_kb} KB, ${item.age_days} hari)`);
}
