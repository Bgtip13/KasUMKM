import Link from "next/link";
import { requireTenantAdmin } from "@/lib/auth";
import type { Product } from "@/lib/types";
import { PurchaseForm } from "./purchase-form";

export default async function NewPurchasePage() {
  const { supabase } = await requireTenantAdmin();

  const { data } = await supabase
    .from("products")
    .select("id, name, unit, cost_price, stock")
    .eq("is_active", true)
    .order("name");

  const products = (data ?? []) as Pick<Product, "id" | "name" | "unit" | "cost_price" | "stock">[];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/purchases" className="text-sm text-slate-500 hover:text-slate-800">
          ← Pembelian
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Pembelian baru</h1>
        <p className="text-sm text-slate-500">
          Stok dan HPP rata-rata produk akan diperbarui otomatis saat disimpan.
        </p>
      </div>

      <PurchaseForm products={products} />
    </div>
  );
}
