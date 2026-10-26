import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KasUMKM — Pembukuan & Kasir UMKM",
  description:
    "Aplikasi pembukuan, kasir, stok, dan laporan laba rugi untuk UMKM. Cetak struk thermal, kelola pembelian, dan pantau arus kas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
