"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { money } from "@/lib/finanzas/format";
import { cn } from "@/lib/utils";

type Child = { name: string; color: string; total: number; pct: number };
type Slice = { name: string; color: string; total: number; pct: number; children?: Child[] };

const MAX_ROWS = 7;

// Agrupa la cola larga en "Otras (N)" para que la lista nunca crezca sin control.
function groupRows(data: Slice[]): Slice[] {
  const sorted = [...data].sort((a, b) => b.total - a.total);
  if (sorted.length <= MAX_ROWS + 1) return sorted;
  const head = sorted.slice(0, MAX_ROWS);
  const tail = sorted.slice(MAX_ROWS);
  const rest: Slice = {
    name: `Otras (${tail.length})`,
    color: "#64748b",
    total: tail.reduce((s, x) => s + x.total, 0),
    pct: tail.reduce((s, x) => s + x.pct, 0),
  };
  return [...head, rest];
}

export function SpendDonut({
  data,
  total,
  label = "Gasto",
  emptyText = "Sin gastos en este periodo.",
}: {
  data: Slice[];
  total: number;
  label?: string;
  emptyText?: string;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<Set<string>>(new Set());

  if (data.length === 0) {
    return (
      <div className="flex h-full min-h-48 items-center justify-center text-sm text-ink">
        {emptyText}
      </div>
    );
  }

  const rows = groupRows(data);
  const maxPct = Math.max(...rows.map((r) => r.pct), 1);

  const toggle = (name: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  return (
    <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[200px_1fr]">
      <div className="relative mx-auto h-48 w-48 sm:h-52 sm:w-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="total"
              nameKey="name"
              innerRadius={64}
              outerRadius={96}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={!reduce}
              animationDuration={700}
            >
              {rows.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs uppercase tracking-wide text-faint">{label}</span>
          <span className="font-display text-xl font-bold tabular-nums text-navy">
            {money(total)}
          </span>
        </div>
      </div>

      <ul className="space-y-3">
        {rows.map((s, i) => {
          const hasChildren = !!s.children?.length;
          const expanded = open.has(s.name);
          return (
            <motion.li
              key={s.name}
              initial={reduce ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.12 + i * 0.05 }}
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

              <div className="mt-1.5 ml-[22px] h-1.5 overflow-hidden rounded-full bg-surface">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: s.color }}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${(s.pct / maxPct) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.18 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>

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
