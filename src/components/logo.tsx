/**
 * Logo aplikasi.
 *
 * Gambarnya ada di `public/brand/logo-mark.svg` (file dummy). Ganti isi file
 * itu dengan logo Anda dan seluruh aplikasi — sidebar, halaman masuk, daftar,
 * panel pemilik, serta landing page — ikut berubah tanpa mengubah kode.
 *
 * Nama aplikasi di samping logo diambil dari NEXT_PUBLIC_APP_NAME.
 */
export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "KasUMKM";
  const px = size === "sm" ? 28 : 36;

  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark.svg"
        alt={`Logo ${appName}`}
        width={px}
        height={px}
        className="shrink-0 rounded-lg"
      />
      <span className={`font-semibold tracking-tight ${size === "sm" ? "text-sm" : "text-lg"}`}>
        {appName}
      </span>
    </div>
  );
}
