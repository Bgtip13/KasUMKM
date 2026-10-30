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

/**
 * Warna ikon menu mengikuti kategori modul (color-coding khas Accurate):
 * biru = data master, hijau = transaksi & input, oranye = pengaturan,
 * ungu = laporan & histori, merah = ringkasan utama.
 */
type Tone = "red" | "blue" | "green" | "orange" | "purple";

type Item = {
  href: string;
  label: string;
  Icon: LucideIcon;
  tone: Tone;
  adminOnly: boolean;
  requiresSales: boolean;
};

const items: Item[] = [
  {
    href: "/app",
    label: "Dashboard",
    Icon: LayoutDashboard,
    tone: "red",
    adminOnly: true,
    requiresSales: false,
  },
  {
    href: "/app/pos",
    label: "Kasir",
    Icon: ScanLine,
    tone: "green",
    adminOnly: false,
    requiresSales: false,
  },
  {
    href: "/app/sales",
    label: "Penjualan",
    Icon: Receipt,
    tone: "green",
    adminOnly: false,
    requiresSales: true,
  },
  {
    href: "/app/purchases",
    label: "Pembelian",
    Icon: Truck,
    tone: "green",
    adminOnly: true,
    requiresSales: false,
  },
  {
    href: "/app/products",
    label: "Produk",
    Icon: Package,
    tone: "blue",
    adminOnly: true,
    requiresSales: false,
  },
  {
    href: "/app/stock",
    label: "Stok",
    Icon: Boxes,
    tone: "blue",
    adminOnly: true,
    requiresSales: false,
  },
  {
    href: "/app/finance",
    label: "Kas",
    Icon: Wallet,
    tone: "green",
    adminOnly: true,
    requiresSales: false,
  },
  {
    href: "/app/reports",
    label: "Laporan",
    Icon: ChartColumn,
    tone: "purple",
    adminOnly: true,
    requiresSales: false,
  },
  {
    href: "/app/settings",
    label: "Pengaturan",
    Icon: Settings,
    tone: "orange",
    adminOnly: true,
    requiresSales: false,
  },
];

const toneIcon: Record<Tone, string> = {
  red: "text-brand-600",
  blue: "text-blue-600",
  green: "text-emerald-600",
  orange: "text-amber-600",
  purple: "text-violet-600",
};

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
      className="flex gap-0.5 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
    >
      {visible.map(({ href, label, Icon, tone }) => {
        const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`nav-link ${active ? "nav-link-active" : ""}`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${toneIcon[tone]} ${active ? "" : "opacity-80"}`}
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
