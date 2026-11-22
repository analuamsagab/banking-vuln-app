# Bank UBS — Lab Aplikasi Perbankan Rentan

> **PERINGATAN**
> Aplikasi ini **sengaja rentan** dan **hanya untuk lab/red team terisolasi**.
> Jangan pernah menjalankan dengan data asli, jangan expose ke internet publik,
> dan jangan gunakan teknik di repo ini terhadap sistem tanpa izin tertulis.

Lab perbankan full-stack (Express + SQLite + React) yang dibuat untuk latihan:
SQL injection, XSS, IDOR, SSRF, XXE, SSTI, command injection, business logic,
prototype pollution, session/JWT bypass, dan **penyadapan HTTP plaintext**
(Wireshark/mitmproxy).

Tidak ada flag, CTF, atau scoreboard. Fokusnya adalah alur serangan nyata dan
kemampuan melakukan **reset bersih** setelah latihan.

---

## Quick Start

Prasyarat: Node.js 18+ (disarankan 20+).

```bash
npm install
npm run lab:reset
```

`lab:reset` akan:

1. Menghentikan server di port `3001`/`5173`.
2. Membuat backup runtime ke `lab/evidence/<timestamp>/`.
3. Menghapus evidence yang lebih tua dari 30 hari.
4. Menghapus DB, uploads, logs, exports, dan backups runtime.
5. Membuat schema + seed awal (user, saldo, notes, tiket, statement, file, kupon).
6. Build frontend jika `dist/index.html` belum ada.
7. Menjalankan server di background.

Buka **http://127.0.0.1:3001**.

### Akun demo

| Username | Password  | Role     | Saldo awal |
|----------|-----------|----------|------------|
| `budi`   | `budi123` | customer | Rp 5.000.000 |
| `andi`   | `andi123` | customer | Rp 2.500.000 |
| `admin`  | `admin123`| admin    | Rp 99.999.999 |
| `sari`   | `sari123` | customer | Rp 1.000.000 |

---

## Script

| Perintah | Fungsi |
|----------|--------|
| `npm run lab:reset` | Backup + reset runtime + seed + autostart |
| `npm run lab:reset -- --no-backup` | Reset tanpa backup |
| `npm run lab:reset -- --no-start` | Reset tanpa menjalankan server |
| `npm run lab:reset -- --foreground` | Reset lalu jalankan server di foreground |
| `npm run lab:reset -- --hard --yes` | **Danger:** `git restore` + `git clean` ke HEAD, lalu reset |
| `npm run lab:stop` | Hentikan server port 3001/5173 |
| `npm run lab:status` | Status server, DB, uploads, logs, evidence |
| `npm run lab:prune` | Hapus evidence > 30 hari |
| `npm run lab:verify` | Uji 47 perilaku rentan (mengubah data lab) |
| `npm run lab:dev` | Server + Vite dev server (port 5173, proxy `/api`) |
| `npm run lab:start` | Build frontend lalu jalankan server foreground |
| `npm run lab:docker:up` | Jalankan versi Docker Compose |
| `npm run lab:docker:reset` | Hapus volume Docker lalu recreate |
| `npm run lab:docker:down` | Hentikan Docker Compose |

Retensi evidence dapat diubah lewat `LAB_EVIDENCE_RETENTION_DAYS` (default 30).
Opsi reset lengkap: `npm run lab:reset -- --help`.

> `lab:verify` sengaja mengubah saldo/role/notes/upload. Setelah verifikasi,
> jalankan `npm run lab:reset` untuk mengembalikan kondisi awal.

---

## Profil Lab

`LAB_PROFILE` mengatur fitur berisiko tinggi:

| Profil | Fitur |
|--------|-------|
| `web` (default) | SQLi, XSS, IDOR, SSRF, upload, CSRF, business logic, auth bypass |
| `extreme` (opt-in) | Semua di atas + **XXE**, **SSTI**, **command injection** |

Ubah lewat `.env`:

```env
LAB_PROFILE=web
```

Untuk mengaktifkan XXE, SSTI, dan command injection, ubah ke `LAB_PROFILE=extreme`.

Jika `web`, endpoint `/api/kyc/import`, `/api/notifications/preview`, dan
`/api/admin/diagnostics/ping` mengembalikan 404.

