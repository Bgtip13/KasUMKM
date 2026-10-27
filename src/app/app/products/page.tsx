import Link from "next/link";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/submit-button";
import { requireTenantAdmin } from "@/lib/auth";
import { formatNumber, formatRupiah } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { createProductAction } from "./actions";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const sp = await searchParams;

  // Daftar produk sudah diminta ke Supabase selagi sesi + profil diperiksa,
  // jadi satu halaman hanya menunggu satu round-trip jaringan.
  const productsPromise = supabase
    .from("products")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name")
    .then(({ data }) => (data ?? []) as Product[]);

  await requireTenantAdmin();
  const products = await productsPromise;
  const active = products.filter((p) => p.is_active);
  const inactive = products.filter((p) => !p.is_active);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Produk</h1>
        <p className="text-sm text-slate-500">
          {formatNumber(active.length)} produk aktif, {formatNumber(inactive.length)} nonaktif.
        </p>
      </div>

      {sp.created && <Alert tone="success">Produk berhasil ditambahkan.</Alert>}
      {sp.updated && <Alert tone="success">Data produk diperbarui.</Alert>}
      {sp.error && <Alert tone="error">{sp.error}</Alert>}

      <div className="card card-pad">
        <h2 className="font-semibold">Tambah produk</h2>
        <form action={createProductAction} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">
                Nama produk *
              </label>
              <input id="name" name="name" required className="input" placeholder="Kopi Susu" />
            </div>
            <div>
              <label className="label" htmlFor="sku">
                SKU
              </label>
              <input id="sku" name="sku" className="input" placeholder="KOPI-01" />
            </div>
            <div>
              <label className="label" htmlFor="category">
                Kategori
              </label>
              <input id="category" name="category" className="input" placeholder="Minuman" />
            </div>
            <div>
              <label className="label" htmlFor="cost_price">
                Harga beli (HPP)
              </label>
              <input
                id="cost_price"
                name="cost_price"
                inputMode="numeric"
                className="input"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="label" htmlFor="sell_price">
                Harga jual
              </label>
              <input
                id="sell_price"
                name="sell_price"
                inputMode="numeric"
                className="input"
                placeholder="12000"
              />
            </div>
            <div>
              <label className="label" htmlFor="stock">
                Stok awal
              </label>
              <input
                id="stock"
                name="stock"
                inputMode="numeric"
                className="input"
                placeholder="0"
              />
            </div>
            <div>
              <label className="label" htmlFor="min_stock">
                Stok minimum
              </label>
              <input
                id="min_stock"
                name="min_stock"
                inputMode="numeric"
                className="input"
                placeholder="5"
              />
            </div>
            <div>
              <label className="label" htmlFor="unit">
                Satuan
              </label>
              <input id="unit" name="unit" className="input" placeholder="pcs" defaultValue="pcs" />
            </div>
            <div className="flex items-end gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="track_stock" defaultChecked className="h-4 w-4" />
                Hitung stok
              </label>
            </div>
            <div className="flex items-end">
              <SubmitButton className="btn btn-primary w-full" pendingText="Menyimpan…">
                Simpan produk
              </SubmitButton>
            </div>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th className="text-right">HPP</th>
                <th className="text-right">Harga jual</th>
                <th className="text-right">Stok</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Belum ada produk. Tambahkan produk pertama Anda di atas.
                  </td>
                </tr>
              )}
              {products.map((p) => {
                const low = p.track_stock && Number(p.stock) <= Number(p.min_stock);
                return (
                  <tr key={p.id} className={p.is_active ? "" : "opacity-60"}>
                    <td>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        {p.sku ?? "tanpa SKU"} · {p.unit}
                        {!p.is_active && " · nonaktif"}
                      </div>
                    </td>
                    <td className="text-slate-600">{p.category ?? "—"}</td>
                    <td className="text-right">{formatRupiah(p.cost_price)}</td>
                    <td className="text-right">{formatRupiah(p.sell_price)}</td>
                    <td className="text-right">
                      {p.track_stock ? (
                        <span className={low ? "font-medium text-rose-600" : ""}>
                          {formatNumber(p.stock)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">tidak dihitung</span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link href={`/app/products/${p.id}`} className="btn btn-outline btn-sm">
                        Ubah
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
