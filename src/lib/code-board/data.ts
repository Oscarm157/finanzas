import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  codeCards,
  codeCardNotes,
  type CodeCard,
  type CodeCardNote,
} from "@/lib/schema";

export async function listCards(
  ownerId: string,
  opts: { project?: string } = {},
): Promise<CodeCard[]> {
  const where = opts.project
    ? and(eq(codeCards.ownerId, ownerId), eq(codeCards.project, opts.project))
    : eq(codeCards.ownerId, ownerId);
  return db
    .select()
    .from(codeCards)
    .where(where)
    .orderBy(asc(codeCards.position), asc(codeCards.createdAt));
}

export async function getCard(
  ownerId: string,
  id: string,
): Promise<{ card: CodeCard; notes: CodeCardNote[] } | null> {
  const [card] = await db
    .select()
    .from(codeCards)
    .where(and(eq(codeCards.id, id), eq(codeCards.ownerId, ownerId)));
  if (!card) return null;
  const notes = await db
    .select()
    .from(codeCardNotes)
    .where(eq(codeCardNotes.cardId, id))
    .orderBy(asc(codeCardNotes.createdAt));
  return { card, notes };
}

/** Proyectos con al menos una card, para el filtro. */
export async function listProjects(ownerId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ project: codeCards.project })
    .from(codeCards)
    .where(eq(codeCards.ownerId, ownerId))
    .orderBy(asc(codeCards.project));
  return rows.map((r) => r.project);
}

/** Resumen para el hub: cuántas cards abiertas / en curso / bloqueadas. */
export async function getCodeSnapshot(ownerId: string): Promise<{
  inProgress: number;
  blocked: number;
  open: number;
}> {
  const [row] = await db
    .select({
      inProgress: sql<number>`count(*) filter (where ${codeCards.status} = 'in_progress')::int`,
      blocked: sql<number>`count(*) filter (where ${codeCards.status} = 'blocked')::int`,
      open: sql<number>`count(*) filter (where ${codeCards.status} <> 'done')::int`,
    })
    .from(codeCards)
    .where(eq(codeCards.ownerId, ownerId));
  return {
    inProgress: row?.inProgress ?? 0,
    blocked: row?.blocked ?? 0,
    open: row?.open ?? 0,
  };
}
