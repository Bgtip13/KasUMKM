"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { toNumber, toText, todayIn, zonedDayStart } from "@/lib/format";

export async function createCashAction(formData: FormData) {
  const { supabase, tenant } = await requireTenant();

  const type = formData.get("type") === "income" ? "income" : "expense";
  const category = toText(formData.get("category"));
  const amount = toNumber(formData.get("amount"));
  const date = toText(formData.get("date"), todayIn(tenant.timezone));
  const note = toText(formData.get("note")) || null;

  if (!category || amount <= 0) {
    redirect("/app/finance?error=" + encodeURIComponent("Kategori dan jumlah wajib diisi."));
  }

  const { error } = await supabase.from("cash_transactions").insert({
    tenant_id: tenant.id,
    type,
    category,
    amount,
    note,
    occurred_at: zonedDayStart(date, tenant.timezone).toISOString(),
  });

  if (error) {
    redirect("/app/finance?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/app/finance");
  revalidatePath("/app");
  revalidatePath("/app/reports");
  redirect("/app/finance?saved=1");
}

export async function deleteCashAction(formData: FormData) {
  const { supabase } = await requireTenant();
  const id = String(formData.get("id") ?? "");

  if (id) {
    const { error } = await supabase.from("cash_transactions").delete().eq("id", id);
    if (error) {
      redirect("/app/finance?error=" + encodeURIComponent(error.message));
    }
  }

  revalidatePath("/app/finance");
  revalidatePath("/app/reports");
  redirect("/app/finance?deleted=1");
}
