"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantAdmin } from "@/lib/auth";

export async function cancelSaleAction(formData: FormData) {
  const { supabase } = await requireTenantAdmin();
  const id = String(formData.get("id") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/app/sales");

  if (!id) {
    redirect("/app/sales?error=" + encodeURIComponent("Transaksi tidak ditemukan."));
  }

  const { error } = await supabase.rpc("delete_sale", { p_sale_id: id });

  if (error) {
    redirect(`${redirectTo}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/app");
  revalidatePath("/app/pos");
  revalidatePath("/app/sales");
  revalidatePath("/app/products");
  revalidatePath("/app/stock");
  revalidatePath("/app/reports");

  redirect("/app/sales?deleted=1");
}
