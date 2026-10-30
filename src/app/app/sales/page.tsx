import Link from "next/link";
import { Alert } from "@/components/alert";
import { requireSalesAccess } from "@/lib/auth";
import {
  addDays,
  formatDateTime,
  formatRupiah,
  monthStartIn,
  todayIn,
  zonedDayStart,
} from "@/lib/format";
import type { Sale } from "@/lib/types";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; deleted?: string; error?: string }>;
}) {
  const { supabase, tenant } = await requireSalesAccess();
  const sp = await searchParams;

  const from = sp.from || monthStartIn(tenant.timezone);
  const to = sp.to || todayIn(tenant.timezone);

  const start = zonedDayStart(from, tenant.timezone).toISOString();
  const end = zonedDayStart(addDays(to, 1), tenant.timezone).toISOString();

  const { data } = await supabase
    .from("sales")
    .select("id, invoice_no, customer_name, total, paid, status, payment_method, sold_at")
    .gte("sold_at", start)
    .lt("sold_at", end)
    .order("sold_at", { ascending: false })
    .limit(300);

  const sales = (data ?? []) as Sale[];
  const total = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const unpaid = sales.reduce(
    (sum, s) => sum + (s.status === "unpaid" ? Number(s.total) - Number(s.paid) : 0),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Riwayat penjualan</h1>
          <p className="text-xs text-slate-500">Semua transaksi penjualan pada rentang tanggal ini.</p>
        </div>
        <Link href="/app/pos" className="btn btn-primary">
          + Transaksi baru
        </Link>
      </div>

      {sp.deleted && <Alert tone="success">Transaksi dibatalkan dan stok dikembalikan.</Alert>}
      {sp.error && <Alert tone="error">{sp.error}</Alert>}

      <form className="card card-pad flex flex-wrap items-end gap-3" method="get">
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
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Total periode</div>
          <div className="text-lg font-semibold">{formatRupiah(total)}</div>
          {unpaid > 0 && (
            <div className="text-xs text-amber-700">Piutang {formatRupiah(unpaid)}</div>
          )}
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Waktu</th>
                <th>Pelanggan</th>
                <th>Metode</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Belum ada transaksi pada periode ini.
                  </td>
                </tr>
              )}
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link
                      href={`/app/sales/${s.id}`}
                      className="font-mono text-xs font-medium text-brand-700 hover:underline"
                    >
                      {s.invoice_no}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-slate-600">
                    {formatDateTime(s.sold_at, tenant.timezone)}
                  </td>
                  <td>{s.customer_name}</td>
                  <td className="capitalize text-slate-600">{s.payment_method}</td>
                  <td>
                    <span
                      className={`badge ${
                        s.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {s.status === "paid" ? "lunas" : "belum lunas"}
                    </span>
                  </td>
                  <td className="text-right font-medium">{formatRupiah(s.total)}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link href={`/app/sales/${s.id}`} className="btn btn-outline btn-sm">
                        Detail
                      </Link>
                      <Link
                        href={`/app/sales/${s.id}/receipt`}
                        className="btn btn-outline btn-sm"
                      >
                        Struk
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
