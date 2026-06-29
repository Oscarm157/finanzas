// CLI del tablero de Código. Fuente de verdad: Neon (mismas tablas que la app).
// Pensado para que Claude entre periódicamente a ver pendientes y dejar notas/preguntas.
//
// Uso (desde /root/finanzas):
//   node --env-file=.env.local scripts/kanban.mjs <comando>
//   o con el atajo:  npm run kanban -- <comando>
//
// Comandos:
//   board [--project NOMBRE]          Ver columnas con sus cards
//   projects                          Listar proyectos con cards
//   card <id>                         Ver una card completa + su hilo de notas
//   add --project P --title "T" [--spec "..."] [--priority low|med|high] [--repo R] [--branch B]
//   note <cardId> "texto" [--author claude|oscar]   Agregar nota (default: claude)
//   move <cardId> <backlog|in_progress|blocked|done>
//   set <cardId> [--title ..] [--project ..] [--spec ..] [--priority ..] [--repo ..] [--branch ..] [--pr ..]
//
// El owner se resuelve por OWNER_EMAIL (env) o, si no, el primer usuario de la tabla.

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const STATUSES = ["backlog", "in_progress", "blocked", "done"];
const STATUS_LABEL = {
  backlog: "Backlog",
  in_progress: "En curso",
  blocked: "Bloqueado",
  done: "Hecho",
};
const PRIORITIES = ["low", "med", "high"];

function die(msg) {
  console.error("Error: " + msg);
  process.exit(1);
}

// Parsea flags --clave valor de un arreglo de args. Devuelve { flags, rest }.
function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      rest.push(a);
    }
  }
  return { flags, rest };
}

async function resolveOwnerId() {
  const email = process.env.OWNER_EMAIL;
  if (email) {
    const rows = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (!rows[0]) die(`No hay usuario con OWNER_EMAIL=${email}`);
    return rows[0].id;
  }
  const rows = await sql`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`;
  if (!rows[0]) die("No hay usuarios en la DB.");
  return rows[0].id;
}

function shortId(id) {
  return id.slice(0, 8);
}

function fmtCard(c) {
  const pr = c.priority === "high" ? "!!" : c.priority === "med" ? "!" : "·";
  const labels = (c.labels && c.labels.length ? ` [${c.labels.join(", ")}]` : "");
  return `  ${pr} ${shortId(c.id)}  ${c.title}${labels}`;
}

async function cmdBoard(flags) {
  const owner = await resolveOwnerId();
  const project = typeof flags.project === "string" ? flags.project : null;
  const cards = project
    ? await sql`SELECT * FROM code_cards WHERE owner_id = ${owner} AND project = ${project} ORDER BY position ASC, created_at ASC`
    : await sql`SELECT * FROM code_cards WHERE owner_id = ${owner} ORDER BY position ASC, created_at ASC`;

  console.log(project ? `Tablero de Código · ${project}` : "Tablero de Código (todos los proyectos)");
  for (const status of STATUSES) {
    const col = cards.filter((c) => c.status === status);
    console.log(`\n${STATUS_LABEL[status]} (${col.length})`);
    if (col.length === 0) console.log("  —");
    for (const c of col) {
      const proj = project ? "" : `  (${c.project})`;
      console.log(fmtCard(c) + proj);
    }
  }
  console.log("");
}

async function cmdProjects() {
  const owner = await resolveOwnerId();
  const rows = await sql`
    SELECT project, count(*)::int AS n,
           count(*) FILTER (WHERE status <> 'done')::int AS open
    FROM code_cards WHERE owner_id = ${owner}
    GROUP BY project ORDER BY project ASC`;
  if (rows.length === 0) return console.log("Sin proyectos todavía.");
  console.log("Proyectos:");
  for (const r of rows) console.log(`  ${r.project}: ${r.open} abiertas / ${r.n} totales`);
}

async function findCard(owner, idPrefix) {
  const rows = await sql`
    SELECT * FROM code_cards
    WHERE owner_id = ${owner} AND id::text LIKE ${idPrefix + "%"}
    LIMIT 2`;
  if (rows.length === 0) die(`No se encontró card que empiece con ${idPrefix}`);
  if (rows.length > 1) die(`Ambiguo: hay varias cards que empiezan con ${idPrefix}`);
  return rows[0];
}

async function cmdCard(rest) {
  const owner = await resolveOwnerId();
  const idPrefix = rest[0];
  if (!idPrefix) die("Falta el id de la card.");
  const c = await findCard(owner, idPrefix);
  console.log(`${c.title}`);
  console.log(`id: ${c.id}`);
  console.log(`proyecto: ${c.project}   estado: ${STATUS_LABEL[c.status]}   prioridad: ${c.priority}`);
  if (c.labels && c.labels.length) console.log(`etiquetas: ${c.labels.join(", ")}`);
  if (c.repo) console.log(`repo: ${c.repo}${c.branch ? `  rama: ${c.branch}` : ""}`);
  if (c.pr_url) console.log(`PR: ${c.pr_url}`);
  console.log(`\nspec:\n${c.spec || "(sin spec)"}`);

  const notes = await sql`
    SELECT * FROM code_card_notes
    WHERE card_id = ${c.id} ORDER BY created_at ASC`;
  console.log(`\nnotas (${notes.length}):`);
  if (notes.length === 0) console.log("  —");
  for (const n of notes) {
    const when = n.created_at ? new Date(n.created_at).toISOString().slice(0, 16).replace("T", " ") : "";
    console.log(`  [${n.author} · ${when}] ${n.body}`);
  }
}

