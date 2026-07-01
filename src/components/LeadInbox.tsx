"use client";

export interface LeadRow {
  id: string;
  raw_text: string | null;
  requirements: {
    propertyType?: string;
    bedrooms?: number | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    location?: string | null;
    excludes?: string[];
  } | null;
  status: string;
  created_at: string;
}

export default function LeadInbox({
  leads,
  loading,
  onOpen,
  openingId,
}: {
  leads: LeadRow[];
  loading: boolean;
  onOpen: (id: string) => void;
  openingId: string | null;
}) {
  if (loading) return <div className="empty">Loading leads…</div>;
  if (leads.length === 0)
    return <div className="empty">No leads yet — triage an enquiry.</div>;

  return (
    <div className="list">
      {leads.map((l) => {
        const b = l.requirements ?? {};
        return (
          <article key={l.id} className="card lead-card" onClick={() => onOpen(l.id)}>
            <div className="lead-enquiry">{l.raw_text ?? "(no text)"}</div>
            <div className="brief-chips">
              {b.propertyType && b.propertyType !== "any" && (
                <span className="chip">{b.propertyType}</span>
              )}
              {b.bedrooms != null && <span className="chip">{b.bedrooms} bed</span>}
              {(b.minPrice != null || b.maxPrice != null) && (
                <span className="chip">
                  {b.minPrice != null ? `£${b.minPrice.toLocaleString()}` : "£0"}–
                  {b.maxPrice != null ? `£${b.maxPrice.toLocaleString()}` : "∞"}
                </span>
              )}
              {b.location && <span className="chip">📍 {b.location}</span>}
              {(b.excludes ?? []).map((x) => (
                <span key={x} className="chip exclude">− {x}</span>
              ))}
            </div>
            <div className="lead-foot">
              <span className="chip">{l.status}</span>
              <span className="lead-open">{openingId === l.id ? "opening…" : "open →"}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
