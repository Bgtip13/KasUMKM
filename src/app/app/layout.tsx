import { ShieldCheck, Store, UserRound } from "lucide-react";
import { canViewSales, isTenantAdmin, requireTenant } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { AppNav } from "@/components/app-nav";
import { SignOutForm } from "@/components/sign-out";
import { TrialBanner } from "@/components/trial-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { tenant, user, profile } = await requireTenant();
  const admin = isTenantAdmin(profile);

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-[#dfe3e8] bg-white print:hidden md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 bg-[#c8102e] px-4 py-3 text-white md:block">
          <Logo size="sm" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/80 md:mt-2">
            <Store className="h-3.5 w-3.5 shrink-0 text-white/65" aria-hidden="true" />
            <span className="max-w-40 truncate md:max-w-full">{tenant.name}</span>
          </div>
        </div>

        <div className="px-2 py-2">
          <AppNav isAdmin={admin} canViewSales={canViewSales(profile)} />
        </div>

        <div className="hidden border-t border-[#eceef1] px-4 py-3 md:block">
          <div className="mb-1.5 inline-flex items-center gap-1 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {admin ? (
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            ) : (
              <UserRound className="h-3 w-3" aria-hidden="true" />
            )}
            {admin ? "Admin usaha" : "Kasir"}
          </div>
          <div className="truncate text-[11px] text-slate-500">{user.email}</div>
          <div className="mt-2">
            <SignOutForm redirectTo="/login" />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {tenant.plan === "trial" && tenant.trial_ends_at && (
          <TrialBanner endsAt={tenant.trial_ends_at} />
        )}
        <main className="mx-auto max-w-6xl px-4 py-5 print:max-w-none print:p-0">{children}</main>
        <div className="border-t border-[#dfe3e8] px-4 py-3 text-center print:hidden md:hidden">
          <SignOutForm redirectTo="/login" />
        </div>
      </div>
    </div>
  );
}
