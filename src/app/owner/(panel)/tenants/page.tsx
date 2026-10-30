import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/submit-button";
import { requireOwner } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/format";
import { deleteTenantAction } from "../../actions";

type Overview = {
  tenant_id: string;
  name: string;
  admin_email: string | null;
  created_at: string;
  product_count: number;
  sales_count: number;
  revenue: number;
};

export default async function OwnerTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const { supabase } = await requireOwner();
  const params = await searchParams;

  const { data, error } = await supabase.rpc("owner_tenant_overview");
  const rows = (data ?? []) as Overview[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Daftar usaha</h1>
        <p className="text-xs text-slate-500">
          Semua usaha yang aktif dari kode lisensi yang terjual.
        </p>
      </div>

      {params.deleted && (
        <Alert tone="success">
          Usaha &ldquo;{params.deleted}&rdquo; beserta seluruh datanya dihapus.
        </Alert>
      )}
      {params.error && <Alert tone="error">{params.error}</Alert>}

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Gagal memuat data: {error.message}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Usaha</th>
                <th>Admin</th>
                <th>Produk</th>
                <th>Transaksi</th>
                <th>Total omzet</th>
                <th>Bergabung</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Belum ada usaha yang aktivasi lisensi.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.tenant_id}>
                  <td className="font-medium">{t.name}</td>
                  <td className="text-slate-600">{t.admin_email ?? "—"}</td>
                  <td>{t.product_count}</td>
                  <td>{t.sales_count}</td>
                  <td>{formatRupiah(t.revenue)}</td>
                  <td className="whitespace-nowrap text-slate-600">{formatDate(t.created_at)}</td>
                  <td>
                    <form action={deleteTenantAction} className="flex justify-end">
                      <input type="hidden" name="tenant_id" value={t.tenant_id} />
                      <input type="hidden" name="name" value={t.name} />
                      <SubmitButton
                        className="btn btn-danger btn-sm"
                        pendingText="Menghapus…"
                        confirmText={`Hapus usaha "${t.name}" beserta seluruh data (${t.product_count} produk, ${t.sales_count} transaksi) dan akun adminnya? Tindakan ini tidak bisa dibatalkan.`}
                      >
                        Hapus
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Menghapus usaha akan menghapus produk, penjualan, pembelian, stok, kas, dan akun
        admin/kasirnya secara permanen. Kode lisensi yang dipakai usaha tersebut juga ikut dihapus
        dari halaman Kode lisensi.
      </p>
    </div>
  );
}
