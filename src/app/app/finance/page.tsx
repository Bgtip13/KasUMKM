import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/submit-button";
import { requireTenantAdmin } from "@/lib/auth";
import {
  addDays,
  formatDateInput,
  formatRupiah,
  monthStartIn,
  todayIn,
  zonedDayStart,
} from "@/lib/format";
import type { CashTransaction } from "@/lib/types";
import { createCashAction, deleteCashAction } from "./actions";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const { supabase, tenant } = await requireTenantAdmin();
  const sp = await searchParams;

  const from = sp.from || monthStartIn(tenant.timezone);
  const to = sp.to || todayIn(tenant.timezone);

  const { data } = await supabase
    .from("cash_transactions")
    .select("*")
    .gte("occurred_at", zonedDayStart(from, tenant.timezone).toISOString())
    .lt("occurred_at", zonedDayStart(addDays(to, 1), tenant.timezone).toISOString())
    .order("occurred_at", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as CashTransaction[];
  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
  const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);

  const dateInput = formatDateInput(new Date(), tenant.timezone);

  const suggestions = [
    "Penjualan lain",
    "Modal",
    "Sewa",
    "Listrik & air",
    "Gaji",
    "Transport",
    "Perlengkapan",
    "Iklan",
    "Lain-lain",
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Kas masuk & keluar</h1>
        <p className="text-xs text-slate-500">
          Untuk transaksi di luar penjualan dan pembelian, misalnya sewa, listrik, atau modal.
        </p>
      </div>

      {sp.saved && <Alert tone="success">Transaksi kas tersimpan.</Alert>}
      {sp.deleted && <Alert tone="info">Transaksi kas dihapus.</Alert>}
      {sp.error && <Alert tone="error">{sp.error}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="card card-pad">
          <h2 className="font-semibold">Catat transaksi</h2>
          <form action={createCashAction} className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="type">
                Jenis
              </label>
              <select id="type" name="type" className="select" defaultValue="expense">
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="category">
                Kategori
              </label>
              <input
                id="category"
                name="category"
                required
                list="category-options"
                className="input"
                placeholder="Listrik & air"
              />
              <datalist id="category-options">
                {suggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label" htmlFor="amount">
                Jumlah (Rp)
              </label>
              <input
                id="amount"
                name="amount"
                required
                inputMode="numeric"
                className="input"
                placeholder="150000"
              />
            </div>
            <div>
              <label className="label" htmlFor="date">
                Tanggal
              </label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={dateInput}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="note">
                Catatan
              </label>
              <input id="note" name="note" className="input" placeholder="Opsional" />
            </div>
            <SubmitButton pendingText="Menyimpan…">Simpan</SubmitButton>
          </form>
        </div>

        <div className="space-y-4">
          <form className="card card-pad flex flex-wrap items-end gap-3" method="get">
            <div>
              <label className="label" htmlFor="from">
                Dari
              </label>
              <input id="from" name="from" type="date" defaultValue={from} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="to">
                Sampai
              </label>
              <input id="to" name="to" type="date" defaultValue={to} className="input" />
            </div>
            <button type="submit" className="btn btn-secondary">
              Tampilkan
            </button>
            <div className="ml-auto grid grid-cols-2 gap-4 text-right">
              <div>
                <div className="text-xs text-slate-500">Pemasukan</div>
                <div className="font-semibold text-emerald-700">{formatRupiah(income)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Pengeluaran</div>
                <div className="font-semibold text-rose-700">{formatRupiah(expense)}</div>
              </div>
            </div>
          </form>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Kategori</th>
                    <th>Catatan</th>
                    <th className="text-right">Jumlah</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Belum ada catatan kas pada periode ini.
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap text-slate-600">
                        {formatDateInput(r.occurred_at, tenant.timezone)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            r.type === "income"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {r.type === "income" ? "masuk" : "keluar"}
                        </span>
                      </td>
                      <td>{r.category}</td>
                      <td className="max-w-40 truncate text-slate-600">{r.note ?? "—"}</td>
                      <td className="text-right font-medium">{formatRupiah(r.amount)}</td>
                      <td className="text-right">
                        <form action={deleteCashAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
                            Hapus
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
