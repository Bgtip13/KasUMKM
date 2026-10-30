import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantAdmin } from "@/lib/auth";
import { formatDateTime, formatNumber, formatRupiah } from "@/lib/format";
import type { Purchase, PurchaseItem } from "@/lib/types";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, tenant } = await requireTenantAdmin();
  const { id } = await params;

  const [{ data: purchase }, { data: items }] = await Promise.all([
    supabase.from("purchases").select("*").eq("id", id).maybeSingle<Purchase>(),
    supabase.from("purchase_items").select("*").eq("purchase_id", id).order("product_name"),
  ]);
  if (!purchase) notFound();

  const rows = (items ?? []) as PurchaseItem[];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/purchases" className="text-xs text-slate-500 hover:text-slate-800">
          ← Pembelian
        </Link>
        <h1 className="mt-1 font-mono text-lg font-semibold">{purchase.purchase_no}</h1>
        <p className="text-xs text-slate-500">
          {formatDateTime(purchase.purchased_at, tenant.timezone)} · {purchase.supplier_name}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Harga beli</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td className="text-right">{formatNumber(item.qty)}</td>
                    <td className="text-right">{formatRupiah(item.unit_cost)}</td>
                    <td className="text-right font-medium">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-pad space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatRupiah(purchase.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Dibayar</span>
            <span>{formatRupiah(purchase.paid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Sisa utang</span>
            <span className={Number(purchase.total) - Number(purchase.paid) > 0 ? "text-amber-700" : ""}>
              {formatRupiah(Math.max(Number(purchase.total) - Number(purchase.paid), 0))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <span className={purchase.status === "paid" ? "text-emerald-700" : "text-amber-700"}>
              {purchase.status === "paid" ? "Lunas" : "Belum lunas"}
            </span>
          </div>
          {purchase.note && (
            <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">{purchase.note}</p>
          )}
        </div>
      </div>
    </div>
  );
}