async function cmdAdd(flags) {
  const owner = await resolveOwnerId();
  const project = typeof flags.project === "string" ? flags.project : null;
  const title = typeof flags.title === "string" ? flags.title : null;
  if (!project) die("Falta --project");
  if (!title) die("Falta --title");
  const priority = typeof flags.priority === "string" ? flags.priority : "med";
  if (!PRIORITIES.includes(priority)) die(`Prioridad inválida: ${priority}`);
  const spec = typeof flags.spec === "string" ? flags.spec : null;
  const repo = typeof flags.repo === "string" ? flags.repo : null;
  const branch = typeof flags.branch === "string" ? flags.branch : null;

  const rows = await sql`
    INSERT INTO code_cards (owner_id, project, title, spec, priority, repo, branch)
    VALUES (${owner}, ${project}, ${title}, ${spec}, ${priority}, ${repo}, ${branch})
    RETURNING id`;
  console.log(`Card creada: ${shortId(rows[0].id)}  (${rows[0].id})`);
}

async function cmdNote(rest, flags) {
  const owner = await resolveOwnerId();
  const idPrefix = rest[0];
  const body = rest[1];
  if (!idPrefix || !body) die('Uso: note <cardId> "texto" [--author claude|oscar]');
  const author = typeof flags.author === "string" ? flags.author : "claude";
  if (author !== "claude" && author !== "oscar") die("author debe ser claude u oscar");
  const c = await findCard(owner, idPrefix);
  await sql`
    INSERT INTO code_card_notes (owner_id, card_id, author, body)
    VALUES (${owner}, ${c.id}, ${author}, ${body})`;
  console.log(`Nota agregada a ${shortId(c.id)} (${c.title}).`);
}

async function cmdMove(rest) {
  const owner = await resolveOwnerId();
  const idPrefix = rest[0];
  const status = rest[1];
  if (!idPrefix || !status) die("Uso: move <cardId> <backlog|in_progress|blocked|done>");
  if (!STATUSES.includes(status)) die(`Estado inválido: ${status}`);
  const c = await findCard(owner, idPrefix);
  await sql`
    UPDATE code_cards SET status = ${status}, updated_at = now()
    WHERE id = ${c.id} AND owner_id = ${owner}`;
  console.log(`${shortId(c.id)} (${c.title}) → ${STATUS_LABEL[status]}`);
}

// Cada campo settable con su propia query (allowlist por construcción, valores parametrizados).
const SETTERS = {
  title: (id, owner, v) => sql`UPDATE code_cards SET title = ${v}, updated_at = now() WHERE id = ${id} AND owner_id = ${owner}`,
  project: (id, owner, v) => sql`UPDATE code_cards SET project = ${v}, updated_at = now() WHERE id = ${id} AND owner_id = ${owner}`,
  spec: (id, owner, v) => sql`UPDATE code_cards SET spec = ${v}, updated_at = now() WHERE id = ${id} AND owner_id = ${owner}`,
  priority: (id, owner, v) => sql`UPDATE code_cards SET priority = ${v}, updated_at = now() WHERE id = ${id} AND owner_id = ${owner}`,
  repo: (id, owner, v) => sql`UPDATE code_cards SET repo = ${v}, updated_at = now() WHERE id = ${id} AND owner_id = ${owner}`,
  branch: (id, owner, v) => sql`UPDATE code_cards SET branch = ${v}, updated_at = now() WHERE id = ${id} AND owner_id = ${owner}`,
  pr: (id, owner, v) => sql`UPDATE code_cards SET pr_url = ${v}, updated_at = now() WHERE id = ${id} AND owner_id = ${owner}`,
};

async function cmdSet(rest, flags) {
  const owner = await resolveOwnerId();
  const idPrefix = rest[0];
  if (!idPrefix) die("Falta el id de la card.");
  const c = await findCard(owner, idPrefix);

  const updates = Object.keys(SETTERS).filter((k) => typeof flags[k] === "string");
  if (updates.length === 0) die("Nada que cambiar. Usa --title, --project, --spec, --priority, --repo, --branch, --pr");
  if (typeof flags.priority === "string" && !PRIORITIES.includes(flags.priority)) die(`Prioridad inválida: ${flags.priority}`);

  for (const k of updates) await SETTERS[k](c.id, owner, flags[k]);
  console.log(`${shortId(c.id)} actualizada: ${updates.join(", ")}`);
}

async function main() {
  if (!process.env.DATABASE_URL) die("Falta DATABASE_URL (corre con node --env-file=.env.local).");
  const [cmd, ...args] = process.argv.slice(2);
  const { flags, rest } = parseFlags(args);

  switch (cmd) {
    case "board": return cmdBoard(flags);
    case "projects": return cmdProjects();
    case "card": return cmdCard(rest);
    case "add": return cmdAdd(flags);
    case "note": return cmdNote(rest, flags);
    case "move": return cmdMove(rest);
    case "set": return cmdSet(rest, flags);
    default:
      console.log("Comandos: board | projects | card <id> | add | note <id> \"...\" | move <id> <estado> | set <id> --campo valor");
      console.log('Ej: npm run kanban -- board --project finanzas');
  }
}

main().catch((e) => die(e.message || String(e)));
