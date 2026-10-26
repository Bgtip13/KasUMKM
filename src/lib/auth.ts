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

export async function getViewer(): Promise<Viewer> {
  if (!supabaseConfigured()) {
    redirect("/?setup=1");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null, tenant: null, isOwner: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  let tenant: Tenant | null = null;
  if (profile?.tenant_id) {
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", profile.tenant_id)
      .maybeSingle<Tenant>();
    tenant = data ?? null;
  }

  const isOwner =
    profile?.role === "owner" ||
    ownerEmails().includes((user.email ?? "").toLowerCase());

  return { supabase, user, profile, tenant, isOwner };
}

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
