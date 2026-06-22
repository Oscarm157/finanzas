"use client";

import { useTransition } from "react";
import { Check, Trash2 } from "lucide-react";

import { confirmStatement, deleteStatement } from "../actions";
import { Button } from "@/components/ui/button";

export function ReviewActions({ id }: { id: string }) {
  const [confirming, startConfirm] = useTransition();
  const [deleting, startDelete] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        disabled={deleting || confirming}
        onClick={() => {
          if (confirm("¿Eliminar este estado de cuenta y sus movimientos?")) {
            startDelete(() => deleteStatement(id));
          }
        }}
      >
        <Trash2 className="size-4" strokeWidth={1.8} />
        Eliminar
      </Button>
      <Button
        disabled={confirming || deleting}
        onClick={() => startConfirm(() => confirmStatement(id))}
      >
        <Check className="size-4" strokeWidth={2} />
        {confirming ? "Confirmando..." : "Confirmar"}
      </Button>
    </div>
  );
}
