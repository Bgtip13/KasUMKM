import { requireTenant } from "@/lib/auth";
import type { Product } from "@/lib/types";
import { PosClient } from "./pos-client";

export default async function PosPage() {
  const { supabase, tenant } = await requireTenant();

  const { data } = await supabase
    .from("products")
    .select("id, name, sku, category, unit, sell_price, stock, track_stock")
    .eq("is_active", true)
    .order("name");

  const products = (data ?? []) as Pick<
    Product,
    "id" | "name" | "sku" | "category" | "unit" | "sell_price" | "stock" | "track_stock"
  >[];

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
