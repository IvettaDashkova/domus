import { NextResponse } from "next/server";

// LLM + embeds + DB: dynamic, Node, lazy init.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { enquiry } = (await req.json()) as { enquiry?: string };
    const text = (enquiry ?? "").trim();
    if (!text) return NextResponse.json({ error: "empty enquiry" }, { status: 400 });

    const { geminiApiKey } = await import("@/lib/ai/gemini");
    if (!geminiApiKey()) {
      return NextResponse.json(
        { error: "Gemini API key not set (GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)" },
        { status: 503 },
      );
    }

    const { getAdminDb } = await import("@/lib/db/client");
    const { triageLead } = await import("@/lib/leads/triage");

    const admin = getAdminDb();
    const [agency] = await admin<{ id: string }[]>`
      select id from agencies order by created_at limit 1`;
    if (!agency) return NextResponse.json({ error: "no agency" }, { status: 404 });

    const out = await triageLead(agency.id, text);
    return NextResponse.json({
      brief: out.brief,
      leadId: out.leadId,
      location: out.location,
      count: out.results.length,
      results: out.results,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
