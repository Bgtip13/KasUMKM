"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatRemaining(ms: number) {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Hitung mundur masa trial 24 jam. Angka pertama baru dihitung di browser
 * (bukan saat render server) supaya tidak ada selisih hydration.
 * Saat waktunya habis, halaman di-refresh dan server mengalihkan ke
 * /masa-trial-berakhir.
 */
export function TrialBanner({ endsAt }: { endsAt: string }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const deadline = new Date(endsAt).getTime();
    let timer = 0;

    const tick = () => {
      const left = deadline - Date.now();
      setRemaining(Math.max(left, 0));
      if (left <= 0) {
        window.clearInterval(timer);
        router.refresh();
      }
    };

    timer = window.setInterval(tick, 1000);
    tick();

    return () => window.clearInterval(timer);
  }, [endsAt, router]);

  return (
    <div className="border-b border-amber-200 bg-amber-50 print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1.5 gap-y-1 px-4 py-2 text-sm text-amber-900">
        <span className="font-medium">Masa trial</span>
        <span>berakhir dalam</span>
        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono font-semibold tabular-nums">
          {remaining === null ? "--:--:--" : formatRemaining(remaining)}
        </span>
        <span className="text-amber-800/80">· semua data tetap tersimpan setelah trial selesai.</span>
      </div>
    </div>
  );
}
