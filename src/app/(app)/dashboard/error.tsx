"use client";

import { ErrorState } from "@/components/states";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      hint="No se pudo cargar el dashboard. Intenta de nuevo."
      reset={reset}
    />
  );
}
