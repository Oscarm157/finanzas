"use client";

import { motion, useReducedMotion } from "motion/react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { money } from "@/lib/finanzas/format";

type Slice = { name: string; color: string; total: number; pct: number };

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

  if (data.length === 0) {
    return (
      <div className="flex h-full min-h-48 items-center justify-center text-sm text-ink">
        {emptyText}
      </div>
    );
  }

  const rows = groupRows(data);
  const maxPct = Math.max(...rows.map((r) => r.pct), 1);

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
        {rows.map((s, i) => (
          <motion.li
            key={s.name}
            initial={reduce ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.12 + i * 0.05 }}
          >
            <div className="flex items-center gap-2.5 text-sm">
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
            </div>
            <div className="mt-1.5 ml-[18px] h-1.5 overflow-hidden rounded-full bg-surface">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: s.color }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${(s.pct / maxPct) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.18 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
