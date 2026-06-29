"use client";

import { ErrorState } from "@/components/states";

export default function CodigoError({ reset }: { reset: () => void }) {
  return (
    <ErrorState hint="No se pudo cargar el tablero de Código. Intenta de nuevo." reset={reset} />
  );
}
