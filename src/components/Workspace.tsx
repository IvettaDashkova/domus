"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { type MapMarker, type MapView, type MapFocus } from "@/components/Map";
import ListingList, { type ListingRow } from "@/components/ListingList";
import Logo from "@/components/Logo";
import { categoryColor } from "@/lib/ui/category";

export interface WorkspaceRow extends ListingRow {
  lng: number | null;
  lat: number | null;
}

interface Brief {
  propertyType: string;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  location: string | null;
  mustHaves: string[];
  excludes: string[];
  semanticBrief: string;
}

const TYPES = ["", "detached house", "semi-detached house", "terraced house", "flat"];

function fmtPrice(p: number | null): string {
  if (p == null) return "—";
  if (p >= 1_000_000) return `£${(p / 1_000_000).toFixed(p % 1_000_000 ? 2 : 0)}M`;
  if (p >= 1_000) return `£${Math.round(p / 1000)}k`;
  return `£${p}`;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function popupHtml(r: WorkspaceRow): string {
  const beds = r.bedrooms != null ? ` · ${r.bedrooms} bed` : "";
  return (
    `<div class="pop-addr">${esc(r.address ?? "(no address)")}</div>` +
    `<div class="pop-meta">${esc(r.property_type ?? "property")}${beds} · ` +
    `<span class="pop-price">${fmtPrice(r.price)}</span></div>`
  );
}

export default function Workspace({ initial }: { initial: WorkspaceRow[] }) {
  const [rows, setRows] = useState<WorkspaceRow[]>(initial);
  const [brief, setBrief] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [ptype, setPtype] = useState("");
  const [useLoc, setUseLoc] = useState(false);
  const [view, setView] = useState<MapView>({ lng: -1.5, lat: 52.5, radiusKm: 300 });
  const [loading, setLoading] = useState(false);
  const [matched, setMatched] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  // Lead triage
  const [triageOpen, setTriageOpen] = useState(false);
  const [enquiry, setEnquiry] = useState("");
  const [leadBrief, setLeadBrief] = useState<Brief | null>(null);
  const [triaging, setTriaging] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  async function triage() {
    setTriaging(true);
    setTriageError(null);
    try {
      const res = await fetch("/api/leads/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enquiry }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTriageError(data.error ?? "triage failed");
        return;
      }
      setLeadBrief(data.brief);
      setRows((data.results ?? []).map((r: WorkspaceRow, i: number) => ({ ...r, rank: i + 1 })));
      setMatched(true);
      setTriageOpen(false);
    } catch (e) {
      setTriageError((e as Error).message);
    } finally {
      setTriaging(false);
    }
  }

  const markers: MapMarker[] = useMemo(
    () =>
      rows
        .filter((r) => r.lng != null && r.lat != null)
        .map((r) => ({
          id: r.id,
          lng: r.lng as number,
          lat: r.lat as number,
          html: popupHtml(r),
          color: categoryColor(r.property_type),
        })),
    [rows],
  );

  async function search() {
    setLoading(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brief,
          filters: {
            maxPrice: maxPrice ? Number(maxPrice) : null,
            bedrooms: beds ? Number(beds) : null,
            propertyType: ptype || null,
          },
          location: useLoc ? { lat: view.lat, lng: view.lng, radiusKm: view.radiusKm } : null,
          limit: 50,
        }),
      });
      const data = await res.json();
      const results: WorkspaceRow[] = (data.results ?? []).map(
        (r: WorkspaceRow, i: number) => ({ ...r, rank: i + 1 }),
      );
      setRows(results);
      setMatched(true);
    } finally {
      setLoading(false);
    }
  }

  // Filters apply live (debounced) so the controls are self-evident.
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => searchRef.current(), 300);
    return () => clearTimeout(t);
  }, [ptype, maxPrice, beds, useLoc]);

  function selectListing(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row?.lng != null && row?.lat != null) {
      setFocus({ id, lng: row.lng, lat: row.lat, key: Date.now() });
    }
  }

  function reset() {
    setRows(initial);
    setBrief("");
    setMaxPrice("");
    setBeds("");
    setPtype("");
    setUseLoc(false);
    setMatched(false);
    setLeadBrief(null);
    first.current = true; // don't let the cleared filters fire a search
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          Domus
        </div>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Describe the property a buyer wants…  (press Enter)"
          />
        </form>
        <div className="topbar-spacer" />
        <button className="btn triage-btn" onClick={() => setTriageOpen(true)}>
          ✦ Triage lead
        </button>
        <div className="avatar">DA</div>
      </header>

      <div className="body">
        <aside className="panel">
          <div className="controls">
            <div className="controls-title">Filters</div>
            <div className="filters">
              <select value={ptype} onChange={(e) => setPtype(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "" ? "Any type" : t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max £"
              />
              <input
                type="number"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                placeholder="Beds (est.)"
              />
              <label className="near">
                <input type="checkbox" checked={useLoc} onChange={(e) => setUseLoc(e.target.checked)} />
                Near map
              </label>
            </div>
            <button className="btn block" onClick={search} disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          <div className="panel-head">
            <span className="panel-title">{matched ? "Matches" : "Listings"}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {matched && (
                <button className="btn ghost" onClick={reset}>
                  Clear
                </button>
              )}
              <span className="count-pill">{rows.length}</span>
            </div>
          </div>
          {leadBrief && (
            <div className="brief">
              <div className="brief-head">Extracted brief</div>
              <div className="brief-chips">
                {leadBrief.propertyType && leadBrief.propertyType !== "any" && (
                  <span className="chip">{leadBrief.propertyType}</span>
                )}
                {leadBrief.bedrooms != null && <span className="chip">{leadBrief.bedrooms} bed</span>}
                {(leadBrief.minPrice != null || leadBrief.maxPrice != null) && (
                  <span className="chip">
                    {leadBrief.minPrice != null ? `£${leadBrief.minPrice.toLocaleString()}` : "£0"}–
                    {leadBrief.maxPrice != null ? `£${leadBrief.maxPrice.toLocaleString()}` : "∞"}
                  </span>
                )}
                {leadBrief.location && <span className="chip">📍 {leadBrief.location}</span>}
                {leadBrief.mustHaves.map((m) => (
                  <span key={m} className="chip want">+ {m}</span>
                ))}
                {leadBrief.excludes.map((x) => (
                  <span key={x} className="chip exclude">− {x}</span>
                ))}
              </div>
            </div>
          )}
          <ListingList listings={rows} onSelect={selectListing} selectedId={focus?.id} />
        </aside>

        <section className="panel map-wrap">
          <div className="map-overlay">
            <div className="map-badge">
              <span className="dot" style={{ background: "var(--pin-green)" }} />
              {markers.length} on map
            </div>
          </div>
          <Map markers={markers} onMoveEnd={setView} focus={focus} />
        </section>
      </div>

      {triageOpen && (
        <div className="modal-backdrop" onClick={() => !triaging && setTriageOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Triage a lead enquiry</div>
            <div className="modal-sub">
              Paste a buyer&apos;s message — the LLM extracts a structured brief and matches listings.
            </div>
            <textarea
              value={enquiry}
              onChange={(e) => setEnquiry(e.target.value)}
              rows={5}
              placeholder="e.g. Hi, we're after a 3-bed semi in south Manchester under £300k with a garden — definitely not a flat or a new build."
            />
            {triageError && <div className="modal-err">{triageError}</div>}
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setTriageOpen(false)} disabled={triaging}>
                Cancel
              </button>
              <button className="btn" onClick={triage} disabled={triaging || !enquiry.trim()}>
                {triaging ? "Triaging…" : "Triage & match"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
