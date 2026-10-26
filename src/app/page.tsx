import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/alert";

export default async function LandingPage() {
  if (supabaseConfigured()) {
    const viewer = await getViewer();
    if (viewer.user) {
      if (viewer.isOwner) redirect("/owner");
      if (viewer.profile?.tenant_id) redirect("/app");
      redirect("/register?inactive=1");
    }
  }

  const features = [
    {
      title: "Kasir + struk thermal",
      desc: "Transaksi cepat, cetak ke printer thermal 58mm/80mm langsung dari browser.",
    },
    {
      title: "Stok lengkap",
      desc: "Stok masuk, keluar, dan stok opname dengan kartu stok yang bisa diaudit.",
    },
    {
      title: "Pembelian & pemasok",
      desc: "Catat pembelian, HPP dihitung otomatis dengan rata-rata bergerak.",
    },
    {
      title: "Laba rugi otomatis",
      desc: "Omzet, HPP, laba kotor, biaya operasional, dan laba bersih per periode.",
    },
    {
      title: "Kas di luar transaksi",
      desc: "Catat pemasukan dan pengeluaran seperti sewa, listrik, dan modal.",
    },
    {
      title: "Data terpisah per lisensi",
      desc: "Setiap kode lisensi punya ruang data sendiri yang tidak bisa saling lihat.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-outline">
              Masuk
            </Link>
            <Link href="/register" className="btn btn-primary">
              Aktivasi lisensi
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        {!supabaseConfigured() && (
          <div className="mb-8">
            <Alert tone="warning">
              Database belum terhubung. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, dan{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> di <code>.env.local</code> lalu jalankan ulang
              server.
            </Alert>
          </div>
        )}

        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="badge bg-emerald-50 text-emerald-700">Untuk UMKM Indonesia</span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Pembukuan rapi, tanpa bikin repot.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Kasir, stok, pembelian, kas, dan laporan laba rugi dalam satu aplikasi. Cukup satu kode
              lisensi untuk mulai.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">
                Aktivasi kode lisensi
              </Link>
              <Link href="/login" className="btn btn-outline">
                Saya sudah punya akun
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Pemilik aplikasi?{" "}
              <Link href="/owner/login" className="font-medium text-emerald-700 hover:underline">
                Masuk ke panel penjual lisensi
              </Link>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="card card-pad">
                <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        {process.env.NEXT_PUBLIC_APP_NAME || "KasUMKM"} — aplikasi pembukuan UMKM
      </footer>
    </div>
  );
}
