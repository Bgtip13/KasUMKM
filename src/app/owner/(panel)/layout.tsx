import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { SignOutForm } from "@/components/sign-out";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireOwner();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="badge bg-slate-100 text-slate-600">Panel pemilik</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/owner" className="nav-link">
                Kode lisensi
              </Link>
              <Link href="/owner/tenants" className="nav-link">
                Daftar usaha
              </Link>
            </nav>
            <div className="hidden text-right text-xs text-slate-500 sm:block">
              <div>{user.email}</div>
              <SignOutForm redirectTo="/owner/login" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
