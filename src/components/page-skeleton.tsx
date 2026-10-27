/**
 * Kerangka halaman yang tampil SEKETIKA saat menu diklik, selagi server
 * menyiapkan datanya. Next.js hanya bisa menampilkan transisi secepat ini kalau
 * segmen rute punya `loading.tsx` sendiri — `loading.tsx` di level /app tidak
 * ikut tampil ketika berpindah antar menu di dalam /app, sehingga halaman lama
 * terlihat "diam" beberapa ratus milidetik dan terasa seperti hang.
 */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-6 w-52 animate-pulse rounded bg-slate-200/70" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200/60" />
      </div>

      <div className="card card-pad">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200/70" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Memuat…</span>
    </div>
  );
}
