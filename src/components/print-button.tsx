"use client";

import { useEffect } from "react";

export function PrintButton({ auto = false, label = "Cetak" }: { auto?: boolean; label?: string }) {
  useEffect(() => {
    if (auto) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [auto]);

  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      {label}
    </button>
  );
}
