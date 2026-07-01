import { NextResponse } from "next/server";
import { parseBody, editLeadBody } from "@/lib/api/validate";
import type { Brief } from "@/lib/leads/extract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Editing/deleting a lead is real data — authentication required. RLS scopes to
// the user's own agency, so a user can only touch their own leads.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = await parseBody(req, editLeadBody);
    if ("response" in parsed) return parsed.response;

    const { resolveSession } = await import("@/lib/auth");
    const session = await resolveSession();
    if (!session) return NextResponse.json({ error: "sign in required" }, { status: 401 });

    const { contact, enquiry, status } = parsed.data;

    // Re-extract the brief if the enquiry text changed (keeps matching accurate).
    let requirements: Brief | null = null;
    if (enquiry) {
      try {
        const { geminiApiKey } = await import("@/lib/ai/gemini");
        if (geminiApiKey()) {
          const { extractBrief } = await import("@/lib/leads/extract");
          requirements = await extractBrief(enquiry);
        }
      } catch {
        /* leave requirements untouched */
      }
    }

    const { withTenant } = await import("@/lib/db/tenant");
    const [lead] = await withTenant(session.agencyId, (sql) =>
      sql<{ id: string }[]>`
        update leads set
          contact = coalesce(${contact ?? null}, contact),
          raw_text = coalesce(${enquiry ?? null}, raw_text),
          status = coalesce(${status ?? null}, status),
          requirements = coalesce(${requirements ? sql.json(requirements) : null}, requirements)
        where id = ${id}
        returning id`,
    );
    if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });
    return NextResponse.json({ leadId: lead.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { resolveSession } = await import("@/lib/auth");
    const session = await resolveSession();
    if (!session) return NextResponse.json({ error: "sign in required" }, { status: 401 });

    const { withTenant } = await import("@/lib/db/tenant");
    const [lead] = await withTenant(session.agencyId, (sql) =>
      sql<{ id: string }[]>`delete from leads where id = ${id} returning id`,
    );
    if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
