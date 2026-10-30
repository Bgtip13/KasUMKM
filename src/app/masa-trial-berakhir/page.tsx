import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { SignOutForm } from "@/components/sign-out";
import { getViewer, trialExpired } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function TrialEndedPage() {
  const viewer = await getViewer();

  if (!viewer.user) redirect("/login");
  if (!viewer.tenant) redirect("/register?inactive=1");
  // Kalau trial masih berjalan atau paketnya standard/pro, halaman ini tidak
  // relevan — kembalikan ke aplikasi.
  if (!trialExpired(viewer.tenant)) redirect("/app");

  const tenant = viewer.tenant;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="card card-pad space-y-3">
          <h1 className="text-lg font-semibold">Masa trial sudah berakhir</h1>
          <p className="text-sm text-slate-600">
            Uji coba gratis <span className="font-medium">{tenant.name}</span> berakhir pada{" "}
            {formatDateTime(tenant.trial_ends_at, tenant.timezone)}.
          </p>
          <p className="text-sm text-slate-600">
            Semua data Anda — produk, penjualan, pembelian, stok, dan laporan — tetap tersimpan.
            Minta kode lisensi Standard atau Pro kepada penjual aplikasi, lalu kirimkan kode itu
            beserta nama usaha Anda. Paket akan diaktifkan dari panel pemilik, jadi tidak ada data
            yang perlu dimasukkan ulang.
          </p>
          <div className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Kasir dan staf di usaha ini juga tidak bisa masuk selama paket belum diaktifkan.
          </div>
          <SignOutForm redirectTo="/login" />
        </div>
      </div>
    </div>
  );
}
