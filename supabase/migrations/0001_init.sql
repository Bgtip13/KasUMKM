-- =====================================================================
-- KasUMKM — skema database Supabase
-- Jalankan seluruh file ini di Supabase SQL Editor (atau `supabase db push`).
-- Model isolasi data: satu database, setiap kode lisensi = satu "tenant".
-- Semua tabel transaksi memiliki tenant_id dan dilindungi Row Level Security,
-- sehingga admin tenant A tidak mungkin membaca data tenant B.
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. TENANT (satu tenant = satu kode lisensi yang sudah diaktivasi)
-- =====================================================================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid references auth.users (id) on delete set null,
  phone text,
  address text,
  receipt_footer text not null default 'Terima kasih atas kunjungan Anda',
  receipt_width text not null default '58' check (receipt_width in ('58', '80')),
  timezone text not null default 'Asia/Jakarta',
  -- PPN: diatur sendiri oleh admin usaha. Default mati agar struk warung tetap sederhana.
  tax_enabled boolean not null default false,
  tax_rate numeric(5, 2) not null default 11 check (tax_rate >= 0 and tax_rate <= 100),
  -- true = harga jual sudah termasuk PPN, false = PPN ditambahkan di atas harga.
  tax_inclusive boolean not null default false,
  created_at timestamptz not null default now()
);

-- Menambahkan kolom baru pada database yang sudah dibuat sebelum fitur PPN ada.
alter table public.tenants add column if not exists tax_enabled boolean not null default false;
alter table public.tenants add column if not exists tax_rate numeric(5, 2) not null default 11;
alter table public.tenants add column if not exists tax_inclusive boolean not null default false;

-- =====================================================================
-- 2. PROFIL PENGGUNA (2 tingkat akun: owner platform & admin tenant)
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'admin' check (role in ('owner', 'admin', 'staff')),
  tenant_id uuid references public.tenants (id) on delete cascade,
  -- Izin tambahan untuk akun kasir (staff). Admin selalu punya semua izin.
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists profiles_tenant_idx on public.profiles (tenant_id);

-- Database lama: tambahkan kolom & longgarkan daftar role (owner, admin, staff).
alter table public.profiles add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'admin', 'staff'));

-- =====================================================================
-- 3. KODE LISENSI (dibuat pemilik aplikasi, dipakai untuk mendaftar admin)
-- =====================================================================
create table if not exists public.license_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  plan text not null default 'standard',
  status text not null default 'unused' check (status in ('unused', 'used', 'revoked')),
  note text,
  tenant_id uuid references public.tenants (id) on delete set null,
  used_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create unique index if not exists license_codes_code_key on public.license_codes (upper(code));

-- =====================================================================
-- 4. FUNGSI BANTU UNTUK RLS
-- =====================================================================
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles
  where id = auth.uid() and is_active and role in ('admin', 'staff');
$$;

-- Admin usaha (bukan kasir) — dipakai untuk mengunci aksi sensitif di database.
create or replace function public.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role in ('admin', 'owner')
  );
$$;

create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false);
$$;

-- Profil otomatis dibuat setiap ada user baru di Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================================
-- 5. MASTER DATA
-- =====================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sku text,
  name text not null,
  category text,
  unit text not null default 'pcs',
  cost_price numeric(14, 2) not null default 0,
  sell_price numeric(14, 2) not null default 0,
  stock numeric(14, 2) not null default 0,
  min_stock numeric(14, 2) not null default 0,
  track_stock boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists products_tenant_idx on public.products (tenant_id);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  type text not null check (type in ('customer', 'supplier')),
  phone text,
  address text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists partners_tenant_idx on public.partners (tenant_id);

-- =====================================================================
-- 6. PERSEDIAAN
-- =====================================================================
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  type text not null check (type in ('in', 'out', 'sale', 'purchase', 'opname', 'cancel')),
  qty numeric(14, 2) not null,
  stock_before numeric(14, 2) not null default 0,
  stock_after numeric(14, 2) not null default 0,
  unit_cost numeric(14, 2) not null default 0,
  ref_type text,
  ref_id uuid,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_tenant_idx on public.stock_movements (tenant_id, created_at desc);
