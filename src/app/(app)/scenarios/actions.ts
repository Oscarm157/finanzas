"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { scenarios, statements } from "@/lib/schema";

const adjSchema = z
  .array(
    z.object({
      key: z.string().max(64),
      included: z.boolean(),
      amount: z.number().min(0).max(1e12),
    }),
  )
  .max(300);

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Ponle nombre.").max(60),
  statementId: z.string().uuid(),
  adjustments: adjSchema,
});

export type SaveScenarioInput = z.infer<typeof saveSchema>;

export async function saveScenario(
  input: SaveScenarioInput,
): Promise<{ error: string } | { id: string }> {
  const me = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [st] = await db
    .select({ id: statements.id })
    .from(statements)
    .where(and(eq(statements.id, parsed.data.statementId), eq(statements.ownerId, me.id)));
  if (!st) return { error: "Mes inválido." };

  if (parsed.data.id) {
    await db
      .update(scenarios)
      .set({ name: parsed.data.name, adjustments: parsed.data.adjustments })
      .where(and(eq(scenarios.id, parsed.data.id), eq(scenarios.ownerId, me.id)));
    revalidatePath("/scenarios");
    return { id: parsed.data.id };
  }

  const [created] = await db
    .insert(scenarios)
    .values({
      ownerId: me.id,
      statementId: parsed.data.statementId,
      name: parsed.data.name,
      adjustments: parsed.data.adjustments,
    })
    .returning({ id: scenarios.id });
  revalidatePath("/scenarios");
  return { id: created.id };
}

export async function deleteScenario(id: string) {
  const me = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return;
  await db.delete(scenarios).where(and(eq(scenarios.id, id), eq(scenarios.ownerId, me.id)));
  revalidatePath("/scenarios");
}
