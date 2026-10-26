"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, formatRupiah } from "@/lib/format";
import { createPurchaseAction } from "../actions";

type ProductOption = {
  id: string;
  name: string;
  unit: string;
  cost_price: number;
  stock: number;
};

type Line = {
  id: string;
  name: string;
  unit: string;
  qty: number;
  cost: number;
};

export function PurchaseForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState(String(products[0]?.cost_price ?? 0));
  const [lines, setLines] = useState<Line[]>([]);
  const [supplier, setSupplier] = useState("");
  const [paid, setPaid] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => lines.reduce((sum, l) => sum + l.qty * l.cost, 0), [lines]);
  const paidValue = paid === "" ? total : Number(paid) || 0;

  function selectProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setCost(String(p.cost_price ?? 0));
  }

  function addLine() {
    setError(null);
    const p = products.find((x) => x.id === productId);
    if (!p) {
      setError("Pilih produk terlebih dahulu.");
      return;
    }
    const q = Number(qty) || 0;
    const c = Number(cost) || 0;
    if (q <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.id === p.id);
      if (existing) {
        return prev.map((l) => (l.id === p.id ? { ...l, qty: l.qty + q, cost: c } : l));
      }
      return [...prev, { id: p.id, name: p.name, unit: p.unit, qty: q, cost: c }];
    });
    setQty("1");
  }

  function submit() {
    setError(null);
    if (!lines.length) {
      setError("Tambahkan minimal satu barang.");
      return;
    }

    startTransition(async () => {
      const res = await createPurchaseAction({
        supplier_name: supplier || "Umum",
        paid: paidValue,
        note,
        items: lines.map((l) => ({ product_id: l.id, qty: l.qty, unit_cost: l.cost })),
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      router.push("/app/purchases?saved=1");
    });
  }

  if (products.length === 0) {
    return (
      <div className="card card-pad text-sm text-slate-600">
        Belum ada produk. Tambahkan produk dulu di menu Produk sebelum mencatat pembelian.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="card card-pad">
          <h2 className="font-semibold">Tambah barang</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_100px_140px_auto]">
            <div>
              <label className="label" htmlFor="product">
                Produk
              </label>
              <select
                id="product"
                className="select"
                value={productId}
                onChange={(e) => selectProduct(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="qty">
                Jumlah
              </label>
              <input
                id="qty"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="cost">
                Harga beli / unit
              </label>
              <input
                id="cost"
                value={cost}
                onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={addLine} className="btn btn-outline w-full">
                Tambah
              </button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Harga</th>
                  <th className="text-right">Subtotal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Belum ada barang.
                    </td>
                  </tr>
                )}
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td className="text-right">
                      {formatNumber(l.qty)} {l.unit}
                    </td>
                    <td className="text-right">{formatRupiah(l.cost)}</td>
                    <td className="text-right font-medium">{formatRupiah(l.qty * l.cost)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-rose-600"
                        onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card card-pad space-y-3 lg:sticky lg:top-4 lg:h-fit">
        <div>
          <label className="label" htmlFor="supplier">
            Pemasok
          </label>
          <input
            id="supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="input"
            placeholder="Umum"
          />
        </div>

        <div>
          <label className="label" htmlFor="paid">
            Dibayar (Rp)
          </label>
          <input
            id="paid"
            value={paid}
            onChange={(e) => setPaid(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            className="input"
            placeholder={String(total)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Kosongkan bila lunas. Isi lebih kecil dari total bila berutang.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="note">
            Catatan
          </label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            placeholder="Opsional"
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base font-semibold">
          <span>Total</span>
          <span>{formatRupiah(total)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Sisa utang</span>
          <span className={paidValue < total ? "text-amber-700" : "text-emerald-700"}>
            {formatRupiah(Math.max(total - paidValue, 0))}
          </span>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={pending || !lines.length}
          className="btn btn-primary w-full"
        >
          {pending ? "Menyimpan…" : "Simpan pembelian"}
        </button>
      </div>
    </div>
  );
}
