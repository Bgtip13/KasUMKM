export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "KasUMKM";
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid place-items-center rounded-lg bg-emerald-600 font-bold text-white ${
          size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9 text-base"
        }`}
      >
        K
      </span>
      <span className={`font-semibold tracking-tight ${size === "sm" ? "text-sm" : "text-lg"}`}>
        {appName}
      </span>
    </div>
  );
}
