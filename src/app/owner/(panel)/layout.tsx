import Link from "next/link";
import { KeyRound, ShieldCheck, Store } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { SignOutForm } from "@/components/sign-out";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireOwner();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/70 bg-white/70 shadow-[0_10px_30px_-24px_rgba(86,54,242,0.5)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="badge bg-gradient-to-r from-violet-100 to-cyan-100 text-brand-800">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Panel pemilik
            </span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/owner" className="nav-link">
                <KeyRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Kode lisensi
              </Link>
              <Link href="/owner/tenants" className="nav-link">
                <Store className="h-4 w-4 text-slate-400" aria-hidden="true" />
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
