import { requireUser } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

export default async function CategoriesPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Categorías"
      hint="Edita tus categorías, sus colores y las reglas que aprende el importador. Hoy se ajustan movimiento por movimiento al revisar un estado de cuenta."
    />
  );
}
