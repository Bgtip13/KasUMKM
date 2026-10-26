import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
      <button type="submit" className="text-sm text-slate-500 hover:text-rose-600">
        Keluar
      </button>
    </form>
  );
}
