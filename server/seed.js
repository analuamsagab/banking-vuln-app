import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, ensureRuntimeDirs } from './config.js';

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function userId(db, username, fallback = 1) {
  const row = await get(db, 'SELECT id FROM users WHERE username = ?', [username]);
  return row ? row.id : fallback;
}

export async function seedDatabase(db) {
  ensureRuntimeDirs();

  const userCount = await get(db, 'SELECT COUNT(*) AS count FROM users');
  if (userCount.count === 0) {
    const users = [
      [1, 'budi', 'budi123', 'Budi Santoso', 'budi@example.test', 'customer', 5000000, 'Nasabah sejak 2020. Suka kopi dan transfer malam.', 0],
      [2, 'andi', 'andi123', 'Andi Pratama', 'andi@example.test', 'customer', 2500000, 'Anak muda yang sering belanja online.', 0],
      [3, 'admin', 'admin123', 'Administrator', 'admin@example.test', 'admin', 99999999, 'Admin Bank UBS. Jangan bagikan akses.', 1],
      [4, 'sari', 'sari123', 'Sari Dewi', 'sari@example.test', 'customer', 1000000, 'Nasabah baru, belum aktif transaksi.', 0],
    ];

    for (const user of users) {
      await run(
        db,
        `INSERT INTO users
          (id, username, password, nama_lengkap, email, role, saldo, bio, mfa_enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        user
      );
    }
    console.log('Seed: 4 users dibuat.');
  } else {
    // Database lama tetap bisa dipakai: pastikan admin punya role dan email.
    await run(
      db,
      `UPDATE users SET role = 'admin', email = COALESCE(email, 'admin@example.test'),
       mfa_enabled = 1 WHERE username = 'admin'`
    );
    await run(db, "UPDATE users SET role = 'customer' WHERE role IS NULL OR role = ''");
  }

  const budiId = await userId(db, 'budi', 1);
  const andiId = await userId(db, 'andi', 2);
  const adminId = await userId(db, 'admin', 3);
  const sariId = await userId(db, 'sari', 4);

  const noteCount = await get(db, 'SELECT COUNT(*) AS count FROM notes');
  if (noteCount.count === 0) {
    const notes = [
      [budiId, 'Penting: Jangan pernah bagikan password ke siapa pun!'],
      [andiId, 'Sudah kirim dana ke Budi sebesar Rp 500,000'],
      [adminId, 'CATATAN ADMIN: API key internal = internal-lab-key-123. Jangan simpan di sini!'],
      [sariId, 'Rencana beli tiket konser bulan depan.'],
    ];
    for (const note of notes) {
      await run(db, 'INSERT INTO notes (user_id, content) VALUES (?, ?)', note);
    }
  }

  const ticketCount = await get(db, 'SELECT COUNT(*) AS count FROM tickets');
  if (ticketCount.count === 0) {
    const tickets = [
      [budiId, 'Transfer belum masuk', 'Saya transfer Rp 500.000 ke Andi tapi belum masuk. Mohon dicek.', 'open'],
      [andiId, 'Ganti nomor HP', 'Nomor HP saya berubah, tolong diperbarui.', 'open'],
      [adminId, 'Catatan internal', 'Review transaksi mencurigakan user #2. Jangan dihapus.', 'internal'],
    ];
    for (const ticket of tickets) {
      await run(
        db,
        'INSERT INTO tickets (user_id, subject, message, status) VALUES (?, ?, ?, ?)',
        ticket
      );
    }
  }

  const statementCount = await get(db, 'SELECT COUNT(*) AS count FROM statements');
  if (statementCount.count === 0) {
    const statements = [
      [budiId, 'statement-budi-2026-11.txt', 'Saldo awal: Rp 5.000.000\nTransfer keluar: Rp 500.000\nSaldo akhir: Rp 4.500.000'],
      [andiId, 'statement-andi-2026-11.txt', 'Saldo awal: Rp 2.500.000\nTransfer masuk: Rp 500.000\nSaldo akhir: Rp 3.000.000'],
      [adminId, 'statement-admin-2026-11.txt', 'Rekening internal. Limit transaksi: tidak terbatas.'],
      [sariId, 'statement-sari-2026-11.txt', 'Belum ada transaksi.'],
    ];
    for (const statement of statements) {
      await run(
        db,
        'INSERT INTO statements (user_id, filename, content) VALUES (?, ?, ?)',
        statement
      );
    }
  }

  const couponCount = await get(db, 'SELECT COUNT(*) AS count FROM coupons');
  if (couponCount.count === 0) {
    await run(db, 'INSERT INTO coupons (code, amount) VALUES (?, ?)', ['HEMAT50', 50000]);
    await run(db, 'INSERT INTO coupons (code, amount) VALUES (?, ?)', ['BONUS100', 100000]);
  }

  const fileCount = await get(db, 'SELECT COUNT(*) AS count FROM files');
  if (fileCount.count === 0) {
    const samples = [
      {
        user_id: budiId,
        original_name: 'budi_ktp.txt',
        stored_name: 'budi_ktp.txt',
        mime: 'text/plain',
        content: 'KTP Budi Santoso\nNIK: 3171xxxxxxxxxxxx\nAlamat: Jakarta',
      },
      {
        user_id: andiId,
        original_name: 'andi_npwp.txt',
        stored_name: 'andi_npwp.txt',
        mime: 'text/plain',
        content: 'NPWP Andi Pratama\nNomor: 09.xxx.xxx.x-xxx.xxx',
      },
      {
        user_id: adminId,
        original_name: 'admin_ktp.txt',
        stored_name: 'admin_ktp.txt',
        mime: 'text/plain',
        content: 'KTP Administrator\nNIK: 3171admin-lab\nAlamat: Kantor Pusat',
      },
      {
        user_id: budiId,
        original_name: 'welcome.html',
        stored_name: 'welcome.html',
        mime: 'text/html',
        content: '<html><body><h1>Selamat datang di Bank UBS</h1><p>File contoh untuk demo upload.</p></body></html>',
      },
    ];

    for (const sample of samples) {
      const filePath = path.join(UPLOAD_DIR, sample.stored_name);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, sample.content, 'utf8');
      }
      await run(
        db,
        'INSERT INTO files (user_id, original_name, stored_name, mime, path) VALUES (?, ?, ?, ?, ?)',
        [sample.user_id, sample.original_name, sample.stored_name, sample.mime, filePath]
      );
    }
  }

  console.log('Database siap digunakan.');
}
