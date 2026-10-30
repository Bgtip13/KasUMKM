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
      className={`flex items-start gap-1.5 rounded border-l-2 px-2.5 py-1.5 text-xs ${box}`}
      role="alert"
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
