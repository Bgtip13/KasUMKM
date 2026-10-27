import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function signOutAction(formData: FormData) {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const to = String(formData.get("redirectTo") || "/login");
  redirect(to);
}

export function SignOutForm({ redirectTo = "/login" }: { redirectTo?: string }) {
  return (
    <form action={signOutAction}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-rose-600"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        Keluar
      </button>
    </form>
  );
}
