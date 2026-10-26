"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigured } from "@/lib/supabase/server";

export async function loginAction(formData: FormData) {
  if (!supabaseConfigured()) {
    redirect(
      "/login?error=" +
        encodeURIComponent("Database belum dikonfigurasi. Hubungi pemilik aplikasi."),
    );
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Email dan password wajib diisi."));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent("Email atau password salah."));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id, is_active")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // Akun kasir yang dinonaktifkan admin tidak boleh masuk sama sekali.
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    redirect(
      "/login?error=" +
        encodeURIComponent("Akun ini dinonaktifkan oleh admin usaha. Hubungi pemilik usaha."),
    );
  }

  if (profile?.role === "owner") {
    redirect("/owner");
  }

  if (!profile?.tenant_id) {
    redirect("/register?inactive=1");
  }

  if (profile.role === "staff") {
    redirect("/app/pos");
  }

  redirect("/app");
}
