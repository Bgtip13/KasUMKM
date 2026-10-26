import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigured } from "@/lib/supabase/server";
import type { Profile, Tenant } from "@/lib/types";

export function ownerEmails() {
  return (process.env.PLATFORM_OWNER_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export type Viewer = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: { id: string; email?: string | null } | null;
  profile: Profile | null;
  tenant: Tenant | null;
  isOwner: boolean;
};

async function loadViewer(): Promise<Viewer> {
  if (!supabaseConfigured()) {
    redirect("/?setup=1");
  }

  const supabase = await createSupabaseServerClient();

  // getClaims() memverifikasi tanda tangan JWT secara lokal terhadap JWKS yang
  // di-cache (10 menit), sehingga TIDAK ada panggilan jaringan ke server auth
  // Supabase di setiap navigasi — getUser() selalu mengirim 1 request penuh.
  // Kalau proyek memakai kunci simetris atau JWKS tidak bisa diambil,
  // getClaims() sendiri otomatis jatuh ke getUser(), jadi biayanya tidak pernah
  // lebih mahal dari sebelumnya.
  const { data: claimData } = await supabase.auth.getClaims();
  const claims = claimData?.claims;
  const user: { id: string; email?: string | null } | null = claims?.sub
    ? { id: claims.sub, email: claims.email ?? null }
    : null;

  if (!user) {
    return { supabase, user: null, profile: null, tenant: null, isOwner: false };
  }

  // Satu request saja: profil + tenant usahanya di-join lewat foreign key.
  // Sebelumnya ini dua query berurutan (profil, lalu tenant).
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*, tenant:tenants(*)")
    .eq("id", user.id)
    .maybeSingle<Profile & { tenant: Tenant | null }>();

  const profile: Profile | null = profileRow
    ? (({ tenant: _ignored, ...fields }) => fields)(profileRow)
    : null;
  const tenant: Tenant | null = profileRow?.tenant ?? null;

  const isOwner =
    profile?.role === "owner" ||
    ownerEmails().includes((user.email ?? "").toLowerCase());

  return { supabase, user, profile, tenant, isOwner };
}

/**
 * Satu request = satu kali ambil sesi, profil, dan tenant.
 *
 * Layout dan halaman di bawahnya sama-sama memanggil getViewer() (melalui
 * requireTenant/requireTenantAdmin), sehingga tanpa cache() setiap halaman akan
 * menjalankan waterfall autentikasi yang sama dua kali. React `cache` mengingat
 * hasilnya untuk seluruh render satu request.
 */
export const getViewer = cache(loadViewer);

/** Admin usaha (pemilik data tenant). Akun kasir tidak termasuk. */
export function isTenantAdmin(profile: Profile | null) {
  return profile?.role === "admin" || profile?.role === "owner";
}

/** Kasir boleh membuka riwayat penjualan hanya jika admin mengizinkannya. */
export function canViewSales(profile: Profile | null) {
  if (isTenantAdmin(profile)) return true;
  return profile?.permissions?.sales === true;
}

export async function requireTenant() {
  const viewer = await getViewer();

  if (!viewer.user) {
    redirect("/login");
  }

  if (viewer.profile && viewer.profile.is_active === false) {
    redirect("/login?disabled=1");
  }

  if (!viewer.profile?.tenant_id || !viewer.tenant) {
    redirect("/register?inactive=1");
  }

  return {
    supabase: viewer.supabase,
    user: viewer.user,
    profile: viewer.profile,
    tenant: viewer.tenant,
  };
}

/** Halaman yang menyentuh harga, stok, kas, dan laba hanya untuk admin usaha. */
export async function requireTenantAdmin() {
  const ctx = await requireTenant();
  if (!isTenantAdmin(ctx.profile)) {
    redirect("/app/pos");
  }
  return ctx;
}

export async function requireSalesAccess() {
  const ctx = await requireTenant();
  if (!canViewSales(ctx.profile)) {
    redirect("/app/pos");
  }
  return ctx;
}

export async function requireOwner() {
  const viewer = await getViewer();

  if (!viewer.user || !viewer.isOwner) {
    redirect("/owner/login");
  }

  return { supabase: viewer.supabase, user: viewer.user };
}
