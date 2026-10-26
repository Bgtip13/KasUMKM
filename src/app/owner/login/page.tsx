import Link from "next/link";
import { Alert } from "@/components/alert";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { ownerLoginAction } from "./actions";

export default async function OwnerLoginPage({
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
          <h1 className="text-lg font-semibold">Panel pemilik aplikasi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola kode lisensi yang Anda jual. Hanya email pemilik yang diizinkan masuk.
          </p>

          {error && (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <form action={ownerLoginAction} className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="email">
                Email pemilik
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="pemilik@aplikasi.com"
                autoComplete="email"
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
                required
                minLength={6}
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" name="mode" value="login" className="btn btn-primary flex-1">
                Masuk
              </button>
              <button type="submit" name="mode" value="signup" className="btn btn-outline flex-1">
                Daftar
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Tombol &ldquo;Daftar&rdquo; hanya berhasil bila email Anda sama dengan variabel{" "}
              <code>PLATFORM_OWNER_EMAIL</code>.
            </p>
          </form>

          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <Link href="/login" className="font-medium text-emerald-700 hover:underline">
              Kembali ke login admin usaha
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
