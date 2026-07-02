"use client";

import { categoryColor } from "@/lib/ui/category";
import { useCurrency } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";

export interface ListingRow {
  id: string;
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  property_type: string | null;
  image_url?: string | null;
  tags?: string[] | null;
  score?: number | null;
  rank?: number | null;
  own?: boolean;
}

export default function ListingList({
  listings,
  onSelect,
  selectedId,
  onAddRoute,
  routeIds,
  onValue,
  onSimilar,
  onHover,
}: {
  listings: ListingRow[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  onAddRoute?: (id: string) => void;
  routeIds?: Set<string>;
  onValue?: (id: string) => void;
  onSimilar?: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  const { fmtShort } = useCurrency();
  const { t } = useI18n();
  if (listings.length === 0) {
    return <div className="empty">{t("list.empty")}</div>;
  }
  return (
    <div className="list">
      {listings.map((l) => (
        <article
          key={l.id}
          className={`card${l.id === selectedId ? " selected" : ""}`}
          onClick={() => onSelect?.(l.id)}
          onMouseEnter={() => onHover?.(l.id)}
          onMouseLeave={() => onHover?.(null)}
        >
          {l.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="card-photo" src={l.image_url} alt="" loading="lazy" />
          )}
          <div className="card-top">
            <div className="card-addr">
              {l.rank != null && <span className="rank">{l.rank}</span>}
              {l.own && <span className="own-badge" title="Your listing">Yours</span>}
              {l.address ?? "(no address)"}
            </div>
            <span className="price">{fmtShort(l.price)}</span>
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
            {onValue && (
              <button className="route-add" title="Estimate value" onClick={(e) => { e.stopPropagation(); onValue(l.id); }}>
                ⌂ est
              </button>
            )}
            {onSimilar && (
              <button className="route-add" title="Find similar-looking listings" onClick={(e) => { e.stopPropagation(); onSimilar(l.id); }}>
                ◇ similar
              </button>
            )}
            {onAddRoute && (
              <button
                className={`route-add${routeIds?.has(l.id) ? " on" : ""}`}
                title="Add to viewing route"
                onClick={(e) => { e.stopPropagation(); onAddRoute(l.id); }}
              >
                {routeIds?.has(l.id) ? "✓ route" : "+ route"}
              </button>
            )}
          </div>
          {l.tags && l.tags.length > 0 && (
            <div className="card-tags">
              {l.tags.slice(0, 4).map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
