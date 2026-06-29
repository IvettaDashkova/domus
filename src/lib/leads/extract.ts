import { generateObject } from "ai";
import { z } from "zod";
import { geminiModel, DEFAULT_MODEL } from "@/lib/ai/gemini";
import { langfuse } from "@/lib/observability/langfuse";

/** Structured search brief extracted from a free-text buyer enquiry. */
export const BriefSchema = z.object({
  propertyType: z
    .enum(["detached house", "semi-detached house", "terraced house", "flat", "any"])
    .describe("Normalized property type, or 'any' if unspecified."),
  minPrice: z.number().nullable().describe("Minimum budget in GBP, or null."),
  maxPrice: z.number().nullable().describe("Maximum budget in GBP, or null."),
  bedrooms: z.number().int().nullable().describe("Desired bedroom count, or null."),
  location: z
    .string()
    .nullable()
    .describe("Town/area/postcode the buyer mentioned, or null."),
  mustHaves: z.array(z.string()).describe("Desired features, e.g. ['garden','parking']."),
  excludes: z
    .array(z.string())
    .describe("Things to exclude, from negations e.g. 'not a flat' -> ['flat']."),
  semanticBrief: z
    .string()
    .describe("A clean one-sentence paraphrase of what the buyer wants, for embedding."),
});

export type Brief = z.infer<typeof BriefSchema>;

const SYSTEM = `You triage real-estate buyer enquiries for letting agents.
Extract a structured search brief from the enquiry.
- Parse budgets: "under £300k" -> maxPrice 300000; "£200-250k" -> min 200000, max 250000.
- "3-bed" / "three bedroom" -> bedrooms 3.
- Map property type to one of the allowed labels, else "any".
- Negations ("not a flat", "no new builds") go into excludes (["flat"], ["new build"]).
- mustHaves are positive features (garden, parking, garage, balcony).
- location is the place/area/postcode text only (no county boilerplate).
- semanticBrief: a concise neutral paraphrase, no negations, for semantic search.
Use null when a field is not stated. Do not invent values.`;

/** Extract a structured brief via Gemini, traced in Langfuse (no-op without keys). */
export async function extractBrief(enquiry: string): Promise<Brief> {
  const lf = langfuse();
  const trace = lf?.trace({ name: "lead-triage", input: enquiry });
  const gen = trace?.generation({
    name: "extract-brief",
    model: DEFAULT_MODEL,
    input: enquiry,
  });

  try {
    const { object, usage } = await generateObject({
      model: geminiModel(),
      schema: BriefSchema,
      system: SYSTEM,
      prompt: enquiry,
    });
    gen?.end({ output: object, usage: { input: usage?.inputTokens, output: usage?.outputTokens } });
    trace?.update({ output: object });
    await lf?.flushAsync();
    return object;
  } catch (err) {
    gen?.end({ level: "ERROR", statusMessage: (err as Error).message });
    await lf?.flushAsync();
    throw err;
  }
}
