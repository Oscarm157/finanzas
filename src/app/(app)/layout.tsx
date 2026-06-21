import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/session";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireUser();
  if (me.mustChangePassword) redirect("/change-password");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-sm font-semibold">
            Starter
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{me.name}</span>
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">
                Salir
              </Button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
