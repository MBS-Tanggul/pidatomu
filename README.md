# Pidatomu — Next.js + Supabase Starter

Struktur ini adalah lanjutan dari `mbs-tanggul.github.io/Pidatomu` (versi static
index.html), dipindah ke Next.js App Router dengan AI generation dan rate
limiting di server-side (bukan lagi API key di localStorage browser).

## Yang sudah ada di starter ini

- `supabase/schema.sql` — tabel `profiles`, `speeches`, `rate_limits` + RPC
  `increment_rate_limit` (atomic, aman dari race condition).
- `lib/ai/groq.ts` & `lib/ai/gemini.ts` — wrapper API masing-masing provider.
- `lib/ai/generate.ts` — orchestrator: coba Groq dulu, fallback ke Gemini
  kalau Groq gagal/limit.
- `lib/rateLimit.ts` — cek & increment kuota harian (5x/hari guest,
  15x/hari user login — bisa diubah di file ini).
- `app/api/generate-pidato/route.ts` — endpoint utama yang dipanggil dari
  form generate di frontend.

## Setup

1. Buat project Next.js (kalau belum):
   ```bash
   npx create-next-app@latest pidatomu-next --typescript --app
   ```
   lalu copy folder `app`, `lib`, `supabase` dari starter ini ke situ (timpa
   yang bentrok).

2. Install dependency:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```

3. Jalankan `supabase/schema.sql` di Supabase Dashboard → SQL Editor
   (atau via Supabase CLI `supabase db push`).

4. Copy `.env.example` → `.env.local`, isi semua key:
   - Supabase URL & keys: Dashboard → Settings → API
   - Groq key: https://console.groq.com (gratis, tinggal daftar)
   - Gemini key: pakai yang sudah kamu punya dari versi sebelumnya

5. Aktifkan provider login yang mau dipakai (misal Google OAuth) di
   Supabase Dashboard → Authentication → Providers, kalau mau fitur login
   opsional-nya jalan.

## Yang belum dibuat (langkah selanjutnya)

- Halaman frontend (`app/page.tsx`) — form input kategori/tema/durasi +
  tombol generate, manggil `POST /api/generate-pidato`.
- `deviceId` generator di client (UUID disimpan di localStorage, dikirim
  di body request kalau user belum login).
- Halaman `app/histori/page.tsx` — nampilin daftar `speeches` milik
  device_id/user yang sedang aktif.
- Tombol "Login biar histori nggak ilang" — pakai
  `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- Migrasi konten 50 tema inspirasi dari versi lama (index.html) ke sini.

## Prinsip penting yang dipakai di sini

- **API key AI tidak pernah ke client** — semua panggilan Groq/Gemini
  terjadi di server (`app/api/generate-pidato/route.ts`), beda dari versi
  lama yang simpan key di localStorage browser.
- **Rate limit di-enforce di database**, bukan cuma di client, supaya
  tidak gampang di-bypass dengan clear cache.
- **Guest & user login berbagi tabel sama** (`speeches`, `rate_limits`)
  lewat kolom `owner_type` + `owner_ref`, jadi tidak perlu duplikasi logic.