import { categoryColor } from "@/lib/ui/category";

export interface ListingRow {
  id: string;
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  property_type: string | null;
  score?: number | null;
  rank?: number | null;
}

function fmtPrice(p: number | null): string {
  if (p == null) return "—";
  if (p >= 1_000_000) return `£${(p / 1_000_000).toFixed(p % 1_000_000 ? 2 : 0)}M`;
  if (p >= 1_000) return `£${Math.round(p / 1000)}k`;
  return `£${p}`;
}

export default function ListingList({
  listings,
  onSelect,
  selectedId,
}: {
  listings: ListingRow[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}) {
  if (listings.length === 0) {
    return <div className="empty">No matches.</div>;
  }
  return (
    <div className="list">
      {listings.map((l) => (
        <article
          key={l.id}
          className={`card${l.id === selectedId ? " selected" : ""}`}
          onClick={() => onSelect?.(l.id)}
        >
          <div className="card-top">
            <div className="card-addr">
              {l.rank != null && <span className="rank">{l.rank}</span>}
              {l.address ?? "(no address)"}
            </div>
            <span className="price">{fmtPrice(l.price)}</span>
          </div>
          <div className="card-meta">
            <span className="chip">
              <span className="dot" style={{ background: categoryColor(l.property_type) }} />
              {l.property_type ?? "property"}
            </span>
            {l.bedrooms != null && <span className="chip">{l.bedrooms} bed</span>}
            {l.score != null && (
              <span className="chip score" title="RRF match score">
                {Number(l.score).toFixed(3)}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
