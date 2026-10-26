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
  const { error } = await admin.from("license_codes").delete().eq("id", id).neq("status", "used");

  if (error) {
    redirect("/owner?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/owner");
  redirect("/owner?deleted=1");
}
