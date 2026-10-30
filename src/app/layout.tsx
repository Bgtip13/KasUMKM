import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KasUMKM — Pembukuan & Kasir UMKM",
  description:
    "Aplikasi pembukuan, kasir, stok, dan laporan laba rugi untuk UMKM. Cetak struk thermal, kelola pembelian, dan pantau arus kas.",
  // Favicon memakai berkas logo yang sama, jadi cukup satu gambar yang perlu
  // diganti: public/brand/logo-mark.svg.
  icons: { icon: "/brand/logo-mark.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
