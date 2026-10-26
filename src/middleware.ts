import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Menjaga cookie sesi Supabase tetap segar di setiap request.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  if (!url || !key) {
    return response;
  }

  // Pengunjung belum login: tidak ada cookie sesi, tidak ada yang perlu
  // di-refresh — lewati tanpa membuat klien sama sekali.
  const hasSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));

  if (!hasSessionCookie) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() selalu memanggil server auth Supabase (1 round-trip jaringan untuk
  // SETIAP request), padahal tugas middleware hanya menjaga cookie tetap segar.
  // getSession() membaca cookie secara lokal dan hanya me-refresh token lewat
  // jaringan saat token mau kedaluwarsa. Validasi sesi yang sesungguhnya tetap
  // dilakukan oleh supabase.auth.getUser() di src/lib/auth.ts pada tiap halaman.
  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
