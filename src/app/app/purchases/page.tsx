import Link from "next/link";
import { Alert } from "@/components/alert";
import { requireTenantAdmin } from "@/lib/auth";
import {
  addDays,
  formatDateTime,
  formatRupiah,
  monthStartIn,
  todayIn,
  zonedDayStart,
} from "@/lib/format";
import type { Purchase } from "@/lib/types";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; saved?: string }>;
}) {
  const { supabase, tenant } = await requireTenantAdmin();
  const sp = await searchParams;

  const from = sp.from || monthStartIn(tenant.timezone);
  const to = sp.to || todayIn(tenant.timezone);

  const { data } = await supabase
    .from("purchases")
    .select("id, purchase_no, supplier_name, total, paid, status, purchased_at")
    .gte("purchased_at", zonedDayStart(from, tenant.timezone).toISOString())
    .lt("purchased_at", zonedDayStart(addDays(to, 1), tenant.timezone).toISOString())
    .order("purchased_at", { ascending: false })
    .limit(300);

  const purchases = (data ?? []) as Purchase[];
  const total = purchases.reduce((sum, p) => sum + Number(p.total), 0);
  const unpaid = purchases.reduce(
    (sum, p) => sum + (Number(p.total) - Number(p.paid) > 0 ? Number(p.total) - Number(p.paid) : 0),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Pembelian</h1>
          <p className="text-xs text-slate-500">
            Pembelian menambah stok dan memperbarui HPP rata-rata produk.
          </p>
        </div>
        <Link href="/app/purchases/new" className="btn btn-primary">
          + Pembelian baru
        </Link>
      </div>

      {sp.saved && <Alert tone="success">Pembelian tersimpan dan stok sudah diperbarui.</Alert>}

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
          <div className="text-xs text-slate-500">Total pembelian</div>
          <div className="text-lg font-semibold">{formatRupiah(total)}</div>
          {unpaid > 0 && <div className="text-xs text-amber-700">Utang {formatRupiah(unpaid)}</div>}
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>No. PO</th>
                <th>Tanggal</th>
                <th>Pemasok</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Belum ada pembelian pada periode ini.
                  </td>
                </tr>
              )}
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/app/purchases/${p.id}`}
                      className="font-mono text-xs font-medium text-brand-700 hover:underline"
                    >
                      {p.purchase_no}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-slate-600">
                    {formatDateTime(p.purchased_at, tenant.timezone)}
                  </td>
                  <td>{p.supplier_name}</td>
                  <td>
                    <span
                      className={`badge ${
                        p.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {p.status === "paid" ? "lunas" : "belum lunas"}
                    </span>
                  </td>
                  <td className="text-right font-medium">{formatRupiah(p.total)}</td>
                  <td className="text-right">
                    <Link href={`/app/purchases/${p.id}`} className="btn btn-outline btn-sm">
                      Detail
                    </Link>
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
