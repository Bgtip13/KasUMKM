# KasUMKM — Pembukuan, Kasir & Stok untuk UMKM

Aplikasi web (Next.js App Router + Supabase Postgres) untuk pembukuan UMKM: kasir dengan struk
printer thermal, riwayat penjualan & pembelian, stok masuk/keluar/opname, kas di luar transaksi,
dan laporan laba rugi.

## Dua tingkat akun

| Peran | Masuk lewat | Bisa apa |
| --- | --- | --- |
| **Pemilik aplikasi** (Anda, penjual lisensi) | `/owner/login` | Generate & kelola kode lisensi, melihat daftar semua usaha yang aktif |
| **Admin usaha** (pembeli) | `/login` | Kasir, produk, stok, pembelian, kas, laporan — hanya untuk usahanya sendiri |
| **Kasir** (dibuat admin) | `/login` | Hanya menu Kasir; riwayat penjualan opsional. Tidak bisa melihat HPP, kas, laba, atau mengubah stok/harga |

Alur penjualan lisensi:

1. Anda membuat kode di `/owner` (format `KM-XXXX-XXXX`, bisa 1–50 kode sekaligus).
2. Pembeli membuka `/register`, memasukkan kode + data usaha + email/password.
3. Sistem membuat akun admin, satu **tenant** (ruang data) baru, lalu menandai kode terpakai.
4. Kode yang sama tidak bisa dipakai dua kali.

## Isolasi data per kode lisensi

Satu kode lisensi = satu **tenant**. Semua tabel transaksi memiliki `tenant_id` dan dilindungi
Row Level Security Postgres:

- Admin tenant A hanya bisa membaca/menulis baris dengan `tenant_id` miliknya.
- Penulisan transaksi inti hanya lewat fungsi RPC `SECURITY DEFINER` (`create_sale`,
  `create_purchase`, `stock_adjust`, `delete_sale`) supaya stok dan kartu stok selalu konsisten.
- `license_codes` tidak punya policy sama sekali → hanya service role (panel pemilik) yang bisa
  mengakses.
- Perubahan `role`/`tenant_id`/izin pada profil diblokir oleh trigger, jadi admin tidak bisa menaikkan
  dirinya menjadi pemilik aplikasi dan kasir tidak bisa menaikkan izinnya sendiri.
- Kasir hanya mendapat izin baca produk & penjualan. `stock_adjust`, `create_purchase`,
  `delete_sale`, `dashboard_stats`, dan `report_summary` menolak akun selain admin tenant.
- Kolom HPP (`sale_items.unit_cost`) hanya bisa dibaca admin; struk kasir memakai view
  `sale_items_public` yang tidak memuat kolom biaya.

Catatan: permintaan "database terpisah per kode" diterapkan sebagai **satu project Supabase dengan
isolasi tenant di level baris + RLS**, bukan satu project Supabase per pembeli. Untuk ratusan
pembeli, satu project jauh lebih murah dan mudah dirawat, sementara datanya tetap tidak bisa saling
lihat. Kalau nanti butuh benar-benar terpisah secara fisik (misalnya untuk kepatuhan tertentu),
skema di `supabase/migrations/0001_init.sql` bisa dijalankan di project Supabase berbeda per
pelanggan tanpa mengubah kode aplikasi.

## Setup Supabase

Supabase **belum terdaftar** dari sisi saya — pendaftaran butuh login akun Anda di browser, dan
saya tidak memakai password yang ditulis di chat. Langkah yang perlu Anda lakukan:

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
   Pilih region terdekat (mis. Singapore), simpan database password.
2. Buka **SQL Editor** → **New query** → tempel seluruh isi
   `supabase/migrations/0001_init.sql` → **Run**. Semua tabel, RLS, trigger, dan function dibuat
   dalam satu langkah (idempoten, aman dijalankan ulang).
3. Buka **Project Settings → API**, catat:
   - `Project URL`
   - `anon public` key
   - `service_role` key (**rahasia**, hanya untuk server)
4. Simpan kredensial sebagai **secret environment**, bukan di dalam kode. Di Freebuff: **Settings →
   Secrets**. Untuk pengembangan lokal di komputer Anda, gunakan file `.env.local` (tidak ikut
   ter-commit):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   PLATFORM_OWNER_EMAIL=bagustriawancadangan@gmail.com
   NEXT_PUBLIC_APP_NAME=KasUMKM
   ```

5. Jalankan:

   ```bash
   npm install
   npm run dev
   ```

## Akun pertama

1. Buka `http://localhost:3000/owner/login`.
2. Isi email yang sama dengan `PLATFORM_OWNER_EMAIL` dan password minimal 8 karakter, lalu klik
   **Daftar**. Tombol ini hanya berhasil untuk email pemilik.
3. Masuk ke `/owner` → **Generate kode**.
4. Buka `http://localhost:3000/register`, aktivasi salah satu kode untuk membuat akun admin uji
   coba.

## PPN (opsional, diatur sendiri)

Di **Pengaturan → Kenakan PPN** admin menentukan tarif (default 11%) dan cara penagihan:

