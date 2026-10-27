"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChartColumn,
  LayoutDashboard,
  Package,
  Receipt,
  ScanLine,
  Settings,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  Icon: LucideIcon;
  adminOnly: boolean;
  requiresSales: boolean;
};

const items: Item[] = [
  {
    href: "/app",
    label: "Dashboard",
    Icon: LayoutDashboard,
    adminOnly: true,
    requiresSales: false,
  },
  { href: "/app/pos", label: "Kasir", Icon: ScanLine, adminOnly: false, requiresSales: false },
  { href: "/app/sales", label: "Penjualan", Icon: Receipt, adminOnly: false, requiresSales: true },
  { href: "/app/purchases", label: "Pembelian", Icon: Truck, adminOnly: true, requiresSales: false },
  { href: "/app/products", label: "Produk", Icon: Package, adminOnly: true, requiresSales: false },
  { href: "/app/stock", label: "Stok", Icon: Boxes, adminOnly: true, requiresSales: false },
  { href: "/app/finance", label: "Kas", Icon: Wallet, adminOnly: true, requiresSales: false },
  { href: "/app/reports", label: "Laporan", Icon: ChartColumn, adminOnly: true, requiresSales: false },
  { href: "/app/settings", label: "Pengaturan", Icon: Settings, adminOnly: true, requiresSales: false },
];

export function AppNav({
  isAdmin,
  canViewSales,
}: {
  isAdmin: boolean;
  canViewSales: boolean;
}) {
  const pathname = usePathname();

  const visible = items.filter(
    (item) => (!item.adminOnly || isAdmin) && (!item.requiresSales || canViewSales),
  );

  return (
    <nav
      aria-label="Menu aplikasi"
      className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
    >
      {visible.map(({ href, label, Icon }) => {
        const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`nav-link ${active ? "nav-link-active" : ""}`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${active ? "text-emerald-600" : "text-slate-400"}`}
              strokeWidth={2}
              aria-hidden="true"
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
