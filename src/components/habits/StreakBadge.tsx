import { Flame } from "lucide-react";

export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums text-warn"
      style={{ background: "color-mix(in srgb, var(--warn) 14%, transparent)" }}
    >
      <Flame className="size-3.5" strokeWidth={2.25} />
      {streak}
    </span>
  );
}
