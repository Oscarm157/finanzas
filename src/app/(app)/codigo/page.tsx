import { requireUser } from "@/lib/session";
import { listCards, listProjects } from "@/lib/code-board/data";
import { DarkShell } from "@/components/DarkShell";
import { CodeBoard } from "@/components/code-board/CodeBoard";

export const dynamic = "force-dynamic";

export default async function CodigoPage() {
  const me = await requireUser();
  const [cards, projects] = await Promise.all([listCards(me.id), listProjects(me.id)]);

  return (
    <DarkShell>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--h-text)]">
          Código
        </h1>
        <p className="mt-1 text-sm text-[var(--h-text-secondary)]">
          Tablero de desarrollo de todos tus repos. Claude entra a moverlo y dejar notas.
        </p>
      </header>
      <CodeBoard cards={cards} projects={projects} />
    </DarkShell>
  );
}
