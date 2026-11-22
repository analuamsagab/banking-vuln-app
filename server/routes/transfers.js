import { Router } from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { requireAuth } from '../auth.js';
import { log } from '../logger.js';
import { asyncHandler, csvLine, delay, fetchUrl } from '../utils.js';
import { RACE_DELAY_MS } from '../config.js';

const router = Router();

async function performTransfer({ from_id, to_id, amount, fee = 0, note = '' }) {
  // SQL Injection yang disengaja: semua nilai dimasukkan langsung ke query.
  const insertQuery = `INSERT INTO transfers (from_user, to_user, amount, fee, note)
    VALUES (${from_id}, ${to_id}, ${amount}, ${fee}, '${note}')`;
  await dbRun(insertQuery);

  // Tidak ada transaksi/rollback. Saldo bisa menjadi negatif.
  await dbRun(
    `UPDATE users SET saldo = saldo - (${amount}) - (${fee}) WHERE id = ${from_id}`
  );
  await dbRun(`UPDATE users SET saldo = saldo + (${amount}) WHERE id = ${to_id}`);

  log('INFO', 'transfer', { from_id, to_id, amount, fee, note, query: insertQuery });
  return insertQuery;
}

router.get(
  '/transfer',
  asyncHandler(async (req, res) => {
    const { from_id, to_id, amount, fee = 0, note = '' } = req.query;
    if (!from_id || !to_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Parameter from_id, to_id, amount wajib diisi',
      });
    }

    try {
      const query = await performTransfer({ from_id, to_id, amount, fee, note });
      res.json({
        success: true,
        message: `Transfer Rp ${Number(amount).toLocaleString('id-ID')} dari user ${from_id} ke user ${to_id} berhasil`,
        query,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Transfer gagal', error: error.message });
    }
  })
);

router.post(
  '/transfer',
  asyncHandler(async (req, res) => {
    const { from_id, to_id, amount, fee = 0, note = '' } = req.body || {};
    if (!from_id || !to_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Field from_id, to_id, amount wajib diisi',
      });
    }

    try {
      const query = await performTransfer({ from_id, to_id, amount, fee, note });
      res.json({
        success: true,
        message: `Transfer Rp ${Number(amount).toLocaleString('id-ID')} dari user ${from_id} ke user ${to_id} berhasil`,
        query,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Transfer gagal', error: error.message });
    }
  })
);

router.post(
  '/withdraw',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.body?.user_id || req.user.id;
    const amount = req.body?.amount;

    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ success: false, message: 'Amount wajib diisi' });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    // Delay buatan supaya race condition mudah didemokan.
    await delay(RACE_DELAY_MS);

    if (Number(user.saldo) < Number(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Saldo tidak cukup',
        saldo: user.saldo,
      });
    }

    await dbRun('UPDATE users SET saldo = saldo - (?) WHERE id = ?', [amount, userId]);
    const result = await dbRun(
      'INSERT INTO withdrawals (user_id, amount) VALUES (?, ?)',
      [userId, amount]
    );
    const updated = await dbGet('SELECT id, username, saldo FROM users WHERE id = ?', [userId]);

    log('INFO', 'withdraw', { userId, amount, withdrawal_id: result.lastID });
    res.json({
      success: true,
      message: `Penarikan Rp ${Number(amount).toLocaleString('id-ID')} berhasil`,
      user: updated,
    });
  })
);

router.get(
  '/transfers/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const query = `SELECT t.*, uf.username AS from_username, ut.username AS to_username
      FROM transfers t
      LEFT JOIN users uf ON uf.id = t.from_user
      LEFT JOIN users ut ON ut.id = t.to_user
      WHERE t.id = ${id}`;
    try {
      const transfer = await dbGet(query);
      if (!transfer) return res.status(404).json({ success: false, message: 'Transfer tidak ditemukan' });
      res.json({ success: true, transfer, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

router.get(
  '/transfers',
  asyncHandler(async (req, res) => {
    const userId = req.query.user_id || 1;
    const query = `SELECT t.*, uf.username AS from_username, ut.username AS to_username
      FROM transfers t
      LEFT JOIN users uf ON uf.id = t.from_user
      LEFT JOIN users ut ON ut.id = t.to_user
      WHERE t.from_user = ${userId} OR t.to_user = ${userId}
      ORDER BY t.id DESC`;
    try {
      const transfers = await dbAll(query);
      res.json({ success: true, transfers, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

router.post(
  '/bills/pay',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { bill_id, amount } = req.body || {};
    if (!bill_id || amount === undefined) {
      return res.status(400).json({ success: false, message: 'bill_id dan amount wajib diisi' });
    }

    // Harga tagihan dipercaya dari client.
    await dbRun('UPDATE users SET saldo = saldo - (?) WHERE id = ?', [amount, req.user.id]);
    const result = await dbRun(
      'INSERT INTO payments (user_id, bill_id, amount) VALUES (?, ?, ?)',
      [req.user.id, bill_id, amount]
    );

    log('INFO', 'bill payment', { userId: req.user.id, bill_id, amount });
    res.json({
      success: true,
      message: `Tagihan ${bill_id} dibayar Rp ${Number(amount).toLocaleString('id-ID')}`,
      payment_id: result.lastID,
    });
  })
);

router.post(
  '/coupons/redeem',
  requireAuth,
  asyncHandler(async (req, res) => {
    const code = String(req.body?.code || '');
    const coupon = await dbGet('SELECT * FROM coupons WHERE code = ?', [code]);
    if (!coupon) return res.status(404).json({ success: false, message: 'Kupon tidak ditemukan' });

    // Tidak mengecek used_by. Kupon bisa dipakai berulang kali.
    await dbRun('UPDATE users SET saldo = saldo + ? WHERE id = ?', [coupon.amount, req.user.id]);
    await dbRun('UPDATE coupons SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?', [
      req.user.id,
      code,
    ]);

    log('INFO', 'coupon redeem', { userId: req.user.id, code, amount: coupon.amount });
    res.json({
      success: true,
      message: `Kupon ${code} berhasil. Saldo bertambah Rp ${Number(coupon.amount).toLocaleString('id-ID')}`,
    });
  })
);

router.get(
  '/statement/export.csv',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.query.user_id || req.user.id;
    const transfers = await dbAll(
      'SELECT * FROM transfers WHERE from_user = ? OR to_user = ? ORDER BY id DESC',
      [userId, userId]
    );

    const rows = [
      csvLine(['id', 'from_user', 'to_user', 'amount', 'fee', 'note', 'created_at']),
      ...transfers.map((transfer) =>
        csvLine([
          transfer.id,
          transfer.from_user,
          transfer.to_user,
          transfer.amount,
          transfer.fee,
          transfer.note,
          transfer.created_at,
        ])
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="statement.csv"');
    res.send(rows.join('\n'));
  })
);

router.post(
  '/statement/import',
  asyncHandler(async (req, res) => {
    const url = String(req.body?.url || '');
    try {
      const result = await fetchUrl(url);
      log('INFO', 'statement import', { url, status: result.status });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal mengambil URL', error: error.message });
    }
  })
);

export default router;
