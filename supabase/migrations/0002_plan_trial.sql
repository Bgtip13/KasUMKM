-- =====================================================================
-- 0002 — PAKET LISENSI & MASA TRIAL
-- Jalankan seluruh file ini di Supabase → SQL Editor (setelah 0001_init.sql).
-- =====================================================================

-- Paket disimpan di tenant, bukan hanya di license_codes, karena tabel
-- license_codes sengaja tidak bisa dibaca pengguna biasa (hanya service role).
-- Setiap halaman /app perlu tahu paket dan sisa masa trial-nya.
alter table public.tenants add column if not exists plan text not null default 'standard';
alter table public.tenants add column if not exists trial_ends_at timestamptz;

alter table public.tenants drop constraint if exists tenants_plan_check;
alter table public.tenants
  add constraint tenants_plan_check check (plan in ('standard', 'pro', 'trial'));

-- Isi paket untuk tenant yang sudah ada dari kode lisensinya.
-- Trial dihitung 24 jam sejak kode dipakai (used_at).
update public.tenants t
set plan = lc.plan,
    trial_ends_at = case
      when lc.plan = 'trial' then coalesce(lc.used_at, lc.created_at) + interval '24 hours'
      else null
    end
from public.license_codes lc
where lc.tenant_id = t.id
  and t.plan = 'standard';
