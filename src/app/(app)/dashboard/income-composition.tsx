"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";

import { money } from "@/lib/finanzas/format";
import { cn } from "@/lib/utils";

type Child = { name: string; color: string; total: number; pct: number };
type Slice = { name: string; color: string; total: number; pct: number; children?: Child[] };

// Familia de layout distinta a la del gasto: una sola barra de composición
// apilada + leyenda compacta. Sin donut, para que las dos secciones no se lean
// como clones.
export function IncomeComposition({
  data,
  total,
}: {
  data: Slice[];
  total: number;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (name: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  if (data.length === 0) {
    return (
      <div className="flex h-full min-h-48 items-center justify-center text-sm text-ink">
        Sin ingresos en este periodo.
      </div>
    );
  }

  const rows = [...data].sort((a, b) => b.total - a.total);

  return (
    <div className="flex h-full flex-col">
      <div>
        <span className="text-xs uppercase tracking-wide text-faint">Total ingreso</span>
        <div className="mt-1 font-display text-3xl font-bold tabular-nums text-income">
          {money(total)}
        </div>
      </div>

      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-surface">
        {rows.map((s, i) => (
          <motion.div
            key={s.name}
            style={{ backgroundColor: s.color }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${s.pct}%` }}
            transition={{ duration: 0.6, delay: 0.15 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>

      <ul className="mt-5 max-h-52 space-y-3 overflow-y-auto pr-1">
        {rows.map((s, i) => {
          const hasChildren = !!s.children?.length;
          const expanded = open.has(s.name);
          return (
            <motion.li
              key={s.name}
              initial={reduce ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.05 }}
            >
              <button
                type="button"
                onClick={() => hasChildren && toggle(s.name)}
                className={cn(
                  "flex w-full items-center gap-2.5 text-left text-sm",
                  !hasChildren && "cursor-default",
                )}
              >
                {hasChildren ? (
                  <ChevronRight
                    className={cn(
                      "size-3.5 shrink-0 text-faint transition-transform",
                      expanded && "rotate-90",
                    )}
                  />
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="min-w-0 flex-1 truncate text-navy">{s.name}</span>
                <span className="w-28 shrink-0 text-right tabular-nums text-ink">
                  {money(s.total)}
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums text-faint">
                  {s.pct}%
                </span>
              </button>
              {hasChildren && expanded && (
                <ul className="mt-2 ml-[22px] space-y-1.5 border-l border-line pl-3">
                  {s.children!.map((c) => (
                    <li key={c.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
                      <span className="w-24 shrink-0 text-right tabular-nums text-ink">
                        {money(c.total)}
                      </span>
                      <span className="w-9 shrink-0 text-right tabular-nums text-faint">
                        {c.pct}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
