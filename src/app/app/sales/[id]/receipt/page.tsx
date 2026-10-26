import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requireSalesAccess } from "@/lib/auth";
import { formatDateTime, formatNumber, formatRupiah } from "@/lib/format";
import type { Sale, SaleItem } from "@/lib/types";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { supabase, tenant } = await requireSalesAccess();
  const { id } = await params;
  const { print } = await searchParams;

  const { data: sale } = await supabase.from("sales").select("*").eq("id", id).maybeSingle<Sale>();
  if (!sale) notFound();

  // sale_items_public tidak menyertakan HPP, sehingga aman dibuka untuk kasir.
  const { data: items } = await supabase
    .from("sale_items_public")
    .select("id, product_name, qty, unit_price, subtotal")
    .eq("sale_id", id)
    .order("product_name");

  const rows = (items ?? []) as Pick<
    SaleItem,
    "id" | "product_name" | "qty" | "unit_price" | "subtotal"
  >[];
  const is80 = tenant.receipt_width === "80";

  return (
    <>
      <style>{`@page { size: ${tenant.receipt_width}mm auto; margin: 2mm; }`}</style>

      <div className="no-print mb-4 flex flex-wrap items-center justify-center gap-2">
        <Link href={`/app/sales/${sale.id}`} className="btn btn-outline">
          ← Detail transaksi
        </Link>
        <PrintButton auto={print === "1"} />
        <Link href="/app/pos" className="btn btn-ghost btn-outline">
          Transaksi baru
        </Link>
      </div>

      <div className={`receipt ${is80 ? "receipt-80" : ""}`}>
        <div className="center">
          <div style={{ fontWeight: 700, fontSize: is80 ? 14 : 12 }}>{tenant.name}</div>
          {tenant.address && <div>{tenant.address}</div>}
          {tenant.phone && <div>Telp {tenant.phone}</div>}
        </div>

        <div className="divider" />

        <div className="row">
          <span>{sale.invoice_no}</span>
          <span>{formatDateTime(sale.sold_at, tenant.timezone)}</span>
        </div>
        <div className="row">
          <span>Pelanggan</span>
          <span>{sale.customer_name}</span>
        </div>
        {sale.cashier_name && (
          <div className="row">
            <span>Kasir</span>
            <span>{sale.cashier_name}</span>
          </div>
        )}

        <div className="divider" />

        {rows.map((item) => (
          <div key={item.id} style={{ marginBottom: 2 }}>
            <div>{item.product_name}</div>
            <div className="row">
              <span>
                {formatNumber(item.qty)} x {formatNumber(item.unit_price)}
              </span>
              <span>{formatNumber(item.subtotal)}</span>
            </div>
          </div>
        ))}

        <div className="divider" />

        <div className="row">
          <span>Subtotal</span>
          <span>{formatNumber(sale.subtotal)}</span>
        </div>
        {Number(sale.discount) > 0 && (
          <div className="row">
            <span>Diskon</span>
            <span>-{formatNumber(sale.discount)}</span>
          </div>
        )}
        {Number(sale.tax) > 0 && (
          <div className="row">
            <span>
              PPN {formatNumber(sale.tax_rate, Number(sale.tax_rate) % 1 === 0 ? 0 : 2)}%
              {tenant.tax_inclusive ? " (incl.)" : ""}
            </span>
            <span>{formatNumber(sale.tax)}</span>
          </div>
        )}
        <div className="row" style={{ fontWeight: 700 }}>
          <span>TOTAL</span>
          <span>{formatRupiah(sale.total)}</span>
        </div>
        <div className="row">
          <span>Bayar ({sale.payment_method})</span>
          <span>{formatNumber(sale.paid)}</span>
        </div>
        <div className="row">
          <span>Kembali</span>
          <span>{formatNumber(sale.change)}</span>
        </div>

        {sale.status === "unpaid" && (
          <>
            <div className="divider" />
            <div className="center">
              SISA TAGIHAN {formatNumber(Number(sale.total) - Number(sale.paid))}
            </div>
          </>
        )}

        <div className="divider" />

        <div className="center" style={{ whiteSpace: "pre-line" }}>
          {tenant.receipt_footer}
        </div>
        <div className="center" style={{ marginTop: 4, fontSize: 9 }}>
          {formatDateTime(new Date(), tenant.timezone)}
        </div>
      </div>
    </>
  );
}
