"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app", label: "Dashboard", icon: "◧", adminOnly: true, requiresSales: false },
  { href: "/app/pos", label: "Kasir", icon: "▣", adminOnly: false, requiresSales: false },
  { href: "/app/sales", label: "Penjualan", icon: "↗", adminOnly: false, requiresSales: true },
  { href: "/app/purchases", label: "Pembelian", icon: "↘", adminOnly: true, requiresSales: false },
  { href: "/app/products", label: "Produk", icon: "▤", adminOnly: true, requiresSales: false },
  { href: "/app/stock", label: "Stok", icon: "▥", adminOnly: true, requiresSales: false },
  { href: "/app/finance", label: "Kas", icon: "◎", adminOnly: true, requiresSales: false },
  { href: "/app/reports", label: "Laporan", icon: "◫", adminOnly: true, requiresSales: false },
  { href: "/app/settings", label: "Pengaturan", icon: "⚙", adminOnly: true, requiresSales: false },
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
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
      {visible.map((item) => {
        const active =
          item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${active ? "nav-link-active" : ""}`}
          >
            <span className="text-xs opacity-70">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
