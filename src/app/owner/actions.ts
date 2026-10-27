"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I agar mudah dibaca

function generateCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i === 3) out += "-";
  }
  return `KM-${out}`;
}

export async function createLicensesAction(formData: FormData) {
  await requireOwner();

  const count = Math.min(Math.max(Number(formData.get("count") ?? 1) || 1, 1), 50);
  const plan = String(formData.get("plan") ?? "standard").trim() || "standard";
  const note = String(formData.get("note") ?? "").trim() || null;

  const admin = createAdminClient();
  const rows = Array.from({ length: count }, () => ({
    code: generateCode(),
    plan,
    note,
    status: "unused" as const,
  }));

  const { error } = await admin.from("license_codes").insert(rows);

  if (error) {
    redirect("/owner?error=" + encodeURIComponent(`Gagal membuat kode: ${error.message}`));
  }

  revalidatePath("/owner");
  redirect(`/owner?created=${count}`);
}

export async function revokeLicenseAction(formData: FormData) {
  await requireOwner();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/owner?error=" + encodeURIComponent("Kode tidak ditemukan."));

  const admin = createAdminClient();
  const { error } = await admin
    .from("license_codes")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("status", "unused");

  if (error) {
    redirect("/owner?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/owner");
  redirect("/owner?revoked=1");
}

export async function deleteLicenseAction(formData: FormData) {
  await requireOwner();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/owner?error=" + encodeURIComponent("Kode tidak ditemukan."));

  const admin = createAdminClient();
  // Kode yang sudah dipakai boleh dihapus dari daftar: yang dihapus hanya
  // baris lisensinya. Usaha (tenant) beserta seluruh datanya tetap utuh dan
  // masih terlihat di halaman "Daftar usaha".
  const { error } = await admin.from("license_codes").delete().eq("id", id);

  if (error) {
    redirect("/owner?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/owner");
  revalidatePath("/owner/tenants");
  redirect("/owner?deleted=1");
}

/**
 * Menghapus satu usaha beserta seluruh datanya.
 *
 * Yang dihapus: baris tenant (produk, penjualan, pembelian, stok, kas, dan
 * dokumen ikut terhapus lewat on delete cascade), profil admin/kasirnya, akun
 * login mereka, serta kode lisensi yang menunjuk ke usaha itu — supaya tidak
 * ada akun yang bisa masuk ke usaha yang sudah tidak ada.
 *
 * Tidak bisa dibatalkan.
 */
export async function deleteTenantAction(formData: FormData) {
  await requireOwner();

  const tenantId = String(formData.get("tenant_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!tenantId) {
    redirect("/owner/tenants?error=" + encodeURIComponent("Usaha tidak ditemukan."));
  }

  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role")
    .eq("tenant_id", tenantId);

  // Akun pemilik platform tidak pernah ikut terhapus, meskipun ia terhubung
  // ke tenant ini.
  const userIds = (profiles ?? [])
    .filter((p) => p.role !== "owner")
    .map((p) => p.id as string);

  const { error } = await admin.from("tenants").delete().eq("id", tenantId);

  if (error) {
    redirect("/owner/tenants?error=" + encodeURIComponent(error.message));
  }

  // Lisensi yang menunjuk ke usaha ini tidak boleh tertinggal sebagai baris
  // "sudah dipakai" tanpa usaha.
  await admin.from("license_codes").delete().eq("tenant_id", tenantId);

  for (const userId of userIds) {
    const { error: userError } = await admin.auth.admin.deleteUser(userId);
    if (userError) {
      console.error(`Gagal menghapus akun ${userId}:`, userError.message);
    }
  }

  revalidatePath("/owner/tenants");
  revalidatePath("/owner");
  redirect("/owner/tenants?deleted=" + encodeURIComponent(name || "Usaha"));
}

const PLANS = ["standard", "pro", "trial"] as const;

/**
 * Mengubah paket sebuah usaha. Ini satu-satunya cara mengaktifkan kembali usaha
 * yang masa trial-nya sudah habis, karena trial hanya berlaku 24 jam.
 */
export async function updateTenantPlanAction(formData: FormData) {
  await requireOwner();

  const tenantId = String(formData.get("tenant_id") ?? "");
  const plan = String(formData.get("plan") ?? "");

  if (!tenantId || !PLANS.includes(plan as (typeof PLANS)[number])) {
    redirect("/owner?error=" + encodeURIComponent("Paket tidak valid."));
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({
      plan,
      // Memberi paket trial selalu memulai 24 jam baru dari sekarang.
      trial_ends_at:
        plan === "trial" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    })
    .eq("id", tenantId);

  if (error) {
    redirect("/owner?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/owner");
  revalidatePath("/owner/tenants");
  revalidatePath("/app", "layout");
  redirect("/owner?saved=1");
}
