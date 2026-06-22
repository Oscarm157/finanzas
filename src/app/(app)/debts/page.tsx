import { requireUser } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

export default async function DebtsPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Deudas"
      hint="Préstamos que debes y que te deben, con saldo y fecha. Se llevan aparte de los movimientos del banco."
    />
  );
}
