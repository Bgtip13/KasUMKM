"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient, supabaseConfigured } from "@/lib/supabase/server";

const fail = (message: string) =>
  redirect("/register?error=" + encodeURIComponent(message));

export async function registerAction(formData: FormData) {
  if (!supabaseConfigured()) {
    fail("Database belum dikonfigurasi. Hubungi pemilik aplikasi.");
  }

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!code || !businessName || !fullName || !email || !password) {
    fail("Semua kolom bertanda wajib harus diisi.");
  }
  if (password.length < 6) {
    fail("Password minimal 6 karakter.");
  }

  const admin = createAdminClient();

  const { data: license } = await admin
    .from("license_codes")
    .select("id, code, status")
    .ilike("code", code)
    .maybeSingle();

  if (!license) {
    fail("Kode lisensi tidak ditemukan.");
  }
  if (license!.status === "used") {
    fail("Kode lisensi ini sudah dipakai. Hubungi penjual aplikasi.");
  }
  if (license!.status === "revoked") {
    fail("Kode lisensi ini sudah dinonaktifkan.");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const msg = createError?.message?.toLowerCase().includes("already")
      ? "Email ini sudah terdaftar. Silakan masuk."
      : `Gagal membuat akun: ${createError?.message ?? "kesalahan tidak diketahui"}`;
    fail(msg);
  }

  const userId = created!.user!.id;

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name: businessName, owner_user_id: userId, phone: phone || null })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    await admin.auth.admin.deleteUser(userId);
    fail(`Gagal membuat ruang usaha: ${tenantError?.message ?? "kesalahan tidak diketahui"}`);
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName,
    role: "admin",
    tenant_id: tenant!.id,
  });

  if (profileError) {
    await admin.from("tenants").delete().eq("id", tenant!.id);
    await admin.auth.admin.deleteUser(userId);
    fail("Gagal menyiapkan profil admin.");
  }

  await admin
    .from("license_codes")
    .update({
      status: "used",
      tenant_id: tenant!.id,
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq("id", license!.id);

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    redirect("/login?error=" + encodeURIComponent("Akun dibuat. Silakan masuk dengan email Anda."));
  }

  redirect("/app");
}
