import { requireUser } from "@/lib/session";
import { listTasks } from "@/lib/personal-tasks/data";
import { DarkShell } from "@/components/DarkShell";
import { PersonalBoard } from "@/components/personal-tasks/PersonalBoard";

export const dynamic = "force-dynamic";

export default async function PendientesPage() {
  const me = await requireUser();
  const tasks = await listTasks(me.id);

  return (
    <DarkShell>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--h-text)]">
          Pendientes
        </h1>
        <p className="mt-1 text-sm text-[var(--h-text-secondary)]">
          Tus pendientes personales, a la vista para no olvidarlos.
        </p>
      </header>
      <PersonalBoard tasks={tasks} />
    </DarkShell>
  );
}
