"use client";

import { ErrorState } from "@/components/states";

export default function ReviewError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      hint="No se pudieron cargar los movimientos de este periodo. Intenta de nuevo."
      reset={reset}
    />
  );
}
