"use server";

import { redirect } from "next/navigation";
import { ownerEmails } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient, supabaseConfigured } from "@/lib/supabase/server";

export async function ownerLoginAction(formData: FormData) {
  if (!supabaseConfigured()) {
    redirect(
      "/owner/login?error=" +
        encodeURIComponent("Database belum dikonfigurasi. Isi environment Supabase terlebih dahulu."),
    );
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mode = String(formData.get("mode") ?? "login");

  if (!email || !password) {
    redirect("/owner/login?error=" + encodeURIComponent("Email dan password wajib diisi."));
  }

  if (!ownerEmails().includes(email)) {
    redirect(
      "/owner/login?error=" +
        encodeURIComponent(
          "Email ini bukan email pemilik aplikasi. Atur PLATFORM_OWNER_EMAIL di environment.",
        ),
    );
  }

  const supabase = await createSupabaseServerClient();

  if (mode === "signup") {
    if (password.length < 8) {
      redirect("/owner/login?error=" + encodeURIComponent("Password pemilik minimal 8 karakter."));
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Pemilik Aplikasi" },
    });

    if (error || !data.user) {
      const msg = error?.message?.toLowerCase().includes("already")
        ? "Akun pemilik sudah ada. Silakan masuk."
        : `Gagal membuat akun pemilik: ${error?.message ?? "kesalahan tidak diketahui"}`;
      redirect("/owner/login?error=" + encodeURIComponent(msg));
    }

    await admin
      .from("profiles")
      .upsert({ id: data.user.id, email, role: "owner", full_name: "Pemilik Aplikasi" });
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    redirect("/owner/login?error=" + encodeURIComponent("Email atau password salah."));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ownerEmails().includes((user.email ?? "").toLowerCase())) {
    await supabase.auth.signOut();
    redirect("/owner/login?error=" + encodeURIComponent("Akun ini bukan pemilik aplikasi."));
  }

  redirect("/owner");
}
