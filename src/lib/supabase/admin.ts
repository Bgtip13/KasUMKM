import { createClient } from "@supabase/supabase-js";

/**
 * Client khusus server dengan service role key.
 * Hanya dipakai untuk: aktivasi lisensi, pembuatan akun admin tenant,
 * dan panel pemilik. Jangan pernah diimpor ke komponen client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diisi. Tambahkan variabel tersebut di .env.local (server-only).",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
