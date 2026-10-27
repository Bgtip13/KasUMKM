"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth";

export type SalePayload = {
  customer_name: string;
  discount: number;
  tax?: number;
  paid: number;
  payment_method: string;
  note?: string;
  items: { product_id: string; qty: number; unit_price: number; discount?: number }[];
};

export type SaleResult =
  | { ok: true; id: string; invoice_no: string; total: number; change: number }
  | { ok: false; error: string };

export async function createSaleAction(payload: SalePayload): Promise<SaleResult> {
  const { supabase } = await requireTenant();

  if (!payload.items?.length) {
    return { ok: false, error: "Keranjang masih kosong." };
  }

  const { data, error } = await supabase.rpc("create_sale", {
    p_customer_name: payload.customer_name || "Umum",
    p_partner_id: null,
    p_discount: payload.discount || 0,
    p_tax: payload.tax || 0,
    p_paid: payload.paid || 0,
    p_payment_method: payload.payment_method || "cash",
    p_note: payload.note || null,
    p_items: payload.items.map((i) => ({
      product_id: i.product_id,
      qty: i.qty,
      unit_price: i.unit_price,
      discount: i.discount || 0,
    })),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/pos");
  revalidatePath("/app/sales");
  revalidatePath("/app/products");
  revalidatePath("/app/stock");
  revalidatePath("/app/reports");

  const result = data as { id: string; invoice_no: string; total: number; change: number };
  return {
    ok: true,
    id: result.id,
    invoice_no: result.invoice_no,
    total: Number(result.total),
    change: Number(result.change),
  };
}
