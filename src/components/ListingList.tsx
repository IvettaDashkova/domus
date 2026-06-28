export interface ListingRow {
  id: string;
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  property_type: string | null;
}

export default function ListingList({ listings }: { listings: ListingRow[] }) {
  if (listings.length === 0) {
    return <p style={{ color: "var(--muted)" }}>No listings yet — run the seed.</p>;
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {listings.map((l) => (
        <li
          key={l.id}
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid var(--border)",
            fontSize: 14,
          }}
        >
          <div>{l.address ?? "(no address)"}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            {l.property_type ?? "—"} · {l.bedrooms ?? "?"} bed ·{" "}
            {l.price != null ? `£${l.price.toLocaleString()}` : "—"}
          </div>
        </li>
      ))}
    </ul>
  );
}
