import { Fragment } from "react";

export type CatOpt = {
  id: string;
  name: string;
  kind: "income" | "expense";
  parentId: string | null;
};

// Renderiza las <option> de un <select> de categorías: separadas por Gastos / Ingresos,
// con las subcategorías indentadas bajo su categoría padre. Quien lo use agrega sus
// propias opciones de encabezado (ej. "Sin categoría").
export function categoryOptionNodes(cats: CatOpt[]) {
  const byName = (a: CatOpt, b: CatOpt) => a.name.localeCompare(b.name);
  const roots = (k: "income" | "expense") =>
    cats.filter((c) => c.kind === k && !c.parentId).sort(byName);
  const subs = (pid: string) =>
    cats.filter((c) => c.parentId === pid).sort(byName);

  const section = (label: string, parents: CatOpt[]) =>
    parents.length === 0 ? null : (
      <Fragment key={label}>
        <option disabled>{`── ${label} ──`}</option>
        {parents.flatMap((p) => [
          <option key={p.id} value={p.id}>
            {p.name}
          </option>,
          ...subs(p.id).map((s) => (
            <option key={s.id} value={s.id}>
              {`  — ${s.name}`}
            </option>
          )),
        ])}
      </Fragment>
    );

  return [section("Gastos", roots("expense")), section("Ingresos", roots("income"))];
}
