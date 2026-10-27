"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { formatNumber, formatRupiah } from "@/lib/format";
import { createSaleAction } from "./actions";

type PosProduct = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  sell_price: number;
  stock: number;
  track_stock: boolean;
};

type CartLine = {
  id: string;
  name: string;
  unit: string;
  price: number;
  qty: number;
  stock: number;
  track_stock: boolean;
};

export function PosClient({
  products,
  receiptWidth,
  taxEnabled,
  taxRate,
  taxInclusive,
}: {
  products: PosProduct[];
  currencyLabel: string;
  receiptWidth: string;
  taxEnabled: boolean;
  taxRate: number;
  taxInclusive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 24);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q),
      )
      .slice(0, 24);
  }, [products, query]);

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  const discountValue = Math.min(Number(discount) || 0, subtotal);
  const taxableBase = Math.max(subtotal - discountValue, 0);
  const taxValue =
    taxEnabled && taxRate > 0
      ? Math.round(taxInclusive ? (taxableBase * taxRate) / (100 + taxRate) : (taxableBase * taxRate) / 100)
      : 0;
  const total = taxableBase + (taxEnabled && !taxInclusive ? taxValue : 0);
  const paidValue = paid === "" ? total : Number(paid) || 0;
  const change = Math.max(paidValue - total, 0);

  function addProduct(p: PosProduct) {
    setError(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.id === p.id);
      if (existing) {
        return prev.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          unit: p.unit,
          price: Number(p.sell_price),
          qty: 1,
          stock: Number(p.stock),
          track_stock: p.track_stock,
        },
      ];
    });
  }

  function updateLine(id: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }

  function resetForm() {
    setCart([]);
    setCustomer("");
    setDiscount("0");
    setPaid("");
    setMethod("cash");
  }

  function submit() {
    setError(null);
    if (cart.length === 0) {
      setError("Keranjang masih kosong.");
      return;
    }
    const invalid = cart.find((l) => l.qty <= 0);
    if (invalid) {
      setError(`Jumlah untuk ${invalid.name} tidak valid.`);
      return;
    }
    const overStock = cart.find((l) => l.track_stock && l.qty > l.stock);
    if (overStock) {
      setError(`Stok ${overStock.name} tidak cukup (tersisa ${formatNumber(overStock.stock)}).`);
      return;
    }

    startTransition(async () => {
      const res = await createSaleAction({
        customer_name: customer || "Umum",
        discount: discountValue,
        paid: paidValue,
        payment_method: method,
        items: cart.map((l) => ({ product_id: l.id, qty: l.qty, unit_price: l.price })),
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      resetForm();
      router.push(`/app/sales/${res.id}/receipt?print=1`);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <div className="card card-pad">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input"
            placeholder="Cari produk atau SKU…"
            autoFocus
          />

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filtered.map((p) => {
              const outOfStock = p.track_stock && Number(p.stock) <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  disabled={outOfStock}
                  className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="line-clamp-2 text-sm font-medium text-slate-800">{p.name}</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-700">
                    {formatRupiah(p.sell_price)}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {p.track_stock
                      ? `Stok ${formatNumber(p.stock)} ${p.unit}`
                      : "Tanpa stok"}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-slate-500">
                Produk tidak ditemukan. Tambahkan dulu di menu Produk.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card card-pad lg:sticky lg:top-4 lg:h-fit">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Keranjang</h2>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-rose-600"
            >
              Kosongkan
            </button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {cart.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
              Belum ada item. Klik produk di sebelah kiri.
            </p>
          )}

          {cart.map((l) => (
            <div key={l.id} className="rounded-lg border border-slate-200 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium text-slate-800">{l.name}</div>
                <button
                  type="button"
                  onClick={() => removeLine(l.id)}
                  className="rounded-md p-0.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Hapus ${l.name}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center rounded-md border border-slate-200">
                  <button
                    type="button"
                    className="px-2 py-1 text-slate-600"
                    onClick={() => updateLine(l.id, { qty: Math.max(1, l.qty - 1) })}
                  >
                    −
                  </button>
                  <input
                    value={l.qty}
                    onChange={(e) =>
                      updateLine(l.id, { qty: Math.max(1, Number(e.target.value) || 1) })
                    }
                    inputMode="numeric"
                    className="w-12 border-x border-slate-200 py-1 text-center text-sm outline-none"
                  />
                  <button
                    type="button"
                    className="px-2 py-1 text-slate-600"
                    onClick={() => updateLine(l.id, { qty: l.qty + 1 })}
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  ×
                  <input
                    value={l.price}
                    onChange={(e) => updateLine(l.id, { price: Number(e.target.value) || 0 })}
                    inputMode="numeric"
                    className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm text-slate-800 outline-none"
                  />
                </div>
                <div className="ml-auto text-sm font-medium">{formatRupiah(l.price * l.qty)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <div>
            <label className="label" htmlFor="customer">
              Nama pelanggan
            </label>
            <input
              id="customer"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="input"
              placeholder="Umum"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="discount">
                Diskon (Rp)
              </label>
              <input
                id="discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="method">
                Pembayaran
              </label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="select"
              >
                <option value="cash">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {discountValue > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Diskon</span>
              <span className="text-rose-600">−{formatRupiah(discountValue)}</span>
            </div>
          )}
          {taxValue > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">
                PPN {formatNumber(taxRate, 2)}%{taxInclusive ? " (termasuk)" : ""}
              </span>
              <span>{formatRupiah(taxValue)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatRupiah(total)}</span>
          </div>

          <div>
            <label className="label" htmlFor="paid">
              Uang diterima
            </label>
            <input
              id="paid"
              value={paid}
              onChange={(e) => setPaid(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              className="input"
              placeholder={String(total)}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Kembalian</span>
            <span className="font-medium text-emerald-700">{formatRupiah(change)}</span>
          </div>

          {paidValue < total && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Pembayaran kurang {formatRupiah(total - paidValue)} — transaksi akan tercatat sebagai
              piutang.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={pending || cart.length === 0}
            className="btn btn-primary w-full"
          >
            {pending ? "Menyimpan…" : `Simpan & cetak (${receiptWidth}mm)`}
          </button>
        </div>
      </div>
    </div>
  );
}