create index if not exists stock_movements_product_idx on public.stock_movements (product_id);

-- =====================================================================
-- 7. PENJUALAN
-- =====================================================================
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  invoice_no text not null,
  customer_name text not null default 'Umum',
  partner_id uuid references public.partners (id) on delete set null,
  subtotal numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  paid numeric(14, 2) not null default 0,
  change numeric(14, 2) not null default 0,
  payment_method text not null default 'cash',
  status text not null default 'paid' check (status in ('paid', 'unpaid')),
  note text,
  sold_at timestamptz not null default now(),
  -- Tarif PPN saat transaksi terjadi, supaya struk lama tidak berubah saat tarif diganti.
  tax_rate numeric(5, 2) not null default 0,
  cashier_name text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, invoice_no)
);

alter table public.sales add column if not exists tax_rate numeric(5, 2) not null default 0;
alter table public.sales add column if not exists cashier_name text;

create index if not exists sales_tenant_date_idx on public.sales (tenant_id, sold_at desc);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  qty numeric(14, 2) not null check (qty > 0),
  unit_price numeric(14, 2) not null default 0,
  unit_cost numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  subtotal numeric(14, 2) not null default 0
);

create index if not exists sale_items_sale_idx on public.sale_items (sale_id);

-- =====================================================================
-- 8. PEMBELIAN
-- =====================================================================
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  purchase_no text not null,
  supplier_name text not null default 'Umum',
  partner_id uuid references public.partners (id) on delete set null,
  total numeric(14, 2) not null default 0,
  paid numeric(14, 2) not null default 0,
  status text not null default 'paid' check (status in ('paid', 'unpaid')),
  note text,
  purchased_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, purchase_no)
);

create index if not exists purchases_tenant_date_idx on public.purchases (tenant_id, purchased_at desc);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  qty numeric(14, 2) not null check (qty > 0),
  unit_cost numeric(14, 2) not null default 0,
  subtotal numeric(14, 2) not null default 0
);

create index if not exists purchase_items_purchase_idx on public.purchase_items (purchase_id);

-- =====================================================================
-- 9. KAS DI LUAR PENJUALAN/PEMBELIAN (sewa, listrik, modal, dsb.)
-- =====================================================================
create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(14, 2) not null check (amount > 0),
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists cash_transactions_tenant_idx on public.cash_transactions (tenant_id, occurred_at desc);

-- =====================================================================
-- 10. PENOMORAN DOKUMEN PER TENANT
-- =====================================================================
create table if not exists public.document_counters (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null,
  last_number integer not null default 0,
  primary key (tenant_id, kind)
);

