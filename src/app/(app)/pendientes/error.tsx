"use client";

import { ErrorState } from "@/components/states";

export default function PendientesError({ reset }: { reset: () => void }) {
  return (
    <ErrorState hint="No se pudieron cargar tus pendientes. Intenta de nuevo." reset={reset} />
  );
}
