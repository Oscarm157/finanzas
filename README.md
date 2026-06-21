# Starter (plomería design-agnóstico)

Base para arrancar proyectos rápido sin recablear lo de siempre. Trae auth, base de datos,
subida de archivos, correo, validación, seguridad, monitoreo, estados y CI ya cableados.
El diseño NO viene incluido a propósito: shadcn neutro, lo vistes por cliente.

## Stack
Next 16 (App Router) · React 19 · Tailwind v4 · TypeScript · Drizzle + Neon · Zod ·
Vercel Blob · Resend · Sentry · Vercel BotID · Playwright.

## Arranque
1. `cp .env.example .env.local` y rellena `DATABASE_URL` y `AUTH_SECRET` (`openssl rand -base64 32`).
2. `npm install`
3. `npm run db:generate && npm run db:migrate` (crea las tablas en tu Neon).
4. `npm run db:seed` (crea un admin; imprime la contraseña temporal).
5. `npm run dev` y entra a `/login`.

## Qué incluye
- **Auth**: sesión por cookie firmada (PBKDF2 + HMAC), `requireUser`/`requireRole`, login /
  logout / cambio de contraseña. `src/lib/auth.ts`, `src/lib/session.ts`.
- **Datos**: Drizzle + Neon, tabla `users` + `items` de ejemplo, migraciones y seed.
- **Seguridad por default**: security headers (`next.config.ts`), validación Zod de inputs
  (`src/lib/validate.ts`), guards en cada action/route, BotID en endpoints caros.
- **Estados por default**: `Loading` / `Empty` / `ErrorState` (`src/components/states.tsx`) y una
  página CRUD de ejemplo que los usa.
- **Infra**: Sentry (pega el DSN en `NEXT_PUBLIC_SENTRY_DSN`), CI en GitHub Actions, Playwright
  smoke que captura el login.

## Al arrancar un proyecto real
- Renombra/borra la tabla `items` y su página de ejemplo.
- Pon tu diseño encima (tokens, shadcn theme, layout). Aquí no hay estética que respetar.
- Para subir source maps a Sentry, envuelve `next.config.ts` con `withSentryConfig` y agrega
  `SENTRY_AUTH_TOKEN`.

Las reglas de trabajo viven en `CLAUDE.md`.
