import { generateText, stepCountIs } from "ai";
import { geminiModel, DEFAULT_MODEL } from "@/lib/ai/gemini";
import { demoAgencyId } from "@/lib/auth";
import { langfuse } from "@/lib/observability/langfuse";
import { buildTools } from "@/lib/agent/tools";

const SYSTEM = `You are Domus, an assistant for a Polish real-estate agency.
Answer questions about the agency's live catalog by CALLING TOOLS — never invent
listings, prices, addresses, or coordinates. Prices are in Polish złoty (PLN, zł).

- To find properties, call search_listings (paraphrase the buyer's need as a
  neutral English brief; pass filters/location when given).
- To value a specific listing, call value_property with its id.
- To plan viewings, geocode_place the start location if it's text, then call
  plan_viewing_route with the listing ids.
- If a tool returns nothing, say so plainly — do not fabricate alternatives.

Keep replies concise and reference concrete results (address + price).`;

export interface AgentResult {
  text: string;
  steps: number;
  toolCalls: string[];
}

/** Run the tool-calling assistant over one user message, grounded in the demo
 *  catalog. Traced in Langfuse when keys are present. */
export async function runAgent(message: string): Promise<AgentResult> {
  const agencyId = await demoAgencyId();
  if (!agencyId) throw new Error("no catalog agency");

  const lf = langfuse();
  const trace = lf?.trace({ name: "agent", input: message });

  try {
    const result = await generateText({
      model: geminiModel(),
      system: SYSTEM,
      prompt: message,
      tools: buildTools(agencyId),
      stopWhen: stepCountIs(6),
    });

    const toolCalls = result.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName));
    trace?.update({
      output: result.text,
      metadata: { model: DEFAULT_MODEL, steps: result.steps.length, toolCalls },
    });
    await lf?.flushAsync();

    return { text: result.text, steps: result.steps.length, toolCalls };
  } catch (err) {
    trace?.update({ output: `ERROR: ${(err as Error).message}` });
    await lf?.flushAsync();
    throw err;
  }
}
