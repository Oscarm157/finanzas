import { cn } from "@/lib/utils";

const LABELS: Record<string, { label: string; className: string }> = {
  ready: { label: "Listo", className: "bg-[#e9f6ef] text-income" },
  review: { label: "En revisión", className: "bg-[#fdf3e3] text-warn" },
  parsing: { label: "Procesando", className: "bg-surface text-ink" },
  error: { label: "Con error", className: "bg-[#fbeaea] text-alert" },
};

export function StatusChip({ status }: { status: string }) {
  const s = LABELS[status] ?? { label: status, className: "bg-surface text-ink" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}
