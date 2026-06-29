import type { ReactNode } from "react";

/**
 * Lienzo dark a sangre completa para los módulos nuevos (hub, Pendientes, Código).
 * Cancela el padding del layout claro para llenar el área de contenido.
 * El wrapper `.dark` activa los tokens --h-* definidos en globals.css.
 */
export function DarkShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="dark -mx-4 -my-6 min-h-[calc(100dvh-3rem)] sm:-mx-6 lg:-mx-12 lg:-my-10"
      style={{ background: "var(--h-canvas)", color: "var(--h-text)" }}
    >
      <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </div>
    </div>
  );
}
