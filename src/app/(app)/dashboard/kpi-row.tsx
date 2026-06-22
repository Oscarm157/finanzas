"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { money } from "@/lib/finanzas/format";
import { cn } from "@/lib/utils";

type Kpi = { label: string; value: number; tone?: "navy" | "income" | "signed" };

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 850;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  return <span className="tabular-nums">{money(display)}</span>;
}

export function KpiRow({
  ingresos,
  gastos,
  balance,
  saldoFinal,
}: {
  ingresos: number;
  gastos: number;
  balance: number;
  saldoFinal: number;
}) {
  const reduce = useReducedMotion();
  const kpis: Kpi[] = [
    { label: "Ingresos", value: ingresos, tone: "income" },
    { label: "Gastos", value: gastos, tone: "navy" },
    { label: "Balance del mes", value: balance, tone: "signed" },
    { label: "Saldo final", value: saldoFinal, tone: "navy" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k, i) => {
        const toneClass =
          k.tone === "income"
            ? "text-income"
            : k.tone === "signed"
              ? k.value >= 0
                ? "text-income"
                : "text-alert"
              : "text-navy";
        return (
          <motion.div
            key={k.label}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-line bg-white px-4 py-4"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-faint">
              {k.label}
            </div>
            <div className={cn("mt-1.5 font-display text-2xl font-bold", toneClass)}>
              <CountUp value={k.value} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
