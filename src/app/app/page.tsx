import Link from "next/link";
import { requireTenantAdmin } from "@/lib/auth";
import { formatDateTime, formatNumber, formatRupiah } from "@/lib/format";
import type { DashboardStats, Product, Sale } from "@/lib/types";

export default async function DashboardPage() {
  const { supabase, tenant } = await requireTenantAdmin();

  const [{ data: statsData }, { data: recentSales }, { data: lowStock }] = await Promise.all([
    supabase.rpc("dashboard_stats"),
    supabase
      .from("sales")
      .select("id, invoice_no, customer_name, total, status, sold_at")
      .order("sold_at", { ascending: false })
      .limit(6),
    supabase
      .from("products")
      .select("id, name, stock, min_stock, unit")
      .eq("is_active", true)
      .eq("track_stock", true)
      .order("stock", { ascending: true })
      .limit(5),
  ]);

  const stats = (statsData ?? {}) as DashboardStats;
  const sales = (recentSales ?? []) as Sale[];
  const low = (lowStock ?? []) as Product[];
  const lowItems = low.filter((p) => Number(p.stock) <= Number(p.min_stock));

  const cards = [
    {
      label: "Penjualan hari ini",
      value: formatRupiah(stats.revenue_today),
      sub: `${formatNumber(stats.transactions_today)} transaksi`,
      tone: "text-emerald-700",
    },
    {
      label: "Omzet bulan ini",
      value: formatRupiah(stats.revenue_month),
      sub: `Laba kotor ${formatRupiah(stats.profit_month)}`,
      tone: "text-slate-900",
    },
    {
      label: "Saldo kas",
      value: formatRupiah(stats.cash_balance),
      sub:
        Number(stats.receivable) > 0
          ? `Piutang ${formatRupiah(stats.receivable)}`
          : "Tidak ada piutang",
      tone: "text-slate-900",
    },
    {
      label: "Nilai stok",
      value: formatRupiah(stats.stock_value),
      sub: `${formatNumber(stats.product_count)} produk aktif`,
      tone: "text-slate-900",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Ringkasan {tenant.name}</h1>
          <p className="text-sm text-slate-500">Kondisi usaha Anda hari ini.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/pos" className="btn btn-primary">
            + Transaksi baru
          </Link>
          <Link href="/app/reports" className="btn btn-outline">
            Laporan
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card card-pad">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {c.label}
            </div>
            <div className={`mt-1 text-xl font-semibold ${c.tone}`}>{c.value}</div>
            <div className="mt-1 text-xs text-slate-500">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Penjualan terakhir</h2>
            <Link href="/app/sales" className="text-sm font-medium text-emerald-700 hover:underline">
              Lihat semua
            </Link>
          </div>

          {sales.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Belum ada transaksi. Mulai dari menu{" "}
              <Link href="/app/pos" className="font-medium text-emerald-700 hover:underline">
                Kasir
              </Link>
              .
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Waktu</th>
                    <th>Pelanggan</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link
                          href={`/app/sales/${s.id}`}
                          className="font-mono text-xs font-medium text-emerald-700 hover:underline"
                        >
                          {s.invoice_no}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-slate-600">
                        {formatDateTime(s.sold_at, tenant.timezone)}
                      </td>
                      <td>{s.customer_name}</td>
                      <td className="text-right font-medium">{formatRupiah(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Stok menipis</h2>
              <Link
                href="/app/stock"
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Kelola
              </Link>
            </div>
            {lowItems.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Semua stok di atas batas minimum.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {lowItems.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{p.name}</span>
                    <span className="whitespace-nowrap text-rose-600">
                      {formatNumber(p.stock)} {p.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card card-pad">
            <h2 className="font-semibold">Akses cepat</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {[
                { href: "/app/purchases/new", label: "Catat pembelian" },
                { href: "/app/stock", label: "Stok opname" },
                { href: "/app/finance", label: "Kas masuk/keluar" },
                { href: "/app/products", label: "Tambah produk" },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-center text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
