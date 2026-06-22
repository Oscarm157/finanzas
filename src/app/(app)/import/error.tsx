"use client";

import { ErrorState } from "@/components/states";

export default function ImportError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      hint="No se pudo cargar esta pantalla de importación. Intenta de nuevo."
      reset={reset}
    />
  );
}
