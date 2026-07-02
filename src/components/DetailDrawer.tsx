"use client";

import type { ListingRow } from "@/components/ListingList";
import { categoryColor } from "@/lib/ui/category";
import { zlFull } from "@/lib/ui/money";

export default function DetailDrawer({
  listing,
  onClose,
  onValue,
  onSimilar,
  onAddRoute,
  inRoute,
}: {
  listing: ListingRow;
  onClose: () => void;
  onValue: (id: string) => void;
  onSimilar: (id: string) => void;
  onAddRoute: (id: string) => void;
  inRoute: boolean;
}) {
  const l = listing;
  return (
    <div className="drawer" onClick={(e) => e.stopPropagation()}>
      <button className="drawer-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      {l.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="drawer-photo" src={l.image_url} alt="" />
      )}
      <div className="drawer-body">
        <div className="drawer-price">{zlFull(l.price)}</div>
        <div className="drawer-addr">{l.address ?? "(no address)"}</div>
        <div className="card-meta">
          <span className="chip">
            <span className="dot" style={{ background: categoryColor(l.property_type) }} />
            {l.property_type ?? "property"}
          </span>
          {l.bedrooms != null && <span className="chip">{l.bedrooms} bed</span>}
        </div>
        {l.tags && l.tags.length > 0 && (
          <div className="card-tags" style={{ marginTop: 12 }}>
            {l.tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}
        <div className="drawer-actions">
          <button className="btn" onClick={() => onValue(l.id)}>£ Estimate value</button>
          <button className="btn ghost" onClick={() => onSimilar(l.id)}>◇ Similar-looking</button>
          <button className="btn ghost" onClick={() => onAddRoute(l.id)}>
            {inRoute ? "✓ In route" : "+ Add to route"}
          </button>
        </div>
      </div>
    </div>
  );
}