create or replace function public.next_document_number(p_tenant uuid, p_kind text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  if p_tenant is null or (p_tenant <> public.current_tenant_id() and not public.is_platform_owner()) then
    raise exception 'Akses ditolak.';
  end if;

  insert into public.document_counters (tenant_id, kind, last_number)
  values (p_tenant, p_kind, 1)
  on conflict (tenant_id, kind) do update set last_number = public.document_counters.last_number + 1
  returning last_number into v_number;

  return p_prefix || '-' || lpad(v_number::text, 5, '0');
end;
$$;

-- =====================================================================
-- 11. RPC: BUAT PENJUALAN (atomik: header + item + stok + kartu stok)
-- =====================================================================
create or replace function public.create_sale(
  p_customer_name text default 'Umum',
  p_partner_id uuid default null,
  p_discount numeric default 0,
  p_tax numeric default 0,
  p_paid numeric default 0,
  p_payment_method text default 'cash',
  p_note text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_sale_id uuid := gen_random_uuid();
  v_invoice text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_price numeric;
  v_disc numeric;
  v_sub numeric;
  v_subtotal numeric := 0;
  v_total numeric;
  v_paid numeric := coalesce(p_paid, 0);
  v_change numeric;
  v_base numeric;
  v_tax numeric := 0;
  v_tax_enabled boolean := false;
  v_tax_inclusive boolean := false;
  v_tax_rate numeric := 0;
  v_cashier text;
  v_uid uuid := auth.uid();
begin
  if v_tenant is null then
    raise exception 'Akun ini belum terhubung ke tenant mana pun.';
  end if;

  if coalesce(jsonb_array_length(p_items), 0) = 0 then
    raise exception 'Keranjang masih kosong.';
  end if;

  v_invoice := public.next_document_number(v_tenant, 'sale', 'INV');

  insert into public.sales (
    id, tenant_id, invoice_no, customer_name, partner_id, subtotal,
    discount, tax, total, paid, payment_method, note, status, created_by
  ) values (
    v_sale_id, v_tenant, v_invoice, coalesce(nullif(p_customer_name, ''), 'Umum'), p_partner_id, 0,
    0, 0, 0, 0, coalesce(p_payment_method, 'cash'), p_note, 'unpaid', v_uid
  );

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid and tenant_id = v_tenant
    for update;

    if not found then
      raise exception 'Produk tidak ditemukan pada tenant ini.';
    end if;

    v_qty := coalesce((v_item ->> 'qty')::numeric, 0);
    if v_qty <= 0 then
      raise exception 'Jumlah barang harus lebih dari 0.';
    end if;

    v_price := coalesce((v_item ->> 'unit_price')::numeric, v_product.sell_price);
    v_disc := coalesce((v_item ->> 'discount')::numeric, 0);
    v_sub := (v_qty * v_price) - v_disc;
    v_subtotal := v_subtotal + v_sub;

    insert into public.sale_items (
      tenant_id, sale_id, product_id, product_name, qty, unit_price, unit_cost, discount, subtotal
    ) values (
      v_tenant, v_sale_id, v_product.id, v_product.name, v_qty, v_price, v_product.cost_price, v_disc, v_sub
    );

    if v_product.track_stock then
      if v_product.stock < v_qty then
        raise exception 'Stok % tidak cukup (tersisa %).', v_product.name, v_product.stock;
      end if;

      update public.products set stock = stock - v_qty where id = v_product.id;

      insert into public.stock_movements (
        tenant_id, product_id, type, qty, stock_before, stock_after, unit_cost, ref_type, ref_id, note, created_by
      ) values (
        v_tenant, v_product.id, 'sale', -v_qty, v_product.stock, v_product.stock - v_qty,
        v_product.cost_price, 'sale', v_sale_id, 'Penjualan ' || v_invoice, v_uid
      );
    end if;
  end loop;

  -- PPN selalu dihitung di server dari pengaturan tenant, bukan dari angka kiriman browser.
  select coalesce(tax_enabled, false), coalesce(tax_rate, 0), coalesce(tax_inclusive, false)
    into v_tax_enabled, v_tax_rate, v_tax_inclusive
  from public.tenants where id = v_tenant;

  select coalesce(nullif(full_name, ''), email) into v_cashier
  from public.profiles where id = v_uid;

  v_base := greatest(v_subtotal - coalesce(p_discount, 0), 0);

  if v_tax_enabled and v_tax_rate > 0 then
    if v_tax_inclusive then
      v_tax := round(v_base * v_tax_rate / (100 + v_tax_rate), 0);
      v_total := v_base;
    else
      v_tax := round(v_base * v_tax_rate / 100, 0);
      v_total := v_base + v_tax;
    end if;
  else
    v_total := v_base;
  end if;

  v_change := greatest(v_paid - v_total, 0);

  update public.sales
  set subtotal = v_subtotal,
      discount = coalesce(p_discount, 0),
      tax = v_tax,
      tax_rate = case when v_tax_enabled then v_tax_rate else 0 end,
      total = v_total,
      paid = v_paid,
      change = v_change,
      cashier_name = v_cashier,
      status = case when v_paid >= v_total then 'paid' else 'unpaid' end
  where id = v_sale_id;

  return jsonb_build_object(
    'id', v_sale_id,
    'invoice_no', v_invoice,
    'total', v_total,
    'change', v_change,
    'status', case when v_paid >= v_total then 'paid' else 'unpaid' end
  );
end;
$$;

-- =====================================================================
-- 12. RPC: BATALKAN PENJUALAN (stok dikembalikan)
-- =====================================================================
create or replace function public.delete_sale(p_sale_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_sale public.sales%rowtype;
  v_item public.sale_items%rowtype;
  v_product public.products%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_tenant is null then
    raise exception 'Akses ditolak.';
  end if;

  if not public.is_tenant_admin() then
    raise exception 'Hanya admin usaha yang boleh membatalkan transaksi.';
  end if;

  select * into v_sale from public.sales where id = p_sale_id and tenant_id = v_tenant;
  if not found then
    raise exception 'Transaksi tidak ditemukan.';
  end if;

  for v_item in select * from public.sale_items where sale_id = p_sale_id loop
    if v_item.product_id is not null then
      select * into v_product from public.products where id = v_item.product_id for update;
      if found and v_product.track_stock then
        update public.products set stock = stock + v_item.qty where id = v_product.id;
        insert into public.stock_movements (
          tenant_id, product_id, type, qty, stock_before, stock_after, unit_cost, ref_type, ref_id, note, created_by
        ) values (
          v_tenant, v_product.id, 'cancel', v_item.qty, v_product.stock, v_product.stock + v_item.qty,
          v_item.unit_cost, 'sale_cancel', p_sale_id, 'Pembatalan ' || v_sale.invoice_no, v_uid
        );
      end if;
    end if;
  end loop;

  delete from public.sales where id = p_sale_id;
  return true;
end;
$$;

-- =====================================================================
-- 13. RPC: BUAT PEMBELIAN (stok bertambah, HPP rata-rata bergerak)
-- =====================================================================
create or replace function public.create_purchase(
  p_supplier_name text default 'Umum',
  p_partner_id uuid default null,
  p_paid numeric default 0,
  p_note text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_id uuid := gen_random_uuid();
  v_no text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_cost numeric;
  v_sub numeric;
  v_total numeric := 0;
  v_paid numeric := coalesce(p_paid, 0);
  v_old_stock numeric;
  v_new_stock numeric;
  v_new_cost numeric;
  v_uid uuid := auth.uid();
begin
  if v_tenant is null then
    raise exception 'Akun ini belum terhubung ke tenant mana pun.';
  end if;

  if not public.is_tenant_admin() then
    raise exception 'Hanya admin usaha yang boleh mencatat pembelian.';
  end if;

  if coalesce(jsonb_array_length(p_items), 0) = 0 then
    raise exception 'Belum ada barang yang dibeli.';
  end if;

  v_no := public.next_document_number(v_tenant, 'purchase', 'PO');

  insert into public.purchases (
    id, tenant_id, purchase_no, supplier_name, partner_id, total, paid, status, note, created_by
  ) values (
    v_id, v_tenant, v_no, coalesce(nullif(p_supplier_name, ''), 'Umum'), p_partner_id, 0, v_paid, 'unpaid', p_note, v_uid
  );

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid and tenant_id = v_tenant
    for update;

    if not found then
      raise exception 'Produk tidak ditemukan pada tenant ini.';
    end if;

    v_qty := coalesce((v_item ->> 'qty')::numeric, 0);
    v_cost := coalesce((v_item ->> 'unit_cost')::numeric, v_product.cost_price);
    if v_qty <= 0 then
      raise exception 'Jumlah barang harus lebih dari 0.';
    end if;

    v_sub := v_qty * v_cost;
    v_total := v_total + v_sub;

    v_old_stock := greatest(v_product.stock, 0);
    v_new_stock := v_product.stock + v_qty;
    if v_old_stock + v_qty > 0 then
      v_new_cost := round(((v_old_stock * v_product.cost_price) + (v_qty * v_cost)) / (v_old_stock + v_qty), 2);
    else
      v_new_cost := v_cost;
    end if;

    update public.products
    set stock = stock + v_qty,
        cost_price = v_new_cost
    where id = v_product.id;

    insert into public.stock_movements (
      tenant_id, product_id, type, qty, stock_before, stock_after, unit_cost, ref_type, ref_id, note, created_by
    ) values (
      v_tenant, v_product.id, 'purchase', v_qty, v_product.stock, v_product.stock + v_qty,
      v_cost, 'purchase', v_id, 'Pembelian ' || v_no, v_uid
    );

    insert into public.purchase_items (
      tenant_id, purchase_id, product_id, product_name, qty, unit_cost, subtotal
    ) values (
      v_tenant, v_id, v_product.id, v_product.name, v_qty, v_cost, v_sub
    );
  end loop;

  update public.purchases
  set total = v_total,
      status = case when v_paid >= v_total then 'paid' else 'unpaid' end
  where id = v_id;

  return jsonb_build_object(
    'id', v_id,
    'purchase_no', v_no,
    'total', v_total,
    'status', case when v_paid >= v_total then 'paid' else 'unpaid' end
  );
end;
$$;

-- =====================================================================
-- 14. RPC: STOK MASUK / KELUAR / OPNAME
-- =====================================================================
create or replace function public.stock_adjust(
  p_product_id uuid,
  p_type text,
  p_qty numeric,
  p_unit_cost numeric default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_product public.products%rowtype;
  v_delta numeric;
  v_before numeric;
  v_after numeric;
  v_cost numeric;
  v_uid uuid := auth.uid();
begin
  if v_tenant is null then
    raise exception 'Akses ditolak.';
  end if;

  if not public.is_tenant_admin() then
    raise exception 'Hanya admin usaha yang boleh menyesuaikan stok.';
  end if;

  if p_type not in ('in', 'out', 'opname') then
    raise exception 'Jenis pergerakan stok tidak dikenal.';
  end if;

  select * into v_product from public.products where id = p_product_id and tenant_id = v_tenant for update;
  if not found then
    raise exception 'Produk tidak ditemukan.';
  end if;

  v_before := v_product.stock;

  if p_type = 'in' then
    v_delta := p_qty;
  elsif p_type = 'out' then
    v_delta := -p_qty;
  else
    -- opname: p_qty adalah stok fisik hasil hitung, delta dihitung otomatis
    v_delta := p_qty - v_before;
  end if;

  v_after := v_before + v_delta;
  if v_after < 0 then
    raise exception 'Stok % tidak boleh negatif (stok saat ini %).', v_product.name, v_before;
  end if;

  v_cost := coalesce(p_unit_cost, v_product.cost_price);

  update public.products
  set stock = v_after,
      cost_price = case when p_type = 'in' and p_unit_cost is not null and v_after > 0
        then round(((greatest(v_before, 0) * v_product.cost_price) + (p_qty * p_unit_cost)) / (greatest(v_before, 0) + p_qty), 2)
        else v_product.cost_price end
  where id = v_product.id;

  insert into public.stock_movements (
    tenant_id, product_id, type, qty, stock_before, stock_after, unit_cost, ref_type, note, created_by
  ) values (
    v_tenant, v_product.id, p_type, v_delta, v_before, v_after, v_cost,
    case when p_type = 'opname' then 'opname' else 'manual' end,
    coalesce(nullif(p_note, ''), case when p_type = 'opname' then 'Stok opname' else 'Penyesuaian stok' end),
    v_uid
  );

  return jsonb_build_object('stock', v_after, 'change', v_delta);
end;
$$;

-- =====================================================================
-- 15. RPC: RINGKASAN DASHBOARD
-- =====================================================================
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_tz text;
  v_today date;
  v_month_start date;
  v_result jsonb;
begin
  if v_tenant is null then
    raise exception 'Akses ditolak.';
  end if;

  if not public.is_tenant_admin() then
    raise exception 'Hanya admin usaha yang boleh melihat laporan.';
  end if;

  select timezone into v_tz from public.tenants where id = v_tenant;
  v_tz := coalesce(v_tz, 'Asia/Jakarta');
  v_today := (now() at time zone v_tz)::date;
  v_month_start := date_trunc('month', v_today)::date;

  select jsonb_build_object(
    'revenue_today', coalesce((
      select sum(total - tax) from public.sales
      where tenant_id = v_tenant and (sold_at at time zone v_tz)::date = v_today
    ), 0),
    'tax_today', coalesce((
      select sum(tax) from public.sales
      where tenant_id = v_tenant and (sold_at at time zone v_tz)::date = v_today
    ), 0),
    'transactions_today', coalesce((
      select count(*) from public.sales
      where tenant_id = v_tenant and (sold_at at time zone v_tz)::date = v_today
    ), 0),
    'revenue_month', coalesce((
      select sum(total - tax) from public.sales
      where tenant_id = v_tenant
        and (sold_at at time zone v_tz)::date >= v_month_start
    ), 0),
    'profit_month', coalesce((
      select sum(si.subtotal - (si.qty * si.unit_cost))
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
      where s.tenant_id = v_tenant and (s.sold_at at time zone v_tz)::date >= v_month_start
    ), 0),
    'cash_balance', coalesce((
      select sum(paid) from public.sales where tenant_id = v_tenant
    ), 0)
    + coalesce((select sum(amount) from public.cash_transactions where tenant_id = v_tenant and type = 'income'), 0)
    - coalesce((select sum(amount) from public.cash_transactions where tenant_id = v_tenant and type = 'expense'), 0)
    - coalesce((select sum(paid) from public.purchases where tenant_id = v_tenant), 0),
    'receivable', coalesce((
      select sum(total - paid) from public.sales where tenant_id = v_tenant and status = 'unpaid'
    ), 0),
    'payable', coalesce((
      select sum(total - paid) from public.purchases where tenant_id = v_tenant and status = 'unpaid'
    ), 0),
    'product_count', coalesce((
      select count(*) from public.products where tenant_id = v_tenant and is_active
    ), 0),
    'low_stock_count', coalesce((
      select count(*) from public.products
      where tenant_id = v_tenant and is_active and track_stock and stock <= min_stock
    ), 0),
    'stock_value', coalesce((
      select sum(stock * cost_price) from public.products where tenant_id = v_tenant and is_active
    ), 0)
  ) into v_result;

  return v_result;
end;
$$;

-- =====================================================================
-- 16. RPC: LAPORAN LABA RUGI & ARUS KAS
-- =====================================================================
create or replace function public.report_summary(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_tz text;
  v_result jsonb;
begin
  if v_tenant is null then
    raise exception 'Akses ditolak.';
  end if;

  if not public.is_tenant_admin() then
    raise exception 'Hanya admin usaha yang boleh melihat laporan.';
  end if;

  select timezone into v_tz from public.tenants where id = v_tenant;
  v_tz := coalesce(v_tz, 'Asia/Jakarta');

  select jsonb_build_object(
    'revenue', coalesce((
      select sum(total - tax) from public.sales
      where tenant_id = v_tenant and (sold_at at time zone v_tz)::date between p_from and p_to
    ), 0),
    'tax', coalesce((
      select sum(tax) from public.sales
      where tenant_id = v_tenant and (sold_at at time zone v_tz)::date between p_from and p_to
    ), 0),
    'sales_count', coalesce((
      select count(*) from public.sales
      where tenant_id = v_tenant and (sold_at at time zone v_tz)::date between p_from and p_to
    ), 0),
    'cogs', coalesce((
      select sum(si.qty * si.unit_cost)
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
      where s.tenant_id = v_tenant and (s.sold_at at time zone v_tz)::date between p_from and p_to
    ), 0),
    'discount', coalesce((
      select sum(discount) from public.sales
      where tenant_id = v_tenant and (sold_at at time zone v_tz)::date between p_from and p_to
    ), 0),
    'purchase_total', coalesce((
      select sum(total) from public.purchases
      where tenant_id = v_tenant and (purchased_at at time zone v_tz)::date between p_from and p_to
    ), 0),
    'other_income', coalesce((
      select sum(amount) from public.cash_transactions
      where tenant_id = v_tenant and type = 'income' and (occurred_at at time zone v_tz)::date between p_from and p_to
    ), 0),
    'other_expense', coalesce((
      select sum(amount) from public.cash_transactions
      where tenant_id = v_tenant and type = 'expense' and (occurred_at at time zone v_tz)::date between p_from and p_to
    ), 0),
    'expense_by_category', coalesce((
      select jsonb_agg(x) from (
        select category, sum(amount) as amount
        from public.cash_transactions
        where tenant_id = v_tenant and type = 'expense' and (occurred_at at time zone v_tz)::date between p_from and p_to
        group by category
        order by sum(amount) desc
      ) x
    ), '[]'::jsonb),
    'income_by_category', coalesce((
      select jsonb_agg(x) from (
        select category, sum(amount) as amount
        from public.cash_transactions
        where tenant_id = v_tenant and type = 'income' and (occurred_at at time zone v_tz)::date between p_from and p_to
        group by category
        order by sum(amount) desc
      ) x
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(x) from (
        select si.product_name as name,
               sum(si.qty) as qty,
               sum(si.subtotal) as revenue,
               sum(si.subtotal - (si.qty * si.unit_cost)) as profit
        from public.sale_items si
        join public.sales s on s.id = si.sale_id
        where s.tenant_id = v_tenant and (s.sold_at at time zone v_tz)::date between p_from and p_to
        group by si.product_name
        order by sum(si.subtotal) desc
        limit 10
      ) x
    ), '[]'::jsonb),
    'daily_sales', coalesce((
      select jsonb_agg(x) from (
        select (sold_at at time zone v_tz)::date as date, sum(total - tax) as total, count(*) as transactions
        from public.sales
        where tenant_id = v_tenant and (sold_at at time zone v_tz)::date between p_from and p_to
        group by (sold_at at time zone v_tz)::date
        order by (sold_at at time zone v_tz)::date
      ) x
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- =====================================================================
-- 16b. RPC: RINGKASAN SEMUA USAHA (hanya pemilik aplikasi)
-- =====================================================================
create or replace function public.owner_tenant_overview()
returns table (
  tenant_id uuid,
  name text,
  admin_email text,
  created_at timestamptz,
  product_count bigint,
  sales_count bigint,
  revenue numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.name,
    (select p.email from public.profiles p where p.tenant_id = t.id and p.role = 'admin' order by p.created_at limit 1),
    t.created_at,
    (select count(*) from public.products pr where pr.tenant_id = t.id),
    (select count(*) from public.sales s where s.tenant_id = t.id),
    (select coalesce(sum(s.total), 0) from public.sales s where s.tenant_id = t.id)
  from public.tenants t
  where public.is_platform_owner()
  order by t.created_at desc;
$$;

-- =====================================================================
-- 17. ROW LEVEL SECURITY
-- =====================================================================
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.license_codes enable row level security;
alter table public.products enable row level security;
alter table public.partners enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.document_counters enable row level security;

-- profiles: hanya milik sendiri
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_platform_owner()
    or (public.is_tenant_admin() and tenant_id = public.current_tenant_id())
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin tenant tidak boleh menaikkan role-nya sendiri menjadi pemilik aplikasi,
-- dan tidak boleh berpindah tenant. Perubahan ini hanya boleh lewat service role.
create or replace function public.prevent_profile_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     or new.tenant_id is distinct from old.tenant_id
     or new.permissions is distinct from old.permissions
     or new.is_active is distinct from old.is_active then
    if auth.uid() is not null then
      raise exception 'Perubahan role, tenant, atau izin tidak diizinkan dari sisi klien.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_change on public.profiles;
create trigger prevent_profile_privilege_change
before update on public.profiles
for each row execute function public.prevent_profile_privilege_change();

-- tenants: anggota tenant bisa membaca & memperbarui identitas usahanya
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id() or public.is_platform_owner());

drop policy if exists tenants_update on public.tenants;
create policy tenants_update on public.tenants
  for update to authenticated
  using (id = public.current_tenant_id() and public.is_tenant_admin())
  with check (id = public.current_tenant_id() and public.is_tenant_admin());

-- Tabel transaksi: hanya boleh DIBACA langsung oleh tenant.
-- Penulisan lewat RPC (SECURITY DEFINER) agar stok, kartu stok, dan nominal
-- selalu konsisten. Ini mencegah transaksi dihapus lewat REST tanpa
-- mengembalikan stok.
do $$
declare
  t text;
begin
  foreach t in array array[
    'sales', 'document_counters'
  ] loop
    execute format('drop policy if exists %I_tenant_read on public.%I', t, t);
    execute format(
      'create policy %I_tenant_read on public.%I for select to authenticated
       using (tenant_id = public.current_tenant_id())', t, t
    );
  end loop;

  -- Data yang memuat HPP/harga beli hanya untuk admin usaha.
  foreach t in array array[
    'sale_items', 'purchases', 'purchase_items', 'stock_movements'
  ] loop
    execute format('drop policy if exists %I_tenant_read on public.%I', t, t);
    execute format(
      'create policy %I_tenant_read on public.%I for select to authenticated
       using (tenant_id = public.current_tenant_id() and public.is_tenant_admin())', t, t
    );
  end loop;
end;
$$;

-- Kasir boleh melihat produk, tetapi tidak boleh mengubahnya.
do $$
declare
  t text;
begin
  foreach t in array array['products', 'partners'] loop
    execute format('drop policy if exists %I_tenant_all on public.%I', t, t);
    execute format('drop policy if exists %I_tenant_read on public.%I', t, t);
    execute format('drop policy if exists %I_tenant_write on public.%I', t, t);
    execute format(
      'create policy %I_tenant_read on public.%I for select to authenticated
       using (tenant_id = public.current_tenant_id())', t, t
    );
    execute format(
      'create policy %I_tenant_write on public.%I for all to authenticated
       using (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
       with check (tenant_id = public.current_tenant_id() and public.is_tenant_admin())', t, t
    );
  end loop;
end;
$$;

-- Kas di luar jual-beli hanya untuk admin (berisi biaya & modal usaha).
drop policy if exists cash_transactions_tenant_all on public.cash_transactions;
drop policy if exists cash_transactions_tenant_read on public.cash_transactions;
drop policy if exists cash_transactions_tenant_write on public.cash_transactions;
create policy cash_transactions_tenant_read on public.cash_transactions
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_tenant_admin());
create policy cash_transactions_tenant_write on public.cash_transactions
  for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

-- Rincian item untuk struk: kasir boleh membaca nama, jumlah, dan harga,
-- tetapi kolom HPP (unit_cost) tidak ikut. View ini milik pemilik tabel
-- sehingga tetap menyaring tenant lewat current_tenant_id().
create or replace view public.sale_items_public
with (security_invoker = false) as
select id, tenant_id, sale_id, product_id, product_name, qty, unit_price, discount, subtotal
from public.sale_items
where tenant_id = public.current_tenant_id();

grant select on public.sale_items_public to authenticated;

-- license_codes: tidak ada policy -> hanya service role (panel pemilik) yang bisa akses

-- =====================================================================
-- 18. HAK AKSES
-- =====================================================================
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.tenants, public.profiles, public.products, public.partners,
  public.stock_movements, public.sales, public.sale_items, public.purchases,
  public.purchase_items, public.cash_transactions, public.document_counters
to authenticated;

revoke all on public.license_codes from anon, authenticated;

grant execute on function
  public.current_tenant_id(),
  public.is_tenant_admin(),
  public.is_platform_owner(),
  public.next_document_number(uuid, text, text),
  public.create_sale(text, uuid, numeric, numeric, numeric, text, text, jsonb),
  public.create_purchase(text, uuid, numeric, text, jsonb),
  public.delete_sale(uuid),
  public.stock_adjust(uuid, text, numeric, numeric, text),
  public.dashboard_stats(),
  public.report_summary(date, date),
  public.owner_tenant_overview()
to authenticated;

-- =====================================================================
-- 19. TAMPILAN AWAL (opsional, aman dihapus)
-- Tidak ada data contoh. Setelah login sebagai admin tenant, tambahkan
-- produk lewat menu Produk.
-- =====================================================================
