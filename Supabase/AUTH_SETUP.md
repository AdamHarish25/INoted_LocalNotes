# Dokumentasi Setup Authentication

Aplikasi ini menggunakan **NextAuth.js v5 (Auth.js)** yang terintegrasi dengan **Supabase** melalui adapter `@auth/supabase-adapter`, dan dikonfigurasi untuk hanya menggunakan provider **Google Account** sebagai metode login/register.

Berbeda dengan proyek Supabase pada umumnya yang menggunakan bawaan Supabase Auth (GoTrue), aplikasi ini membuat skema tabelnya sendiri bernama `next_auth` di database PostgreSQL Supabase untuk menyimpan data User dan Session.

---

## 1. Setup Skema Database di Supabase

Karena proyek ini menggunakan NextAuth.js dan bukan native Supabase Auth, Anda perlu menyiapkan tabel khusus (schema `next_auth`) agar adapter NextAuth dapat menyimpan data login.

1. Buka dashboard Supabase untuk project Anda.
2. Navigasikan ke menu **SQL Editor**.
3. Temukan dan jalankan file `setup_next_auth_schema.sql` (terletak di folder `Supabase/setup_next_auth_schema.sql` pada proyek Anda). 

Script tersebut akan secara otomatis:
- Membuat schema `next_auth`.
- Membuat tabel `users`, `accounts`, `sessions`, dan `verification_tokens`.
- Memberikan izin (*grants*) pada skema dan tabel agar bisa diakses menggunakan `service_role` key.

---

## 2. Setup Google Cloud Console (OAuth)

Agar pengguna bisa login dengan akun Google, Anda perlu melakukan penyetelan OAuth 2.0 Client.

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat atau pilih project yang sudah ada.
3. Masuk ke **APIs & Services > OAuth consent screen** dan konfigurasikan setelan consent (pilih *External* jika untuk publik).
4. Masuk ke tab **Credentials > Create Credentials > OAuth client ID**.
5. Pilih **Web application**.
6. Konfigurasi **Authorized JavaScript origins**:
   - `http://localhost:3000` (Untuk development)
   - `https://domainanda.com` (Untuk production)
7. Konfigurasi **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://domainanda.com/api/auth/callback/google`
8. Setelah dibuat, Anda akan mendapatkan **Client ID** dan **Client Secret**.

---

## 3. Setup Environment Variables `.env.local`

Salin kredensial yang didapatkan dan masukkan ke `.env.local` di folder `web/`:

```env
# 1. Konfigurasi Supabase
# Diperlukan oleh SupabaseAdapter untuk menghubungi database NextAuth schema
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-IN-SUPABASE].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJh...[SERVICE-ROLE-KEY-ANDA]"

# 2. Konfigurasi Google OAuth
# Diambil dari Google Cloud Console
AUTH_GOOGLE_ID="ID-CLIENT-GOOGLE-ANDA.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="SECRET-GOOGLE-ANDA"

# 3. Konfigurasi NextAuth Internal
# Gunakan `npx auth secret` untuk generate random code ini di terminal
AUTH_SECRET="random-base64-secret-key"
```

> **Peringatan:** Untuk `SUPABASE_SERVICE_ROLE_KEY`, pastikan Anda **TIDAK** membocorkan kunci ini ke klien/browser. Hanya gunakan environment variable biasa (tanpa `NEXT_PUBLIC_`).

---

## 4. Cara Kode Bekerja (Penjelasan Singkat)

- **`auth.ts`**: Ini adalah pusat konfigurasi NextAuth. Di file ini, `Google` didaftarkan di dalam list `providers`. Lalu `SupabaseAdapter` disiapkan menggunakan kredensial dari Supabase URL dan Service Role.
- **`app/api/auth/[...nextauth]/route.ts`**: Merupakan App Router endpoint (`GET` dan `POST`) yang merouting semua traffic autentikasi (seperti callback Google) ke framework Core Auth.js.
