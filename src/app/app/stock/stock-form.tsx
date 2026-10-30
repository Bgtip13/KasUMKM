"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/format";
import { stockAdjustAction } from "./actions";

type ProductOption = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  cost_price: number;
  track_stock: boolean;
};

const types = [
  { value: "in", label: "Stok masuk" },
  { value: "out", label: "Stok keluar" },
  { value: "opname", label: "Stok opname" },
] as const;

export function StockForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [type, setType] = useState<"in" | "out" | "opname">("in");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const product = products.find((p) => p.id === productId);

  function submit() {
    setMessage(null);
    const value = Number(qty);
    if (qty === "" || Number.isNaN(value)) {
      setMessage({ tone: "error", text: "Jumlah wajib diisi." });
      return;
    }

    startTransition(async () => {
      const res = await stockAdjustAction({
        product_id: productId,
        type,
        qty: value,
        unit_cost: type === "in" && cost !== "" ? Number(cost) : null,
        note,
      });

      if (!res.ok) {
        setMessage({ tone: "error", text: res.error });
        return;
      }

      setMessage({
        tone: "ok",
        text: `Tersimpan. Stok ${product?.name ?? ""} sekarang ${formatNumber(res.stock)} ${
          product?.unit ?? ""
        }.`,
      });
      setQty("");
      setNote("");
      setCost("");
      router.refresh();
    });
  }

  if (products.length === 0) {
    return (
      <div className="card card-pad text-sm text-slate-600">
        Belum ada produk. Tambahkan produk di menu Produk terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="card card-pad">
      <h2 className="font-semibold">Penyesuaian stok</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="product">
            Produk
          </label>
          <select
            id="product"
            className="select"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (stok {formatNumber(p.stock)} {p.unit})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="type">
            Jenis
          </label>
          <select
            id="type"
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value as "in" | "out" | "opname")}
          >
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="qty">
            {type === "opname" ? "Stok fisik hasil hitung" : "Jumlah"}
          </label>
          <input
            id="qty"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            className="input"
            placeholder={type === "opname" ? String(product?.stock ?? 0) : "0"}
          />
          {type === "opname" && (
            <p className="mt-1 text-xs text-slate-500">
              Isi jumlah fisik. Selisih terhadap stok sistem dicatat otomatis sebagai penyesuaian.
            </p>
          )}
        </div>
        {type === "in" && (
          <div>
            <label className="label" htmlFor="cost">
              Harga beli / unit (opsional)
            </label>
            <input
              id="cost"
              value={cost}
              onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              className="input"
              placeholder={String(product?.cost_price ?? 0)}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="note">
            Catatan
          </label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            placeholder="Contoh: barang rusak, kiriman supplier, hasil hitung fisik"
          />
        </div>
      </div>

      {message && (
        <p
          className={`mt-3 rounded px-3 py-2 text-sm ${
            message.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <button type="button" onClick={submit} disabled={pending} className="btn btn-primary mt-3">
        {pending ? "Menyimpan…" : "Simpan"}
      </button>
    </div>
  );
}
