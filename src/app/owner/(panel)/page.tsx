import { Alert } from "@/components/alert";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatDateTime } from "@/lib/format";
import type { LicenseCode } from "@/lib/types";
import {
  createLicensesAction,
  deleteLicenseAction,
  revokeLicenseAction,
  updateTenantPlanAction,
} from "../actions";

const statusStyle: Record<string, string> = {
  unused: "bg-emerald-50 text-emerald-700",
  used: "bg-slate-100 text-slate-600",
  revoked: "bg-rose-50 text-rose-700",
};

export default async function OwnerLicensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    error?: string;
    revoked?: string;
    deleted?: string;
    saved?: string;
  }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const admin = createAdminClient();

  // Dua query terpisah: daftar lisensi dan info paket tiap usaha. Kalau kolom
  // plan/trial_ends_at belum ada (migrasi 0002 belum dijalankan), hanya query
  // kedua yang gagal — daftar kode dan tombol hapus tetap berfungsi.
  const [{ data }, { data: planData, error: planError }] = await Promise.all([
    admin.from("license_codes").select("*, tenants(name)").order("created_at", { ascending: false }),
    admin.from("tenants").select("id, plan, trial_ends_at"),
  ]);

  type TenantPlan = { id: string; plan: string; trial_ends_at: string | null };
  const plans = new Map<string, TenantPlan>(
    ((planData ?? []) as TenantPlan[]).map((t) => [t.id, t]),
  );

  const licenses = ((data ?? []) as LicenseCode[]).map((l) => ({
    ...l,
    activePlan: l.tenant_id ? plans.get(l.tenant_id) ?? null : null,
  }));
  const available = licenses.filter((l) => l.status === "unused").length;
  const used = licenses.filter((l) => l.status === "used").length;
  const revoked = licenses.filter((l) => l.status === "revoked").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Kode lisensi</h1>
        <p className="text-sm text-slate-500">
          Setiap kode yang diaktivasi membuat satu ruang usaha dengan data yang terpisah.
        </p>
      </div>

      {params.created && (
        <Alert tone="success">{params.created} kode lisensi berhasil dibuat.</Alert>
      )}
      {params.revoked && <Alert tone="info">Kode lisensi dinonaktifkan.</Alert>}
      {params.deleted && <Alert tone="info">Kode lisensi dihapus.</Alert>}
      {params.saved && <Alert tone="success">Paket usaha diperbarui.</Alert>}
      {planError && (
        <Alert tone="warning">
          Info paket belum bisa dibaca ({planError.message}). Jalankan{" "}
          <code>supabase/migrations/0002_plan_trial.sql</code> di Supabase SQL Editor.
        </Alert>
      )}
      {params.error && <Alert tone="error">{params.error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Siap dijual", value: available, tone: "text-emerald-700" },
          { label: "Sudah dipakai", value: used, tone: "text-slate-900" },
          { label: "Dinonaktifkan", value: revoked, tone: "text-rose-700" },
        ].map((s) => (
          <div key={s.label} className="card card-pad">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card card-pad">
        <h2 className="font-semibold">Buat kode baru</h2>
        <p className="mt-1 text-sm text-slate-500">
          Berikan kode ini kepada pembeli. Mereka mengaktivasinya di halaman{" "}
          <code>/register</code>.
        </p>
        <form action={createLicensesAction} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="count">
              Jumlah
            </label>
            <input
              id="count"
              name="count"
              type="number"
              min={1}
              max={50}
              defaultValue={1}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="plan">
              Paket
            </label>
            <select id="plan" name="plan" className="select" defaultValue="standard">
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
              <option value="trial">Trial</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="note">
              Catatan (nama pembeli, dsb.)
            </label>
            <input id="note" name="note" className="input" placeholder="Contoh: Toko Bu Siti" />
          </div>
          <div className="sm:col-span-4">
            <SubmitButton className="btn btn-primary" pendingText="Membuat…">
              Generate kode
            </SubmitButton>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Paket</th>
                <th>Status</th>
                <th>Usaha</th>
                <th>Catatan</th>
                <th>Dibuat</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {licenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Belum ada kode lisensi. Buat kode pertama Anda di atas.
                  </td>
                </tr>
              )}
              {licenses.map((l) => (
                <tr key={l.id}>
                  <td className="font-mono font-medium">{l.code}</td>
                  <td>
                    <span className="capitalize">{l.plan}</span>
                    {l.activePlan && (
                      <div className="text-xs text-slate-500">
                        aktif: <span className="capitalize">{l.activePlan.plan}</span>
                        {l.activePlan.plan === "trial" && l.activePlan.trial_ends_at && (
                          <> · s.d. {formatDateTime(l.activePlan.trial_ends_at)}</>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${statusStyle[l.status]}`}>
                      {l.status === "unused" ? "belum dipakai" : l.status}
                    </span>
                  </td>
                  <td>{l.tenants?.name ?? "—"}</td>
                  <td className="max-w-40 truncate text-slate-600">{l.note ?? "—"}</td>
                  <td className="whitespace-nowrap text-slate-600">{formatDate(l.created_at)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <CopyButton value={l.code} />
                      {l.status === "unused" && (
                        <form action={revokeLicenseAction}>
                          <input type="hidden" name="id" value={l.id} />
                          <button type="submit" className="btn btn-danger btn-sm">
                            Nonaktifkan
                          </button>
                        </form>
                      )}
                      {l.tenant_id && (
                        <form action={updateTenantPlanAction} className="flex items-center gap-1">
                          <input type="hidden" name="tenant_id" value={l.tenant_id} />
                          <select
                            name="plan"
                            defaultValue={l.activePlan?.plan ?? l.plan}
                            className="select h-8 w-24 py-1 text-xs"
                            aria-label={`Paket untuk ${l.tenants?.name ?? "usaha ini"}`}
                          >
                            <option value="standard">Standard</option>
                            <option value="pro">Pro</option>
                            <option value="trial">Trial 24 jam</option>
                          </select>
                          <SubmitButton className="btn btn-outline btn-sm" pendingText="…">
                            Ubah
                          </SubmitButton>
                        </form>
                      )}
                      <form action={deleteLicenseAction}>
                        <input type="hidden" name="id" value={l.id} />
                        <SubmitButton
                          className="btn btn-danger btn-sm"
                          pendingText="Menghapus…"
                          confirmText={
                            l.status === "used"
                              ? "Hapus kode ini dari daftar? Usaha dan seluruh datanya TIDAK ikut terhapus."
                              : "Hapus kode lisensi ini?"
                          }
                        >
                          Hapus
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
