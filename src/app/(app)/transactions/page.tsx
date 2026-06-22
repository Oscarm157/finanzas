import { requireUser } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

export default async function TransactionsPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Movimientos"
      hint="Aquí verás todos tus movimientos de Nu juntos, con filtros por categoría, periodo y monto. Por ahora consúltalos dentro de cada estado de cuenta importado."
    />
  );
}
