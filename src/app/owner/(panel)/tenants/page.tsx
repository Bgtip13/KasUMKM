import { requireOwner } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/format";

type Overview = {
  tenant_id: string;
  name: string;
  admin_email: string | null;
  created_at: string;
  product_count: number;
  sales_count: number;
  revenue: number;
};

export default async function OwnerTenantsPage() {
  const { supabase } = await requireOwner();

  const { data, error } = await supabase.rpc("owner_tenant_overview");
  const rows = (data ?? []) as Overview[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Daftar usaha</h1>
        <p className="text-sm text-slate-500">
          Semua usaha yang aktif dari kode lisensi yang terjual.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
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
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
