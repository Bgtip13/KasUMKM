import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Tipografi rapat khas aplikasi ERP. Inter di-self-host oleh Next, jadi tidak
// ada permintaan ke server font saat aplikasi dibuka.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

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
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
