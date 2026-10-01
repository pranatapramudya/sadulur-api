# 🏥 Sadulur Care API - Core Backend Engine & Database

**Sadulur Care API** adalah _core engine_ (sistem pusat) berstandar _enterprise_ yang dirancang khusus untuk ekosistem aplikasi **Sadulur Care**. Repositori ini berfungsi sebagai otak utama yang mengelola basis data rekam medis pasien, memvalidasi autentikasi keamanan tingkat tinggi, dan mendistribusikan data secara _real-time_ ke Dashboard Admin.

## 🚀 Fitur Utama & Arsitektur

- **Strict Identity Verification (RBAC):** Seluruh _endpoint_ dilindungi oleh sistem token JWT dari Clerk. Hanya token dengan _metadata_ otoritas (`role: "NURSE"`) yang diizinkan memanggil data sensitif.
- **Relational Medical Database:** Menggunakan struktur PostgreSQL yang direlasikan secara ketat via Prisma ORM untuk menjamin integritas data pasien, rekam medis (RM14), dan laporan _check-in_.
- **Clerk Webhooks Integration:** Mendengarkan _event_ mutasi pengguna secara otomatis untuk sinkronisasi identitas antara _Auth Provider_ dan _Database_ lokal.
- **Cross-Origin Resource Sharing (CORS):** Dikonfigurasi secara aman untuk melayani _request_ lintas domain dari Frontend Web maupun aplikasi Native Android (Capacitor).
- **Serverless Ready:** Arsitektur _stateless_ yang sepenuhnya dioptimalkan untuk _deployment edge/serverless_ di Vercel.

## 🛠️ Modern Tech Stack

- **Framework:** Next.js 15+ (API Routes)
- **Database:** PostgreSQL (Hosted on Neon DB)
- **ORM:** Prisma
- **Security & Auth:** Clerk
- **Deployment:** Vercel

---

## ⚙️ Persiapan Lingkungan (Environment Setup)

Buat file `.env` di direktori root aplikasi Anda. **PERINGATAN: Jangan pernah membagikan file ini atau mengunggah kredensial asli ke GitHub!**

```env
# Koneksi Database Neon
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]/[DB_NAME]?sslmode=require"

# Kunci Rahasia Clerk (Dapatkan di Dashboard Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_clerk_publishable_key"
CLERK_SECRET_KEY="sk_test_your_clerk_secret_key"
CLERK_WEBHOOK_SECRET="whsec_your_clerk_webhook_secret"
```

📦 Instalasi & Menjalankan Server Lokal

1. Clone Repositori:
   git clone <repository-url>
   cd SMART-NURSING-API
2. Instal Dependensi:
   npm install
3. Sinkronisasi Database (Prisma):
   Pastikan file schema.prisma sudah benar, lalu jalankan perintah ini untuk mengunduh tipe data dan mencocokkan skema ke database:
   npx prisma generate
   npx prisma db push
4. Jalankan Server Development:
   npm run dev
   API akan berjalan di http://localhost:3001 (Konfigurasi port dapat disesuaikan di package.json jika port 3000 digunakan oleh Frontend).

📑 Dokumentasi Endpoint API (Utama)
Semua endpoint di bawah ini WAJIB menyertakan header otorisasi: Authorization: Bearer <CLERK_TOKEN>

1. Monitoring Keluhan Harian

Endpoint: /api/admin/checkin

Method: GET

Akses Role: NURSE

Deskripsi: Menarik seluruh riwayat tele-monitoring keluhan harian pasien untuk ditampilkan di Dashboard Admin.

2. Manajemen Dokumen Medis (RM 14)

Endpoint: /api/admin/rm14

Method: POST

Akses Role: NURSE

Deskripsi: Menyimpan dokumen instruksi kepulangan pasien, termasuk diagnosa akhir, batasan diet, dan jadwal kontrol.

3. Pengambilan Dokumen Medis (RM 14)

Endpoint: /api/admin/rm14

Method: GET

Akses Role: PATIENT / NURSE

Deskripsi: Menarik data RM14 spesifik berdasarkan ID Pasien (digunakan oleh aplikasi pasien dan admin).

4. Pusat Edukasi Kesehatan

Endpoint: /api/admin/edukasi

Method: GET / POST

Akses Role: NURSE

Deskripsi: Mengambil daftar (GET) atau menambahkan (POST) tautan video edukasi kesehatan pasca-rawat.

5. Evaluasi Gizi Pasien

Endpoint: /api/kuis

Method: GET

Akses Role: NURSE

Deskripsi: Menarik hasil skor kuis evaluasi pemahaman gizi dan diet dari seluruh pasien.

🚀 Panduan Deployment (Vercel)
Proyek ini dibangun untuk skalabilitas tinggi di cloud.

Hubungkan repositori GitHub ini ke dashboard Vercel.

Salin seluruh isi dari .env lokal Anda ke menu Environment Variables di pengaturan proyek Vercel.

Vercel akan otomatis menjalankan prisma generate saat build.

Klik Deploy (atau jalankan npx vercel --prod via CLI).
