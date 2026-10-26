import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/alert";
import { isTenantAdmin, requireSalesAccess } from "@/lib/auth";
import { formatDateTime, formatNumber, formatRupiah } from "@/lib/format";
import type { Sale, SaleItem } from "@/lib/types";
import { cancelSaleAction } from "../actions";

export default async function SaleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, tenant, profile } = await requireSalesAccess();
  const admin = isTenantAdmin(profile);
  const { id } = await params;
  const { error } = await searchParams;

  const saleQuery = supabase.from("sales").select("*").eq("id", id).maybeSingle<Sale>();

  const itemsQuery = supabase
    .from("sale_items_public")
    .select("id, product_name, qty, unit_price, discount, subtotal")
    .eq("sale_id", id)
    .order("product_name");

  // Laba kotor hanya dihitung untuk admin usaha (kasir tidak boleh melihat HPP).
  const costsQuery = admin
    ? supabase.from("sale_items").select("qty, unit_cost, subtotal").eq("sale_id", id)
    : Promise.resolve({ data: null });

  const [{ data: sale }, { data: items }, { data: costRows }] = await Promise.all([
    saleQuery,
    itemsQuery,
    costsQuery,
  ]);
  if (!sale) notFound();

  const rows = (items ?? []) as Pick<
    SaleItem,
    "id" | "product_name" | "qty" | "unit_price" | "discount" | "subtotal"
  >[];

  const profit: number | null = admin
    ? (costRows as Pick<SaleItem, "qty" | "unit_cost" | "subtotal">[] | null ?? []).reduce(
        (sum, i) => sum + (Number(i.subtotal) - Number(i.qty) * Number(i.unit_cost)),
        0,
      )
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/app/sales" className="text-sm text-slate-500 hover:text-slate-800">
            ← Riwayat penjualan
          </Link>
          <h1 className="mt-1 font-mono text-xl font-semibold">{sale.invoice_no}</h1>
          <p className="text-sm text-slate-500">
            {formatDateTime(sale.sold_at, tenant.timezone)} · {sale.customer_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/sales/${sale.id}/receipt`} className="btn btn-outline">
            Lihat struk
          </Link>
          {admin && (
            <form action={cancelSaleAction}>
              <input type="hidden" name="id" value={sale.id} />
              <input type="hidden" name="redirectTo" value={`/app/sales/${sale.id}`} />
              <button type="submit" className="btn btn-danger">
                Batalkan transaksi
              </button>
            </form>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Harga</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td className="text-right">{formatNumber(item.qty)}</td>
                    <td className="text-right">{formatRupiah(item.unit_price)}</td>
                    <td className="text-right font-medium">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-pad space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatRupiah(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Diskon</span>
            <span>−{formatRupiah(sale.discount)}</span>
          </div>
          {Number(sale.tax) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">
                PPN {formatNumber(sale.tax_rate, Number(sale.tax_rate) % 1 === 0 ? 0 : 2)}%
                {tenant.tax_inclusive ? " (termasuk)" : ""}
              </span>
              <span>{formatRupiah(sale.tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatRupiah(sale.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Dibayar ({sale.payment_method})</span>
            <span>{formatRupiah(sale.paid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Kembalian</span>
            <span>{formatRupiah(sale.change)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <span className={sale.status === "paid" ? "text-emerald-700" : "text-amber-700"}>
              {sale.status === "paid" ? "Lunas" : "Belum lunas"}
            </span>
          </div>
          {sale.cashier_name && (
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir</span>
              <span>{sale.cashier_name}</span>
            </div>
          )}
          {profit !== null && (
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="text-slate-500">Laba kotor</span>
              <span className="font-medium">{formatRupiah(profit)}</span>
            </div>
          )}
          {sale.note && (
            <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">{sale.note}</p>
          )}
        </div>
      </div>

      {admin && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
          Membatalkan transaksi akan menghapus transaksi ini dan mengembalikan stok produk ke jumlah
          sebelumnya. Riwayat pembatalan tetap tercatat di kartu stok.
        </div>
      )}
    </div>
  );
}
