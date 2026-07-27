# Signal Desk — Dashboard Sinyal AI (Eksperimental)

Dashboard yang menghasilkan sinyal BUY/SELL/HOLD memakai LLM sebagai "analis"
yang membaca price action + indikator teknikal. **Status: eksperimental,
belum tervalidasi** — lihat bagian "Kejujuran" di bawah sebelum pakai.

## Stack

- **Next.js** (App Router) — frontend + API routes, di-hosting di **Vercel**
- **Supabase** — database Postgres untuk simpan sinyal & track record
- **Twelve Data** — sumber data harga (forex + gold + crypto dalam 1 API)
- **Anthropic API** (Claude) — LLM yang berperan sebagai analis

## Kenapa perlu "Track Record" & bukan cuma "sinyal hari ini"

**PENTING:** tidak ada bukti bahwa LLM membaca chart lebih akurat dari
metode lain — termasuk dibanding indikator teknikal yang sudah kita uji
sebelumnya (lihat proyek `afat`, hasilnya nyaris breakeven). Supaya
dashboard ini tidak cuma "kelihatan meyakinkan" tanpa dasar, setiap sinyal
WAJIB dicatat dan divalidasi otomatis beberapa jam kemudian (`/api/validate-signals`,
jalan tiap jam lewat Vercel Cron) terhadap harga sungguhan. Dashboard
menampilkan win rate ini secara terbuka — **percaya pada track record-nya,
bukan pada satu sinyal yang kelihatan meyakinkan**.

## Setup — urutan yang harus diikuti

### 1. Supabase (database)
1. Buat project baru di https://supabase.com
2. Buka **SQL Editor**, jalankan isi file `supabase/schema.sql`
3. Ambil `Project URL` dan `service_role key` dari **Project Settings > API**

### 2. Twelve Data (data harga)
1. Daftar gratis di https://twelvedata.com/pricing (free tier: 800 request/hari)
2. Ambil API key dari dashboard mereka

### 3. OpenCode Zen (LLM analis)
1. Buat API key di dashboard workspace kamu: https://opencode.ai/workspace/wrk_01KYGG4THN8WNMDZ2C3CS8JES0

### 4. GitHub
```bash
git init
git add .
git commit -m "Initial commit: signal dashboard"
git remote add origin <URL_REPO_GITHUB_KAMU>
git push -u origin main
```

### 5. Vercel (hosting)
1. Buka https://vercel.com, klik **New Project**, import repo GitHub kamu
2. Di **Environment Variables**, isi semua yang ada di `.env.example`:
   - `TWELVE_DATA_API_KEY`
   - `OPENCODE_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET` (isi string acak apa saja, mis. hasil dari `openssl rand -hex 16`)
3. Deploy

Vercel Cron (`vercel.json`) otomatis jalan tiap jam untuk validasi sinyal —
tidak perlu setup tambahan, tapi **cron cuma aktif di paket Vercel yang
mendukungnya** (Hobby plan dibatasi ke 1x/hari untuk cron; kalau mau tiap
jam, mungkin perlu Pro plan, atau ubah `schedule` di `vercel.json` jadi
`"0 0 * * *"` untuk 1x sehari).

## Menjalankan lokal (development)

```bash
npm install
cp .env.example .env.local   # isi semua API key
npm run dev
```
Buka http://localhost:3000

## Struktur proyek

```
signal-dashboard/
├── app/
│   ├── page.tsx                    # dashboard utama
│   ├── layout.tsx
│   ├── GenerateButton.tsx          # tombol trigger generate sinyal
│   ├── ConfidenceCandle.tsx        # meter kepercayaan (elemen signature)
│   └── api/
│       ├── generate-signals/       # panggil LLM, simpan ke Supabase
│       └── validate-signals/       # cek sinyal lama vs harga sungguhan (cron)
├── lib/
│   ├── config.ts                   # daftar simbol & parameter
│   ├── marketdata.ts                # fetch candle dari Twelve Data
│   ├── indicators.ts                # RSI/MACD/ATR/Bollinger/ADX/Stochastic
│   ├── llm.ts                       # prompt ke Claude, parse output JSON
│   └── supabase.ts
└── supabase/schema.sql              # skema tabel signals
```

## Kejujuran soal keterbatasan ini

- **Bukan sinyal yang terbukti akurat.** LLM yang membaca candlestick + indikator
  tidak otomatis lebih baik dari model ML yang sudah kita uji ketat sebelumnya
  (yang hasilnya nyaris breakeven). Anggap ini eksperimen, bukan sistem siap pakai.
- **Threshold validasi** (`VALIDATION_THRESHOLD_PCT` di `lib/config.ts`) menentukan
  kapan sinyal dianggap "benar" — default 0.15% pergerakan harga dalam 4 jam.
  Sesuaikan kalau perlu, tapi jangan ubah supaya kelihatan lebih akurat dari
  aslinya (itu mengalahkan tujuan validasi).
- Track record butuh waktu untuk terkumpul (minimal beberapa hari) sebelum
  win rate-nya cukup bermakna secara statistik — sama seperti pelajaran dari
  proyek `afat`, jangan percaya sampel kecil (lihat histori riset di sana).
