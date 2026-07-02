"use client";

import { useCurrency } from "@/lib/currency";

export interface LeadRow {
  id: string;
  raw_text: string | null;
  contact: string | null;
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
  canEdit,
  onEdit,
  onDelete,
}: {
  leads: LeadRow[];
  loading: boolean;
  onOpen: (id: string) => void;
  openingId: string | null;
  canEdit: boolean;
  onEdit: (lead: LeadRow) => void;
  onDelete: (id: string) => void;
}) {
  const { fmt } = useCurrency();
  if (loading) return <div className="empty">Loading leads…</div>;
  if (leads.length === 0)
    return <div className="empty">No leads yet — triage an enquiry or add one.</div>;

  return (
    <div className="list">
      {leads.map((l) => {
        const b = l.requirements ?? {};
        return (
          <article key={l.id} className="card lead-card" onClick={() => onOpen(l.id)}>
            {l.contact && <div className="lead-contact">{l.contact}</div>}
            <div className="lead-enquiry">{l.raw_text ?? "(no text)"}</div>
            <div className="brief-chips">
              {b.propertyType && b.propertyType !== "any" && (
                <span className="chip">{b.propertyType}</span>
              )}
              {b.bedrooms != null && <span className="chip">{b.bedrooms} bed</span>}
              {(b.minPrice != null || b.maxPrice != null) && (
                <span className="chip">
                  {b.minPrice != null ? fmt(b.minPrice) : fmt(0)}–
                  {b.maxPrice != null ? fmt(b.maxPrice) : "∞"}
                </span>
              )}
              {b.location && <span className="chip">📍 {b.location}</span>}
              {(b.excludes ?? []).map((x) => (
                <span key={x} className="chip exclude">− {x}</span>
              ))}
            </div>
            <div className="lead-foot">
              <span className="chip">{l.status}</span>
              <div className="lead-actions">
                {canEdit && (
                  <>
                    <button
                      className="route-add"
                      title="Edit lead"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(l);
                      }}
                    >
                      ✎ edit
                    </button>
                    <button
                      className="route-add danger"
                      title="Delete lead"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(l.id);
                      }}
                    >
                      ✕
                    </button>
                  </>
                )}
                <span className="lead-open">{openingId === l.id ? "…" : "open →"}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
