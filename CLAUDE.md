@AGENTS.md

# Starter de plomería (design-agnóstico)

Este repo es el MOTOR, no la pintura. Trae la plomería que se repite en todo proyecto;
el diseño es bespoke por cliente (no hay sistema de diseño aquí, shadcn neutro a propósito).

## Reglas (heredan del CLAUDE.md global de Oscar)
- Seguridad de base: toda server action / route handler abre con `requireUser()`/`requireRole()`.
  Validar todo input con Zod (`src/lib/validate.ts`). Nunca confiar en IDs del cliente: cargarlos de DB.
- Estados por default: cada vista nace con loading / empty / error (`src/components/states.tsx`).
- Persistir estado del usuario; nada efímero que se pierda al recargar.
- Secrets solo en `.env.local`. Headers de seguridad ya van en `next.config.ts`.
- Endpoints caros / de IA: proteger con Vercel BotID (ver `src/app/api/expensive`).
- Git: commits chicos por feature, push frecuente; no saltar de tarea sin commitear.

## Diseño (bespoke por proyecto)
- El starter NO trae estética. Al iniciar la UI, llena `DESIGN.md` desde el reference lock de Refero
  y el agente lo lee para ser consistente. No copies DESIGN.md de marcas ajenas tal cual.

## Qué hay
- Auth por cookie firmada (PBKDF2 + HMAC) en `src/lib/auth.ts` + `src/lib/session.ts`.
- DB: Drizzle + Neon (`src/lib/db.ts`, `src/lib/schema.ts`), migraciones drizzle-kit, seed.
- Blob (`src/lib/blob.ts`), Resend (`src/lib/email.ts`), env validado (`src/lib/env.ts`).
- Sentry guardado por DSN, CI (tsc+lint+build), Playwright smoke con screenshot.
- Tabla `items` + página de ejemplo: CRUD con los tres estados. Bórrala al arrancar de verdad.

## Tablero de Código (para agentes)
Hay un kanban de desarrollo multi-repo en `/codigo` (DB Neon, tablas `code_cards` + `code_card_notes`).
Es donde Oscar y Claude coordinan tareas de código y se dejan notas/preguntas que se leen después.

Al entrar a una tarea de código, **revisa el tablero primero** y deja tus dudas ahí en vez de perderlas:
```
npm run kanban -- board                 # ver columnas y cards de todos los repos
npm run kanban -- board --project X      # filtrar por repo
npm run kanban -- card <id>              # spec + hilo de notas de una card
npm run kanban -- note <id> "pregunta"  # dejar una nota (queda como author=claude)
npm run kanban -- move <id> in_progress # mover de columna (backlog|in_progress|blocked|done)
npm run kanban -- add --project X --title "..." [--spec "..." --priority high]
```
Las mutaciones desde la web pasan por `requireUser()`; el CLI resuelve el owner por `OWNER_EMAIL`
(o el primer usuario) y se corre local con `.env.local` ya cargado por el script `kanban`.
