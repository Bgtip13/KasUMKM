import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { requireTenantAdmin } from "@/lib/auth";
import {
  addDays,
  formatDate,
  formatNumber,
  formatRupiah,
  monthStartIn,
  todayIn,
} from "@/lib/format";
import type { ReportSummary } from "@/lib/types";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { supabase, tenant } = await requireTenantAdmin();
  const sp = await searchParams;

  const from = sp.from || monthStartIn(tenant.timezone);
  const to = sp.to || todayIn(tenant.timezone);

  const { data } = await supabase.rpc("report_summary", { p_from: from, p_to: to });
  const report = (data ?? {}) as ReportSummary;

  const revenue = Number(report.revenue ?? 0);
  const cogs = Number(report.cogs ?? 0);
  const otherIncome = Number(report.other_income ?? 0);
  const otherExpense = Number(report.other_expense ?? 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit + otherIncome - otherExpense;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const today = todayIn(tenant.timezone);
  const [year, month] = today.split("-").map(Number);
  const prevStart = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
  const prevEnd = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);

  const maxDaily = Math.max(
    ...(report.daily_sales ?? []).map((d) => Number(d.total)),
    1,
  );

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Laporan</h1>
          <p className="text-xs text-slate-500">
            Laba rugi dan arus kas {formatDate(`${from}T00:00:00`, tenant.timezone)} —{" "}
            {formatDate(`${to}T00:00:00`, tenant.timezone)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/app/reports?from=${today}&to=${today}`}
            className="btn btn-outline btn-sm"
          >
            Hari ini
          </Link>
          <Link
            href={`/app/reports?from=${monthStartIn(tenant.timezone)}&to=${today}`}
            className="btn btn-outline btn-sm"
          >
            Bulan ini
          </Link>
          <Link href={`/app/reports?from=${prevStart}&to=${prevEnd}`} className="btn btn-outline btn-sm">
            Bulan lalu
          </Link>
          <PrintButton label="Cetak" />
        </div>
      </div>

      <form className="card card-pad no-print flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="label" htmlFor="from">
            Dari tanggal
          </label>
          <input id="from" name="from" type="date" defaultValue={from} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="to">
            Sampai tanggal
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className="input" />
        </div>
        <button type="submit" className="btn btn-secondary">
          Tampilkan
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Omzet", value: formatRupiah(revenue), sub: `${formatNumber(report.sales_count)} transaksi` },
          { label: "Laba kotor", value: formatRupiah(grossProfit), sub: `HPP ${formatRupiah(cogs)}` },
          { label: "Biaya operasional", value: formatRupiah(otherExpense), sub: `Pendapatan lain ${formatRupiah(otherIncome)}` },
          {
            label: "Laba bersih",
            value: formatRupiah(netProfit),
            sub: `Margin ${formatNumber(margin, 1)}%`,
            tone: netProfit >= 0 ? "text-emerald-700" : "text-rose-700",
          },
        ].map((c) => (
          <div key={c.label} className="card card-pad">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {c.label}
            </div>
            <div className={`mt-1 text-lg font-semibold ${c.tone ?? "text-slate-900"}`}>
              {c.value}
            </div>
            <div className="mt-1 text-xs text-slate-500">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <h2 className="font-semibold">Laporan laba rugi</h2>
          <table className="table mt-3">
            <tbody>
              <tr>
                <td>Pendapatan penjualan</td>
                <td className="text-right font-medium">{formatRupiah(revenue)}</td>
              </tr>
              {Number(report.tax) > 0 && (
                <tr>
                  <td className="pl-4 text-xs text-slate-500">
                    PPN dipungut (bukan pendapatan usaha)
                  </td>
                  <td className="text-right text-xs text-slate-500">
                    {formatRupiah(report.tax)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="text-slate-500">Harga pokok penjualan (HPP)</td>
                <td className="text-right text-slate-500">−{formatRupiah(cogs)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="font-medium">Laba kotor</td>
                <td className="text-right font-semibold">{formatRupiah(grossProfit)}</td>
              </tr>
              <tr>
                <td>Pendapatan lain di luar penjualan</td>
                <td className="text-right">{formatRupiah(otherIncome)}</td>
              </tr>
              <tr>
                <td className="text-slate-500">Biaya operasional</td>
                <td className="text-right text-slate-500">−{formatRupiah(otherExpense)}</td>
              </tr>
              <tr className="border-t-2 border-slate-200">
                <td className="font-semibold">Laba bersih</td>
                <td
                  className={`text-right text-base font-semibold ${
                    netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {formatRupiah(netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            HPP dihitung dari harga beli rata-rata produk pada saat transaksi. Diskon penjualan
            periode ini {formatRupiah(report.discount)}.
          </p>
        </div>

        <div className="card card-pad">
          <h2 className="font-semibold">Rincian biaya</h2>
          {(report.expense_by_category ?? []).length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">Belum ada biaya operasional tercatat.</p>
          ) : (
            <table className="table mt-3">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th className="text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {report.expense_by_category.map((e) => (
                  <tr key={e.category}>
                    <td>{e.category}</td>
                    <td className="text-right">{formatRupiah(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(report.income_by_category ?? []).length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold text-slate-700">
                Pemasukan di luar penjualan
              </h3>
              <table className="table mt-2">
                <tbody>
                  {report.income_by_category.map((e) => (
                    <tr key={e.category}>
                      <td>{e.category}</td>
                      <td className="text-right">{formatRupiah(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Total pembelian periode ini {formatRupiah(report.purchase_total)} (tidak langsung menjadi
            biaya; masuk ke nilai persediaan).
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <h2 className="font-semibold">Produk terlaris</h2>
          {(report.top_products ?? []).length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">Belum ada penjualan pada periode ini.</p>
          ) : (
            <table className="table mt-3">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="text-right">Terjual</th>
                  <th className="text-right">Omzet</th>
                  <th className="text-right">Laba</th>
                </tr>
              </thead>
              <tbody>
                {report.top_products.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td className="text-right">{formatNumber(p.qty)}</td>
                    <td className="text-right">{formatRupiah(p.revenue)}</td>
                    <td className="text-right text-emerald-700">{formatRupiah(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card card-pad">
          <h2 className="font-semibold">Penjualan harian</h2>
          {(report.daily_sales ?? []).length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">Belum ada data.</p>
          ) : (
            <table className="table mt-3">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th className="text-right">Transaksi</th>
                  <th className="text-right">Omzet</th>
                  <th className="w-24"> </th>
                </tr>
              </thead>
              <tbody>
                {report.daily_sales.map((d) => (
                  <tr key={d.date}>
                    <td className="whitespace-nowrap">{formatDate(`${d.date}T00:00:00`, tenant.timezone)}</td>
                    <td className="text-right">{formatNumber(d.transactions)}</td>
                    <td className="text-right">{formatRupiah(d.total)}</td>
                    <td>
                      <div className="h-2 w-full rounded bg-slate-100">
                        <div
                          className="h-2 rounded bg-brand-500"
                          style={{ width: `${Math.max((Number(d.total) / maxDaily) * 100, 4)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="pb-2 text-xs text-slate-400">
        Periode {addDays(from, 0)} s.d. {to} · zona waktu {tenant.timezone}
      </p>
    </div>
  );
}
