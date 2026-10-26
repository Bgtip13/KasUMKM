import Link from "next/link";
import { Alert } from "@/components/alert";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="card card-pad">
          <h1 className="text-lg font-semibold">Masuk sebagai admin</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan email dan password yang didaftarkan dengan kode lisensi Anda.
          </p>

          {error && (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <form action={loginAction} className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="nama@usaha.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                placeholder="••••••••"
              />
            </div>
            <SubmitButton pendingText="Masuk…">Masuk</SubmitButton>
          </form>

          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <p>
              Belum punya akun?{" "}
              <Link href="/register" className="font-medium text-emerald-700 hover:underline">
                Aktivasi kode lisensi
              </Link>
            </p>
            <p>
              Pemilik aplikasi?{" "}
              <Link href="/owner/login" className="font-medium text-emerald-700 hover:underline">
                Panel penjual
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
