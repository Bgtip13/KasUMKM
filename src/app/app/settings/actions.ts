"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toNumber, toText } from "@/lib/format";

const backTo = (query: string) => redirect(`/app/settings?${query}`);
const fail = (message: string) => backTo("error=" + encodeURIComponent(message));

export async function updateTenantAction(formData: FormData) {
  const { supabase, tenant } = await requireTenantAdmin();

  const name = toText(formData.get("name"));
  if (!name) {
    fail("Nama usaha wajib diisi.");
  }

  const width = formData.get("receipt_width") === "80" ? "80" : "58";
  const taxEnabled = formData.get("tax_enabled") !== null;
  const taxRate = Math.min(Math.max(toNumber(formData.get("tax_rate"), 0), 0), 100);

  if (taxEnabled && taxRate <= 0) {
    fail("Isi tarif PPN lebih dari 0%, atau matikan PPN.");
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      name,
      phone: toText(formData.get("phone")) || null,
      address: toText(formData.get("address")) || null,
      receipt_footer: toText(formData.get("receipt_footer"), "Terima kasih"),
      receipt_width: width,
      timezone: toText(formData.get("timezone"), "Asia/Jakarta"),
      tax_enabled: taxEnabled,
      tax_rate: taxRate,
      tax_inclusive: formData.get("tax_inclusive") === "1",
    })
    .eq("id", tenant.id);

  if (error) {
    fail(error.message);
  }

  revalidatePath("/app/settings");
  revalidatePath("/app");
  revalidatePath("/app/pos");
  backTo("saved=1");
}

export async function createStaffAction(formData: FormData) {
  const { tenant } = await requireTenantAdmin();

  const fullName = toText(formData.get("staff_name"));
  const email = String(formData.get("staff_email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("staff_password") ?? "");
  const allowSales = formData.get("staff_sales") === "on";

  if (!fullName || !email) {
    fail("Nama dan email kasir wajib diisi.");
  }
  if (password.length < 6) {
    fail("Password kasir minimal 6 karakter.");
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    fail(
      createError?.message?.toLowerCase().includes("already")
        ? "Email ini sudah terdaftar. Gunakan email lain."
        : `Gagal membuat akun kasir: ${createError?.message ?? "kesalahan tidak diketahui"}`,
    );
  }

  const userId = created!.user!.id;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      role: "staff",
      tenant_id: tenant.id,
      full_name: fullName,
      is_active: true,
      permissions: { sales: allowSales },
    })
    .eq("id", userId);

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    fail(`Gagal menyiapkan akun kasir: ${profileError.message}`);
  }

  revalidatePath("/app/settings");
  backTo("staff=1");
}

export async function toggleStaffAction(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "1";

  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", id)
    .maybeSingle();

  if (!staff || staff.role !== "staff" || staff.tenant_id !== tenant.id) {
    fail("Akun kasir tidak ditemukan pada usaha ini.");
  }

  const { error } = await admin.from("profiles").update({ is_active: active }).eq("id", id);
  if (error) {
    fail(error.message);
  }

  revalidatePath("/app/settings");
  backTo(active ? "staff=2" : "staff=3");
}

export async function deleteStaffAction(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const id = String(formData.get("id") ?? "");

  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", id)
    .maybeSingle();

  if (!staff || staff.role !== "staff" || staff.tenant_id !== tenant.id) {
    fail("Akun kasir tidak ditemukan pada usaha ini.");
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    fail(error.message);
  }

  revalidatePath("/app/settings");
  backTo("staff=4");
}
