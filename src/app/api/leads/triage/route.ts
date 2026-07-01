import { NextResponse } from "next/server";
import { parseBody, triageBody } from "@/lib/api/validate";

// LLM + embeds + DB: dynamic, Node, lazy init.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, triageBody);
    if ("response" in parsed) return parsed.response;
    const text = parsed.data.enquiry.trim();

    const { geminiApiKey } = await import("@/lib/ai/gemini");
    if (!geminiApiKey()) {
      return NextResponse.json(
        { error: "Gemini API key not set (GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)" },
        { status: 503 },
      );
    }

    const { extractBrief } = await import("@/lib/leads/extract");
    const { matchFromBrief } = await import("@/lib/leads/triage");
    const { withTenant } = await import("@/lib/db/tenant");
    const { resolveSession, demoAgencyId } = await import("@/lib/auth");

    // Listings are the shared demo catalog; leads are private to the user.
    const matchAgency = await demoAgencyId();
    if (!matchAgency) return NextResponse.json({ error: "no catalog" }, { status: 404 });

    const brief = await extractBrief(text);
    const { location, results } = await matchFromBrief(matchAgency, brief);

    // Persist the lead only for signed-in users (real data).
    const session = await resolveSession();
    let leadId: string | null = null;
    if (session) {
      const [lead] = await withTenant(session.agencyId, (sql) =>
        sql<{ id: string }[]>`
          insert into leads (agency_id, raw_text, requirements, status)
          values (${session.agencyId}, ${text}, ${sql.json(brief)}, 'triaged')
          returning id`,
      );
      leadId = lead.id;
    }

    return NextResponse.json({
      brief,
      leadId,
      saved: !!session,
      location,
      count: results.length,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
