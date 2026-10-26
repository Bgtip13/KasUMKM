"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { toNumber, toText } from "@/lib/format";

function productPayload(formData: FormData) {
  return {
    name: toText(formData.get("name")),
    sku: toText(formData.get("sku")) || null,
    category: toText(formData.get("category")) || null,
    unit: toText(formData.get("unit"), "pcs"),
    cost_price: toNumber(formData.get("cost_price")),
    sell_price: toNumber(formData.get("sell_price")),
    min_stock: toNumber(formData.get("min_stock")),
    track_stock: formData.get("track_stock") === "on",
  };
}

export async function createProductAction(formData: FormData) {
  const { supabase, tenant } = await requireTenant();
  const payload = productPayload(formData);
  const initialStock = toNumber(formData.get("stock"));

  if (!payload.name) {
    redirect("/app/products?error=" + encodeURIComponent("Nama produk wajib diisi."));
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({ tenant_id: tenant.id, ...payload, stock: 0 })
    .select("id")
    .single();

  if (error || !product) {
    redirect(
      "/app/products?error=" +
        encodeURIComponent(`Gagal menyimpan produk: ${error?.message ?? "kesalahan tidak diketahui"}`),
    );
  }

  if (initialStock > 0) {
    const { error: stockError } = await supabase.rpc("stock_adjust", {
      p_product_id: product!.id,
      p_type: "in",
      p_qty: initialStock,
      p_unit_cost: payload.cost_price,
      p_note: "Stok awal",
    });

    if (stockError) {
      redirect("/app/products?error=" + encodeURIComponent(stockError.message));
    }
  }

  revalidatePath("/app/products");
  revalidatePath("/app");
  redirect("/app/products?created=1");
}

export async function updateProductAction(formData: FormData) {
  const { supabase } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const payload = productPayload(formData);

  if (!id || !payload.name) {
    redirect(`/app/products/${id}?error=` + encodeURIComponent("Data produk tidak lengkap."));
  }

  const { error } = await supabase.from("products").update(payload).eq("id", id);

  if (error) {
    redirect(`/app/products/${id}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/app/products");
  redirect(`/app/products/${id}?saved=1`);
}

export async function toggleProductAction(formData: FormData) {
  const { supabase } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("next") === "1";

  const { error } = await supabase.from("products").update({ is_active: nextActive }).eq("id", id);

  if (error) {
    redirect("/app/products?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/app/products");
  redirect("/app/products?updated=1");
}
