import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/submit-button";
import { requireTenantAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/lib/types";
import {
  createStaffAction,
  deleteStaffAction,
  toggleStaffAction,
  updateTenantAction,
} from "./actions";

const timezones = [
  { value: "Asia/Jakarta", label: "WIB — Asia/Jakarta" },
  { value: "Asia/Makassar", label: "WITA — Asia/Makassar" },
  { value: "Asia/Jayapura", label: "WIT — Asia/Jayapura" },
];

const staffMessages: Record<string, string> = {
  "1": "Akun kasir dibuat. Berikan email dan password kepada kasir Anda.",
  "2": "Akun kasir diaktifkan.",
  "3": "Akun kasir dinonaktifkan dan tidak bisa masuk lagi.",
  "4": "Akun kasir dihapus.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; staff?: string }>;
}) {
  const { supabase, tenant, user } = await requireTenantAdmin();
  const sp = await searchParams;

  const { data: staffData } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, tenant_id, permissions, is_active, created_at")
    .eq("tenant_id", tenant.id)
    .eq("role", "staff")
    .order("created_at");

  const staff = (staffData ?? []) as Profile[];
  const pphActive = Boolean(tenant.tax_enabled);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Pengaturan usaha</h1>
        <p className="text-xs text-slate-500">
          Data ini tampil di struk dan dipakai untuk perhitungan tanggal laporan.
        </p>
      </div>

      {sp.saved && <Alert tone="success">Pengaturan tersimpan.</Alert>}
      {sp.staff && staffMessages[sp.staff] && (
        <Alert tone="success">{staffMessages[sp.staff]}</Alert>
      )}
      {sp.error && <Alert tone="error">{sp.error}</Alert>}

      <div className="card card-pad max-w-2xl">
        <form action={updateTenantAction} className="space-y-3">
          <div>
            <label className="label" htmlFor="name">
              Nama usaha
            </label>
            <input id="name" name="name" required defaultValue={tenant.name} className="input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="phone">
                No. HP / WhatsApp
              </label>
              <input id="phone" name="phone" defaultValue={tenant.phone ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="timezone">
                Zona waktu
              </label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={tenant.timezone}
                className="select"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="address">
              Alamat
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={tenant.address ?? ""}
              className="textarea"
            />
          </div>
          <div>
            <label className="label" htmlFor="receipt_footer">
              Catatan kaki struk
            </label>
            <textarea
              id="receipt_footer"
              name="receipt_footer"
              rows={2}
              defaultValue={tenant.receipt_footer}
              className="textarea"
            />
          </div>
          <div>
            <span className="label">Lebar printer thermal</span>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="receipt_width"
                  value="58"
                  defaultChecked={tenant.receipt_width === "58"}
                />
                58 mm
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="receipt_width"
                  value="80"
                  defaultChecked={tenant.receipt_width === "80"}
                />
                80 mm
              </label>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="tax_enabled" defaultChecked={pphActive} />
              Kenakan PPN pada transaksi
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Kosongkan jika usaha Anda tidak memungut PPN. PPN dihitung otomatis oleh sistem saat
              transaksi disimpan.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="tax_rate">
                  Tarif PPN (%)
                </label>
                <input
                  id="tax_rate"
                  name="tax_rate"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  defaultValue={Number(tenant.tax_rate ?? 11)}
                  className="input"
                />
              </div>
              <div>
                <span className="label">Cara menagih</span>
                <div className="space-y-1 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tax_inclusive"
                      value="0"
                      defaultChecked={!tenant.tax_inclusive}
                    />
                    Ditambahkan ke total
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tax_inclusive"
                      value="1"
                      defaultChecked={tenant.tax_inclusive}
                    />
                    Harga sudah termasuk PPN
                  </label>
                </div>
              </div>
            </div>
          </div>

          <SubmitButton className="btn btn-primary" pendingText="Menyimpan…">
            Simpan pengaturan
          </SubmitButton>
        </form>
      </div>

      <div className="card card-pad max-w-2xl">
        <h2 className="font-semibold">Akun kasir</h2>
        <p className="mt-1 text-xs text-slate-500">
          Kasir hanya bisa membuka menu Kasir (dan riwayat penjualan jika diizinkan). Stok, harga,
          kas, dan laporan tetap terkunci untuk admin usaha.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Izin</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Belum ada akun kasir.
                  </td>
                </tr>
              )}
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.full_name || "-"}</td>
                  <td className="text-slate-600">{s.email}</td>
                  <td className="text-xs text-slate-600">
                    Kasir{s.permissions?.sales ? " + riwayat penjualan" : ""}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        s.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.is_active ? "aktif" : "nonaktif"}
                    </span>
                    <div className="mt-1 text-[11px] text-slate-400">
                      sejak {formatDate(s.created_at, tenant.timezone)}
                    </div>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <form action={toggleStaffAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={s.is_active ? "0" : "1"} />
                        <SubmitButton
                          className="btn btn-outline btn-sm"
                          pendingText="…"
                          confirmText={
                            s.is_active
                              ? `Nonaktifkan akun ${s.full_name || s.email}? Kasir tidak bisa masuk lagi.`
                              : undefined
                          }
                        >
                          {s.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </SubmitButton>
                      </form>
                      <form action={deleteStaffAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <SubmitButton
                          className="btn btn-danger btn-sm"
                          pendingText="…"
                          confirmText={`Hapus permanen akun ${s.full_name || s.email}?`}
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

        <form action={createStaffAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold">Tambah kasir baru</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="staff_name">
                Nama kasir
              </label>
              <input id="staff_name" name="staff_name" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="staff_email">
                Email login
              </label>
              <input
                id="staff_email"
                name="staff_email"
                type="email"
                required
                className="input"
                placeholder="kasir@usahaku.com"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="staff_password">
                Password awal
              </label>
              <input
                id="staff_password"
                name="staff_password"
                type="text"
                required
                minLength={6}
                className="input"
                placeholder="minimal 6 karakter"
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" name="staff_sales" defaultChecked />
              Boleh melihat riwayat penjualan
            </label>
          </div>
          <SubmitButton className="btn btn-secondary" pendingText="Membuat akun…">
            Buat akun kasir
          </SubmitButton>
        </form>
      </div>

      <div className="card card-pad max-w-2xl text-sm">
        <h2 className="font-semibold">Informasi akun</h2>
        <dl className="mt-2 space-y-1 text-slate-600">
          <div className="flex justify-between gap-4">
            <dt>Email admin</dt>
            <dd className="font-medium text-slate-800">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>ID usaha</dt>
            <dd className="font-mono text-xs">{tenant.id}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Data usaha Anda terpisah dari usaha lain. Satu kode lisensi = satu ruang data.
        </p>
      </div>
    </div>
  );
}