- **Ditambahkan ke total** — harga barang belum termasuk PPN, struk menampilkan baris PPN.
- **Harga sudah termasuk PPN** — total tidak berubah, PPN dihitung sebagai bagian dari harga.

PPN dihitung di database saat transaksi disimpan (bukan dari angka kiriman browser), tarifnya
disimpan per transaksi (`sales.tax_rate`), dan omzet di laporan sudah bersih dari PPN sehingga laba
tidak ikut menggelembung.

## Akun kasir (sub-akun)

Di **Pengaturan → Akun kasir** admin bisa menambah kasir (nama, email, password awal), memilih apakah
kasir boleh melihat riwayat penjualan, menonaktifkan sementara, atau menghapusnya.

- Kasir yang dinonaktifkan tidak bisa masuk dan langsung kehilangan akses data.
- Kasir tidak bisa: mengubah produk/harga, menyesuaikan stok, mencatat pembelian, membatalkan
  transaksi, membuka kas, atau melihat laporan laba.
- Setiap transaksi mencatat nama kasir (`sales.cashier_name`) yang tampil di struk dan detail.

## Cetak struk thermal

- Setelah transaksi disimpan di kasir, struk terbuka otomatis dengan dialog print
  (`?print=1`).
- Lebar kertas mengikuti pengaturan di **Pengaturan → Lebar printer thermal** (58 mm default,
  bisa 80 mm). Ukuran `@page` ikut disesuaikan.
- Di dialog print Chrome: pilih printer thermal, **Margin: None**, **Scale: 100%**, matikan
  header/footer. Driver printer biasanya sudah menyediakan pilihan 58/80 mm.
- Struk juga bisa dicetak ulang dari riwayat penjualan (tombol **Struk**).

## Deploy ke Vercel

1. Push proyek ini ke repository GitHub/GitLab Anda.
2. Di [vercel.com/new](https://vercel.com/new) import repo tersebut. Framework terdeteksi otomatis
   sebagai Next.js, tidak perlu ubah build command.
3. Tambahkan Environment Variables (Production + Preview):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `PLATFORM_OWNER_EMAIL`, `NEXT_PUBLIC_APP_NAME`.
   **Jangan** pernah memberi prefix `NEXT_PUBLIC_` pada `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy, lalu buka domain Vercel Anda dan login sebagai pemilik.
5. Di Supabase → **Authentication → URL Configuration**, tambahkan domain Vercel ke *Site URL* /
   *Redirect URLs* bila nanti memakai fitur reset password/verifikasi email.

Backend berjalan sebagai Node.js server (Server Actions/Route handlers Next.js) di Vercel, jadi
tidak perlu server terpisah.

## Struktur proyek

```
src/app
  page.tsx                 Landing
  login/                   Login admin usaha
  register/                Aktivasi kode lisensi
  owner/                   Panel pemilik (kode lisensi, daftar usaha)
  app/                     Area admin usaha
    page.tsx               Dashboard
    pos/                   Kasir + simpan transaksi
    sales/                 Riwayat, detail, struk thermal
    purchases/             Riwayat, pembelian baru, detail
    products/              Produk (tambah/ubah/nonaktifkan)
    stock/                 Stok masuk/keluar/opname + kartu stok
    finance/               Kas masuk/keluar di luar jual-beli
    reports/               Laba rugi, rincian biaya, produk terlaris
    settings/              Identitas usaha, PPN, lebar printer, akun kasir
src/lib                    Supabase client, auth, format angka/tanggal
supabase/migrations        Skema database + RLS + RPC
```

## Model data singkat

`tenants`, `profiles`, `license_codes`, `products`, `partners`, `stock_movements`, `sales`,
`sale_items`, `purchases`, `purchase_items`, `cash_transactions`, `document_counters`.

Perhitungan penting:

- **HPP** memakai rata-rata bergerak: setiap pembelian/stok masuk memperbarui `products.cost_price`.
- **Laba kotor** = omzet − (qty terjual × HPP saat transaksi), tersimpan di `sale_items.unit_cost`.
- **Laba bersih** = laba kotor + pemasukan lain − pengeluaran lain.
- **Zona waktu**: semua laporan memakai zona waktu tenant (`Asia/Jakarta` default), bukan UTC.

## Verifikasi yang sudah dilakukan

- `tsc --noEmit` dan `next build` lolos (22 rute).
- Skema SQL dijalankan pada Postgres (PGlite/WASM) dengan stub `auth` Supabase, 37 pengujian lolos:
  penjualan mengurangi stok, penolakan stok kurang, HPP rata-rata, stok masuk/keluar/opname,
  pembatalan penjualan mengembalikan stok, laporan laba rugi, isolasi antar-tenant (baca & tulis),
  penolakan eskalasi role, penolakan hapus transaksi langsung, PPN eksklusif & inklusif (angka dari
  browser diabaikan), serta pembatasan kasir (stok, pembelian, pembatalan, laba, HPP, pengaturan).

Belum diverifikasi (butuh project Supabase + domain Vercel Anda): login end-to-end, cetak fisik ke
printer thermal, dan deploy produksi.
