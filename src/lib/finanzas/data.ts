import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, statements, transactions } from "@/lib/schema";

const n = (v: string | null) => (v ? parseFloat(v) : 0);

export type TxRow = {
  id: string;
  date: string;
  description: string;
  counterparty: string | null;
  rawDetail: string | null;
  amount: number;
  direction: "in" | "out";
  kind: string;
  isInternal: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryExcluded: boolean;
  currency: string;
};

export async function listStatements(ownerId: string) {
  const rows = await db
    .select()
    .from(statements)
    .where(eq(statements.ownerId, ownerId))
    .orderBy(desc(statements.periodEnd));
  return rows.map((s) => ({
    id: s.id,
    periodStart: s.periodStart,
    periodEnd: s.periodEnd,
    status: s.status,
    depositos: n(s.depositos),
    gastos: n(s.gastos),
    saldoFinal: n(s.saldoFinal),
  }));
}

export async function getStatementTransactions(
  ownerId: string,
  statementId: string,
): Promise<TxRow[]> {
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      counterparty: transactions.counterparty,
      rawDetail: transactions.rawDetail,
      amount: transactions.amount,
      direction: transactions.direction,
      kind: transactions.kind,
      isInternal: transactions.isInternal,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryExcluded: categories.excludeFromFlow,
      currency: transactions.currency,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(eq(transactions.ownerId, ownerId), eq(transactions.statementId, statementId)),
    )
    .orderBy(desc(transactions.date));
  return rows.map((r) => ({ ...r, amount: n(r.amount), categoryExcluded: !!r.categoryExcluded }));
}

// Movimientos de flujo (sin cajitas internas) para categorizar manualmente.
export async function getTransactions(ownerId: string): Promise<TxRow[]> {
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      counterparty: transactions.counterparty,
      rawDetail: transactions.rawDetail,
      amount: transactions.amount,
      direction: transactions.direction,
      kind: transactions.kind,
      isInternal: transactions.isInternal,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryExcluded: categories.excludeFromFlow,
      currency: transactions.currency,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.ownerId, ownerId), eq(transactions.isInternal, false)))
    .orderBy(desc(transactions.date));
  return rows.map((r) => ({ ...r, amount: n(r.amount), categoryExcluded: !!r.categoryExcluded }));
}

export async function getStatement(ownerId: string, statementId: string) {
  const rows = await db
    .select()
    .from(statements)
    .where(and(eq(statements.ownerId, ownerId), eq(statements.id, statementId)));
  return rows[0] ?? null;
}

export async function listCategories(ownerId: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.ownerId, ownerId))
    .orderBy(categories.kind, categories.name);
}

// Categorías con el número de movimientos que tienen (para la página de gestión).
export async function listCategoriesWithCounts(ownerId: string) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      color: categories.color,
      parentId: categories.parentId,
      excludeFromFlow: categories.excludeFromFlow,
      count: sql<number>`count(${transactions.id})::int`,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)::float`,
    })
    .from(categories)
    .leftJoin(transactions, eq(transactions.categoryId, categories.id))
    .where(eq(categories.ownerId, ownerId))
    .groupBy(categories.id)
    .orderBy(categories.kind, categories.name);
}

// Datos del dashboard para un statement (o el más reciente listo/en revisión).
export async function getDashboard(ownerId: string, statementId?: string) {
  let stmt;
  if (statementId) {
    stmt = await getStatement(ownerId, statementId);
  } else {
    const rows = await db
      .select()
      .from(statements)
      .where(eq(statements.ownerId, ownerId))
      .orderBy(desc(statements.periodEnd))
      .limit(1);
    stmt = rows[0] ?? null;
  }
  if (!stmt) return null;

  const txs = await getStatementTransactions(ownerId, stmt.id);
  const flow = txs.filter((t) => !t.isInternal && !t.categoryExcluded);

  const ingresos = flow.filter((t) => t.direction === "in").reduce((a, t) => a + t.amount, 0);
  const gastos = flow.filter((t) => t.direction === "out").reduce((a, t) => a + t.amount, 0);

  // Categorías del usuario para hacer rollup de subcategorías a su padre.
  const cats = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      name: categories.name,
      color: categories.color,
    })
    .from(categories)
    .where(eq(categories.ownerId, ownerId));
  const catMap = new Map(cats.map((c) => [c.id, c]));

  type Child = { name: string; color: string; total: number };
  type Parent = { name: string; color: string; total: number; children: Map<string, Child> };

  // Agrupa por categoría de nivel superior; las subcategorías quedan como `children`
  // (incluye un bucket "Directo" para lo asignado al padre mismo).
  function rollup(list: TxRow[], denom: number) {
    const parents = new Map<string, Parent>();
    for (const t of list) {
      const c = t.categoryId ? catMap.get(t.categoryId) : undefined;
      const top = c?.parentId ? catMap.get(c.parentId) : c;
      const topId = top?.id ?? "none";
      const p =
        parents.get(topId) ??
        {
          name: top?.name ?? "Sin categoría",
          color: top?.color ?? "#cbd2dd",
          total: 0,
          children: new Map<string, Child>(),
        };
      p.total += t.amount;
      if (c?.parentId) {
        const ch = p.children.get(c.id) ?? { name: c.name, color: c.color, total: 0 };
        ch.total += t.amount;
        p.children.set(c.id, ch);
      } else if (c) {
        const ch = p.children.get("_direct") ?? { name: "Directo", color: p.color, total: 0 };
        ch.total += t.amount;
        p.children.set("_direct", ch);
      }
      parents.set(topId, p);
    }
    return [...parents.values()]
      .sort((a, b) => b.total - a.total)
      .map((p) => {
        const children = [...p.children.values()]
          .filter((c) => c.total > 0)
          .sort((a, b) => b.total - a.total)
          .map((c) => ({
            name: c.name,
            color: c.color,
            total: c.total,
            pct: p.total ? Math.round((c.total / p.total) * 100) : 0,
          }));
        const hasSubs = children.some((c) => c.name !== "Directo");
        return {
          name: p.name,
          color: p.color,
          total: p.total,
          pct: denom ? Math.round((p.total / denom) * 100) : 0,
          children: hasSubs ? children : [],
        };
      });
  }

  const spendByCategory = rollup(flow.filter((t) => t.direction === "out"), gastos);
  const incomeByCategory = rollup(flow.filter((t) => t.direction === "in"), ingresos);

  // Cashflow por día (entradas vs salidas, sin internos).
  const byDay = new Map<string, { date: string; in: number; out: number }>();
  for (const t of flow) {
    const cur = byDay.get(t.date) ?? { date: t.date, in: 0, out: 0 };
    if (t.direction === "in") cur.in += t.amount;
    else cur.out += t.amount;
    byDay.set(t.date, cur);
  }
  const cashflow = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));

  const internos = txs.filter((t) => t.isInternal).length;

  return {
    statement: {
      id: stmt.id,
      periodStart: stmt.periodStart,
      periodEnd: stmt.periodEnd,
      status: stmt.status,
      saldoInicial: n(stmt.saldoInicial),
      saldoFinal: n(stmt.saldoFinal),
      comisiones: n(stmt.comisiones),
    },
    kpis: { ingresos, gastos, balance: ingresos - gastos, saldoFinal: n(stmt.saldoFinal) },
    spendByCategory,
    incomeByCategory,
    cashflow,
    recent: flow.slice(0, 12),
    counts: { total: txs.length, internos, flujo: flow.length },
  };
}
