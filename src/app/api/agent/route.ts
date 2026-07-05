import { NextResponse } from "next/server";
import { parseBody, agentBody } from "@/lib/api/validate";

// LLM + tools (DB/embeds/OSRM): dynamic, Node, lazy init.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, agentBody);
    if ("response" in parsed) return parsed.response;

    const { geminiApiKey } = await import("@/lib/ai/gemini");
    if (!geminiApiKey()) {
      return NextResponse.json(
        { error: "Gemini API key not set (GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)" },
        { status: 503 },
      );
    }

    const { runAgent } = await import("@/lib/agent/run");
    const result = await runAgent(parsed.data.message);
    return NextResponse.json(result);
  } catch (err) {
    // Log server-side; don't leak model/DB/OSRM internals to the client.
    console.error("agent failed", err);
    return NextResponse.json({ error: "agent failed" }, { status: 500 });
  }
}
