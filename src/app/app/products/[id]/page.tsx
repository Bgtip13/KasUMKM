import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/submit-button";
import { requireTenantAdmin } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import type { Product } from "@/lib/types";
import { toggleProductAction, updateProductAction } from "../actions";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { supabase } = await requireTenantAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle<Product>();

  if (!product) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/products" className="text-sm text-slate-500 hover:text-slate-800">
          ← Produk
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{product.name}</h1>
        <p className="text-sm text-slate-500">
          Stok saat ini {formatNumber(product.stock)} {product.unit} — ubah lewat menu Stok agar
          tercatat di kartu stok.
        </p>
      </div>

      {sp.saved && <Alert tone="success">Perubahan tersimpan.</Alert>}
      {sp.error && <Alert tone="error">{sp.error}</Alert>}

      <div className="card card-pad">
        <form action={updateProductAction} className="space-y-3">
          <input type="hidden" name="id" value={product.id} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">
                Nama produk *
              </label>
              <input
                id="name"
                name="name"
                required
                defaultValue={product.name}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="sku">
                SKU
              </label>
              <input id="sku" name="sku" defaultValue={product.sku ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="category">
                Kategori
              </label>
              <input
                id="category"
                name="category"
                defaultValue={product.category ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="unit">
                Satuan
              </label>
              <input id="unit" name="unit" defaultValue={product.unit} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="cost_price">
                Harga beli (HPP)
              </label>
              <input
                id="cost_price"
                name="cost_price"
                defaultValue={Number(product.cost_price)}
                inputMode="numeric"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="sell_price">
                Harga jual
              </label>
              <input
                id="sell_price"
                name="sell_price"
                defaultValue={Number(product.sell_price)}
                inputMode="numeric"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="min_stock">
                Stok minimum
              </label>
              <input
                id="min_stock"
                name="min_stock"
                defaultValue={Number(product.min_stock)}
                inputMode="numeric"
                className="input"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="track_stock"
                  defaultChecked={product.track_stock}
                  className="h-4 w-4"
                />
                Hitung stok
              </label>
            </div>
          </div>

          <SubmitButton className="btn btn-primary" pendingText="Menyimpan…">
            Simpan perubahan
          </SubmitButton>
        </form>
      </div>

      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          {product.is_active
            ? "Produk aktif dan bisa dijual di kasir."
            : "Produk nonaktif — tidak muncul di kasir."}
        </div>
        <form action={toggleProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="next" value={product.is_active ? "0" : "1"} />
          <button type="submit" className="btn btn-outline">
            {product.is_active ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </form>
      </div>
    </div>
  );
}
