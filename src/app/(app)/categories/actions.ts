"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { categories } from "@/lib/schema";

const createSchema = z.object({
  name: z.string().trim().min(1, "Ponle nombre.").max(40, "Máximo 40 caracteres."),
  kind: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido."),
  exclude: z.boolean(),
  parentId: z.string().uuid().optional(),
});

function revalidate() {
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function createCategory(
  formData: FormData,
): Promise<{ error: string } | void> {
  const me = await requireUser();
  const parentRaw = formData.get("parentId");
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    color: formData.get("color"),
    exclude: formData.get("exclude") === "on",
    parentId: parentRaw ? String(parentRaw) : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let kind = parsed.data.kind;
  let parentId: string | null = null;
  if (parsed.data.parentId) {
    const [parent] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, parsed.data.parentId), eq(categories.ownerId, me.id)));
    if (!parent) return { error: "Categoría padre inválida." };
    if (parent.parentId) return { error: "Solo se permite un nivel de subcategorías." };
    parentId = parent.id;
    kind = parent.kind; // la subcategoría hereda el tipo del padre
  }

  const dup = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.ownerId, me.id), eq(categories.name, parsed.data.name)));
  if (dup[0]) return { error: "Ya tienes una categoría con ese nombre." };

  await db.insert(categories).values({
    ownerId: me.id,
    name: parsed.data.name,
    kind,
    color: parsed.data.color,
    icon: "circle",
    excludeFromFlow: parsed.data.exclude,
    parentId,
  });

  revalidate();
}

const uuid = z.string().uuid();

// Mover una categoría bajo un padre (o sacarla a raíz con parentId=null).
export async function updateCategoryParent(id: string, parentId: string | null) {
  const me = await requireUser();
  if (!uuid.safeParse(id).success) return { error: "Categoría inválida." };

  const [cat] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.ownerId, me.id)));
  if (!cat) return { error: "Categoría inválida." };

  let newParent: string | null = null;
  if (parentId) {
    if (parentId === id) return { error: "No puede ser su propio padre." };
    // La categoría a mover no debe tener subcategorías (se permite un solo nivel).
    const children = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.parentId, id), eq(categories.ownerId, me.id)));
    if (children[0]) return { error: "Esta categoría ya tiene subcategorías; no puede ser subcategoría." };

    const [parent] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, parentId), eq(categories.ownerId, me.id)));
    if (!parent) return { error: "Categoría padre inválida." };
    if (parent.parentId) return { error: "Solo se permite un nivel de subcategorías." };
    if (parent.kind !== cat.kind) return { error: "El padre debe ser del mismo tipo (ingreso/gasto)." };
    newParent = parent.id;
  }

  await db
    .update(categories)
    .set({ parentId: newParent })
    .where(and(eq(categories.id, id), eq(categories.ownerId, me.id)));
  revalidate();
}

export async function deleteCategory(id: string) {
  const me = await requireUser();
  if (!uuid.safeParse(id).success) return;
  // Las subcategorías se borran en cascada; los movimientos quedan sin categoría (FK set null).
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.ownerId, me.id)));
  revalidate();
}
