"use client";

import { useState } from "react";
import { BotIdClient } from "botid/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const protectedRoutes = [{ path: "/api/expensive", method: "POST" }];

export function ExpensiveButton() {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/expensive", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo completar la operación.");
        return;
      }
      toast.success(`Listo: ${data.result}`);
    } catch {
      toast.error("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BotIdClient protect={protectedRoutes} />
      <Button onClick={run} disabled={loading}>
        {loading ? "Procesando..." : "Ejecutar tarea cara"}
      </Button>
    </>
  );
}
