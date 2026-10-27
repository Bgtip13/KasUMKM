"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth";

export type PurchasePayload = {
  supplier_name: string;
  paid: number;
  note?: string;
  items: { product_id: string; qty: number; unit_cost: number }[];
};

export type PurchaseResult =
  | { ok: true; id: string; purchase_no: string; total: number }
  | { ok: false; error: string };

export async function createPurchaseAction(payload: PurchasePayload): Promise<PurchaseResult> {
  const { supabase } = await requireTenant();

  if (!payload.items?.length) {
    return { ok: false, error: "Belum ada barang yang dibeli." };
  }

  const { data, error } = await supabase.rpc("create_purchase", {
    p_supplier_name: payload.supplier_name || "Umum",
    p_partner_id: null,
    p_paid: payload.paid || 0,
    p_note: payload.note || null,
    p_items: payload.items.map((i) => ({
      product_id: i.product_id,
      qty: i.qty,
      unit_cost: i.unit_cost,
    })),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/pos");
  revalidatePath("/app/purchases");
  revalidatePath("/app/products");
  revalidatePath("/app/stock");
  revalidatePath("/app/reports");

  const result = data as { id: string; purchase_no: string; total: number };
  return {
    ok: true,
    id: result.id,
    purchase_no: result.purchase_no,
    total: Number(result.total),
  };
}
