import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpensiveButton } from "./expensive-button";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
        <p className="text-sm text-muted-foreground">Tu panel de trabajo.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
            <CardDescription>Tu lista personal con alta y baja.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/items">Abrir items</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tarea cara</CardTitle>
            <CardDescription>
              Endpoint protegido con sesión y Vercel BotID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensiveButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
