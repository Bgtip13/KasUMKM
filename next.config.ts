import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Semua halaman /app bersifat dinamis (butuh cookie sesi), dan Next 15
    // secara default TIDAK menyimpan halaman dinamis di cache router client
    // (staleTimes.dynamic = 0). Akibatnya setiap klik menu = render penuh di
    // server: cold start Worker + query Supabase + transfer RSC.
    //
    // Dengan 30 detik, menu yang sudah pernah dibuka tampil seketika dari cache
    // memori browser. Data yang berubah karena aksi pengguna tetap langsung
    // segar karena setiap server action memanggil revalidatePath() untuk halaman
    // yang terpengaruh.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
