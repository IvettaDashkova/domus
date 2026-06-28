import { categoryColor } from "@/lib/ui/category";

export interface ListingRow {
  id: string;
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  property_type: string | null;
}

function fmtPrice(p: number | null): string {
  if (p == null) return "—";
  if (p >= 1_000_000) return `£${(p / 1_000_000).toFixed(p % 1_000_000 ? 2 : 0)}M`;
  if (p >= 1_000) return `£${Math.round(p / 1000)}k`;
  return `£${p}`;
}

export default function ListingList({ listings }: { listings: ListingRow[] }) {
  if (listings.length === 0) {
    return <div className="empty">No listings yet — run the seed.</div>;
  }
  return (
    <div className="list">
      {listings.map((l) => (
        <article key={l.id} className="card">
          <div className="card-top">
            <div className="card-addr">{l.address ?? "(no address)"}</div>
            <span className="price">{fmtPrice(l.price)}</span>
          </div>
          <div className="card-meta">
            <span className="chip">
              <span className="dot" style={{ background: categoryColor(l.property_type) }} />
              {l.property_type ?? "property"}
            </span>
            {l.bedrooms != null && <span className="chip">{l.bedrooms} bed</span>}
          </div>
        </article>
      ))}
    </div>
  );
}
