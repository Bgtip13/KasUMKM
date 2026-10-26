"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth";

export type AdjustPayload = {
  product_id: string;
  type: "in" | "out" | "opname";
  qty: number;
  unit_cost?: number | null;
  note?: string;
};

export type AdjustResult =
  | { ok: true; stock: number; change: number }
  | { ok: false; error: string };

export async function stockAdjustAction(payload: AdjustPayload): Promise<AdjustResult> {
  const { supabase } = await requireTenant();

  if (!payload.product_id) {
    return { ok: false, error: "Pilih produk terlebih dahulu." };
  }
  if (!Number.isFinite(payload.qty) || payload.qty < 0) {
    return { ok: false, error: "Jumlah tidak valid." };
  }
  if (payload.type !== "opname" && payload.qty <= 0) {
    return { ok: false, error: "Jumlah harus lebih dari 0." };
  }

  const { data, error } = await supabase.rpc("stock_adjust", {
    p_product_id: payload.product_id,
    p_type: payload.type,
    p_qty: payload.qty,
    p_unit_cost: payload.unit_cost ?? null,
    p_note: payload.note ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/app/stock");
  revalidatePath("/app/products");
  revalidatePath("/app");

  const result = data as { stock: number; change: number };
  return { ok: true, stock: Number(result.stock), change: Number(result.change) };
}
