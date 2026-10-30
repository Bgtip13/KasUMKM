import Link from "next/link";
import { Alert } from "@/components/alert";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { registerAction } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; inactive?: string }>;
}) {
  const { error, inactive } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="card card-pad">
          <h1 className="text-lg font-semibold">Aktivasi kode lisensi</h1>
          <p className="mt-1 text-xs text-slate-500">
            Masukkan kode yang Anda terima saat membeli aplikasi. Kode ini membuat ruang data usaha
            Anda sendiri.
          </p>

          {inactive && (
            <div className="mt-4">
              <Alert tone="warning">
                Akun Anda belum terhubung ke usaha mana pun. Aktivasi kode lisensi untuk melanjutkan.
              </Alert>
            </div>
          )}
          {error && (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <form action={registerAction} className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="code">
                Kode lisensi
              </label>
              <input
                id="code"
                name="code"
                required
                className="input font-mono uppercase tracking-wider"
                placeholder="KM-XXXX-XXXX"
                autoComplete="off"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="business_name">
                  Nama usaha
                </label>
                <input
                  id="business_name"
                  name="business_name"
                  required
                  className="input"
                  placeholder="Toko Bu Siti"
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  No. HP (opsional)
                </label>
                <input id="phone" name="phone" className="input" placeholder="08xxxxxxxxxx" />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="full_name">
                Nama admin
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                className="input"
                placeholder="Nama lengkap"
              />
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="nama@usaha.com"
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
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
              />
            </div>

            <SubmitButton pendingText="Mengaktivasi…">Aktivasi & masuk</SubmitButton>
          </form>

          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
