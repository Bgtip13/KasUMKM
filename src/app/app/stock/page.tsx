import { requireTenantAdmin } from "@/lib/auth";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { Product, StockMovement } from "@/lib/types";
import { StockForm } from "./stock-form";

const typeLabel: Record<string, string> = {
  in: "Masuk",
  out: "Keluar",
  sale: "Penjualan",
  purchase: "Pembelian",
  opname: "Opname",
  cancel: "Pembatalan",
};

const typeStyle: Record<string, string> = {
  in: "bg-emerald-50 text-emerald-700",
  purchase: "bg-emerald-50 text-emerald-700",
  cancel: "bg-emerald-50 text-emerald-700",
  out: "bg-rose-50 text-rose-700",
  sale: "bg-rose-50 text-rose-700",
  opname: "bg-sky-50 text-sky-700",
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { supabase, tenant } = await requireTenantAdmin();
  const sp = await searchParams;

  const { data: productData } = await supabase
    .from("products")
    .select("id, name, unit, stock, min_stock, cost_price, track_stock")
    .eq("is_active", true)
    .order("name");

  const products = (productData ?? []) as Pick<
    Product,
    "id" | "name" | "unit" | "stock" | "min_stock" | "cost_price" | "track_stock"
  >[];

  let movementQuery = supabase
    .from("stock_movements")
    .select("*, products(name, unit)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (sp.product) {
    movementQuery = movementQuery.eq("product_id", sp.product);
  }

  const { data: movementData } = await movementQuery;
  const movements = (movementData ?? []) as StockMovement[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Stok</h1>
          <p className="text-sm text-slate-500">
            Stok masuk, keluar, dan opname. Semua perubahan tercatat di kartu stok.
          </p>
        </div>
        <form method="get" className="flex items-end gap-2">
          <div>
            <label className="label" htmlFor="product-filter">
              Filter produk
            </label>
            <select id="product-filter" name="product" defaultValue={sp.product ?? ""} className="select">
              <option value="">Semua produk</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-outline">
            Terapkan
          </button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <StockForm products={products} />

        <div className="card card-pad">
          <h2 className="font-semibold">Ringkasan stok</h2>
          <div className="mt-3 max-h-72 overflow-y-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="text-right">Stok</th>
                  <th className="text-right">Minimum</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="text-right font-medium">
                      {p.track_stock ? `${formatNumber(p.stock)} ${p.unit}` : "—"}
                    </td>
                    <td className="text-right text-slate-500">{formatNumber(p.min_stock ?? 0)}</td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      Belum ada produk aktif.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold">Kartu stok</h2>
          <p className="text-xs text-slate-500">100 pergerakan terakhir</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Produk</th>
                <th>Jenis</th>
                <th className="text-right">Perubahan</th>
                <th className="text-right">Sebelum</th>
                <th className="text-right">Sesudah</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Belum ada pergerakan stok.
                  </td>
                </tr>
              )}
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-slate-600">
                    {formatDateTime(m.created_at, tenant.timezone)}
                  </td>
                  <td>{m.products?.name ?? "Produk dihapus"}</td>
                  <td>
                    <span className={`badge ${typeStyle[m.type] ?? "bg-slate-100 text-slate-600"}`}>
                      {typeLabel[m.type] ?? m.type}
                    </span>
                  </td>
                  <td
                    className={`text-right font-medium ${
                      Number(m.qty) < 0 ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {Number(m.qty) > 0 ? "+" : ""}
                    {formatNumber(m.qty)}
                  </td>
                  <td className="text-right text-slate-500">{formatNumber(m.stock_before)}</td>
                  <td className="text-right">{formatNumber(m.stock_after)}</td>
                  <td className="max-w-56 truncate text-slate-600">{m.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
