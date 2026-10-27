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
      <aside className="border-b border-slate-200 bg-white print:hidden md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:block">
          <Logo size="sm" />
          <div className="md:mt-4">
            <div className="max-w-44 truncate text-xs font-medium text-slate-500 md:max-w-full">
              {tenant.name}
            </div>
          </div>
        </div>

        <div className="px-3 pb-3">
          <AppNav isAdmin={admin} canViewSales={canViewSales(profile)} />
        </div>

        <div className="hidden border-t border-slate-100 px-4 py-3 md:block">
          <div className="mb-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
            {admin ? "Admin usaha" : "Kasir"}
          </div>
          <div className="truncate text-xs text-slate-500">{user.email}</div>
          <div className="mt-1">
            <SignOutForm redirectTo="/login" />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {tenant.plan === "trial" && tenant.trial_ends_at && (
          <TrialBanner endsAt={tenant.trial_ends_at} />
        )}
        <main className="mx-auto max-w-6xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
        <div className="border-t border-slate-200 px-4 py-3 text-center print:hidden md:hidden">
          <SignOutForm redirectTo="/login" />
        </div>
      </div>
    </div>
  );
}