---

## HTTP Plaintext (MITM/Wireshark)

Lab **tidak memakai HTTPS, HSTS, redirect HTTPS, atau cookie `Secure`**.
Login mengirim JSON `{"username":"...","password":"..."}` apa adanya.

Filter Wireshark yang berguna:

```text
http.request.method == "POST" && http.request.uri == "/api/auth/login"
http contains "password"
http.cookie
```

Langkah singkat:

1. Jalankan `npm run lab:reset`.
2. Mulai capture di interface loopback/Ethernet.
3. Login di browser sebagai `budi` / `budi123`.
4. Follow TCP stream pada request `POST /api/auth/login`.
5. Kredensial terlihat plaintext; cookie `sid` juga terlihat pada request berikutnya.

Detail MITM, session hijacking, dan CSRF ada di [`docs/HTTP_LAB.md`](docs/HTTP_LAB.md).

---

## Daftar Kerentanan

Ringkasan lengkap + payload ada di [`docs/ATTACKS.md`](docs/ATTACKS.md) dan
checklist di [`docs/LAB_CHECKLIST.md`](docs/LAB_CHECKLIST.md).

- SQL injection: login, register/reset, user search, user detail, statement,
  notes, support search, transfer, withdraw, error verbose.
- Auth: tanpa rate limit, MFA `000000`, `X-User-Id`, JWT `alg:none`, session
  fixation, logout tidak invalidasi session, cookie non-HttpOnly/non-Secure.
- XSS: reflected (login error), stored (notes, support, bio), DOM (hash support),
  log injection, unrestricted upload HTML/SVG.
- IDOR: user, statement, notes, tickets, files, transfers, withdraw.
- SSRF: `file://`, internal API, cloud metadata.
- XXE: external entity ke file/HTTP.
- SSTI: EJS render + RCE via `require('child_process')`.
- Command injection: diagnostics `echo <host>`.
- Business logic: transfer negatif, fee negatif, race withdraw, replay kupon,
  price tampering tagihan, mass assignment role/saldo.
- Prototype pollution: `__proto__.isAdmin` -> bypass `requireAdmin`.
- Web: CORS reflect origin + credentials, CSRF, open redirect, clickjacking,
  backup DB/log publik, `/api/config` bocor secret, CSV formula injection.

---

## Struktur

```text
server.js                 entrypoint
server/
  index.js                Express app
  config.js               env + path runtime
  db.js                   SQLite + schema + migrasi
  seed.js                 seed deterministik
  auth.js                 session/JWT/X-User-Id
  logger.js               log plaintext (termasuk password)
  routes/                 auth, users, transfers, notes, support, files,
                          integrations, admin
scripts/
  lab-reset.mjs           reset + backup + prune + autostart
  lab-stop.mjs
  lab-status.mjs
  lab-prune.mjs
lab/
  verify.mjs              47 pengecekan kerentanan
  evidence/               backup runtime (ignored)
src/                      React + React Router
docs/                     HTTP lab, PoC, checklist
```

---

## Docker (Opsional)

Bare Node tetap menjadi cara utama. Docker hanya alternatif terisolasi:

```bash
npm run lab:docker:up
# http://127.0.0.1:3001
npm run lab:docker:reset   # hapus volume + recreate
npm run lab:docker:down
```

Data runtime berada di volume `lab-data`; evidence di `lab-evidence`.

---

## Reset dan Bukti

Backup default berisi:

- `database.sqlite`
- `logs/` dan `server-output.log`
- `uploads/`
- `exports/` dan `backups/`
- `counts.json` dan `meta.json`

Backup **tidak** menyertakan source code, `node_modules`, `dist`, atau `.env`.
Evidence disimpan maksimal 30 hari, lalu dihapus otomatis oleh reset/prune.

`lab:reset` cukup untuk membersihkan level web. Jika RCE sudah menjalankan
perintah di host, gunakan `--hard` (setelah commit) atau recreate container
Docker untuk menjamin proses dan file kembali bersih.

---

## Lisensi dan Etika

Gunakan hanya di lingkungan yang Anda miliki/berwenang. Semua payload di repo
ini adalah contoh untuk pembelajaran. Penulis tidak bertanggung jawab atas
penyalahgunaan.
