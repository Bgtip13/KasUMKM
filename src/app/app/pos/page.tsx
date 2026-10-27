import { requireTenant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { PosClient } from "./pos-client";

type PosProduct = Pick<
  Product,
  "id" | "name" | "sku" | "category" | "unit" | "sell_price" | "stock" | "track_stock"
>;

export default async function PosPage() {
  // Daftar produk dikirim ke Supabase lebih dulu, bersamaan dengan pemeriksaan
  // sesi + profil. Sebelumnya keduanya berurutan: 2 round-trip per klik menu.
  const supabase = await createSupabaseServerClient();
  const productsPromise = supabase
    .from("products")
    .select("id, name, sku, category, unit, sell_price, stock, track_stock")
    .eq("is_active", true)
    .order("name")
    .then(({ data }) => (data ?? []) as PosProduct[]);

  const { tenant } = await requireTenant();
  const products = await productsPromise;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Kasir</h1>
        <p className="text-sm text-slate-500">
          Pilih produk, atur jumlah, lalu simpan transaksi. Struk thermal siap dicetak.
        </p>
      </div>
      <PosClient
        products={products}
        currencyLabel={tenant.name}
        receiptWidth={tenant.receipt_width}
        taxEnabled={Boolean(tenant.tax_enabled)}
        taxRate={Number(tenant.tax_rate ?? 0)}
        taxInclusive={Boolean(tenant.tax_inclusive)}
      />
    </div>
  );
}
