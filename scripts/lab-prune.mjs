import { RETENTION_DAYS } from '../server/config.js';
import { pruneEvidence } from './lib.mjs';

const removed = pruneEvidence();
console.log(
  removed.length
    ? `Dihapus (${RETENTION_DAYS} hari): ${removed.join(', ')}`
    : `Tidak ada evidence yang lebih tua dari ${RETENTION_DAYS} hari.`
);
