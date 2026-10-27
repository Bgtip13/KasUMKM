import { CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from "lucide-react";

const tones: Record<
  "info" | "error" | "success" | "warning",
  { box: string; Icon: LucideIcon }
> = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-800", Icon: Info },
  error: { box: "border-rose-200 bg-rose-50 text-rose-800", Icon: CircleX },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: CircleCheck },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", Icon: TriangleAlert },
};

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success" | "warning";
  children: React.ReactNode;
}) {
  const { box, Icon } = tones[tone];

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${box}`}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
