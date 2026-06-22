import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

// Haiku 4.5: clasificación de alto volumen y bajo costo. Salida estructurada
// (output_config.format) para garantizar JSON válido sin parsear a mano.
const MODEL = "claude-haiku-4-5";
const BATCH = 100;

export type CategoryOption = { name: string; kind: "income" | "expense" };

const ResultSchema = z.object({
  assignments: z.array(
    z.object({ index: z.number(), category: z.string() }),
  ),
});

// Devuelve un mapa descripción -> nombre de categoría. La descripción que no
// reciba sugerencia simplemente no aparece en el mapa (queda sin categoría).
export async function categorizeDescriptions(
  descriptions: string[],
  categories: CategoryOption[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (descriptions.length === 0 || !process.env.ANTHROPIC_API_KEY) return result;

  const client = new Anthropic();
  const catList = categories.map((c) => `- ${c.name} (${c.kind})`).join("\n");
  const valid = new Set(categories.map((c) => c.name));

  for (let i = 0; i < descriptions.length; i += BATCH) {
    const chunk = descriptions.slice(i, i + BATCH);
    const prompt = `Eres un clasificador de movimientos de una cuenta de banco en México (banco Nu).
Para cada movimiento, asigna EXACTAMENTE una categoría de la lista, usando su nombre tal cual.
Si ninguna aplica con claridad, usa "Sin categoría".

Categorías disponibles:
${catList}

Movimientos (responde con el índice de cada uno y su categoría):
${chunk.map((d, j) => `${j + 1}. ${d}`).join("\n")}`;

    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(ResultSchema) },
    });

    for (const a of res.parsed_output?.assignments ?? []) {
      const desc = chunk[a.index - 1];
      if (desc && valid.has(a.category)) result.set(desc, a.category);
    }
  }

  return result;
}
