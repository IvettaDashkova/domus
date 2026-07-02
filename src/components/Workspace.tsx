"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  type MapMarker,
  type MapView,
  type MapFocus,
  type RouteLine,
  type RouteStop,
} from "@/components/Map";
import Link from "next/link";
import ListingList, { type ListingRow } from "@/components/ListingList";
import LeadInbox, { type LeadRow } from "@/components/LeadInbox";
import DetailDrawer from "@/components/DetailDrawer";
import Onboarding from "@/components/Onboarding";
import Logo from "@/components/Logo";
import { categoryColor } from "@/lib/ui/category";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n, LangSwitcher } from "@/lib/i18n";
import { useCurrency, CurrencySwitcher } from "@/lib/currency";

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

interface PlanStop {
  position: number;
  listingId: string | null;
  address: string | null;
  lng: number;
  lat: number;
  arrival: string;
  depart: string;
  legFromPrevSec: number;
  late: boolean;
}
interface RoutePlanData {
  stops: PlanStop[];
  geojson: RouteLine;
  optimizedDriveSec: number;
  naiveDriveSec: number;
  savedSec: number;
  mode: "osrm" | "estimated";
}

const mins = (s: number) => `${Math.round(s / 60)}m`;

interface CompW {
  id: string;
  address: string | null;
  price: number;
  bedrooms: number | null;
  property_type: string | null;
  distanceM: number;
  weight: number;
}
interface ValuationData {
  subject: { address: string | null; propertyType: string | null; bedrooms: number | null };
  estimate: number;
  low: number;
  high: number;
  confidence: number;
  dispersion: number;
  compCount: number;
  radiusKm: number;
  comps: CompW[];
  actual: number | null;
  errorPct: number | null;
}

const TYPES = ["", "apartment", "house", "studio", "townhouse"];

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function popupHtml(r: WorkspaceRow, fmtPrice: (n: number | null) => string): string {
  const beds = r.bedrooms != null ? ` · ${r.bedrooms} bed` : "";
  const own = r.own ? `<span class="pop-own">Yours</span> ` : "";
  return (
    `<div class="pop-addr">${own}${esc(r.address ?? "(no address)")}</div>` +
    `<div class="pop-meta">${esc(r.property_type ?? "property")}${beds} · ` +
    `<span class="pop-price">${fmtPrice(r.price)}</span></div>`
  );
}

export default function Workspace({
  initial,
  userEmail,
}: {
  initial: WorkspaceRow[];
  userEmail: string | null;
}) {
  const { t } = useI18n();
  const { fmt, fmtShort, currency } = useCurrency();
  const [rows, setRows] = useState<WorkspaceRow[]>(initial);
  const [brief, setBrief] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [ptype, setPtype] = useState("");
  const [useLoc, setUseLoc] = useState(false);
  const [visualMode, setVisualMode] = useState(false);
  const [view, setView] = useState<MapView>({ lng: 19.4, lat: 52.0, radiusKm: 300 });
  const [loading, setLoading] = useState(false);
  const [matched, setMatched] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [fit, setFit] = useState<{ pts: [number, number][]; key: number } | null>(null);

  // Zoom/pan the map to encompass a set of result listings (e.g. the city a
  // buyer asked for) so clustered matches aren't lost at the country zoom.
  function fitToResults(list: WorkspaceRow[]) {
    const pts = list
      .filter((r) => r.lng != null && r.lat != null)
      .map((r) => [r.lng as number, r.lat as number] as [number, number]);
    if (pts.length) setFit({ pts, key: Date.now() });
  }

  // Nav + leads inbox + detail drawer + hover sync
  const [nav, setNav] = useState<"discover" | "leads">("discover");
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [openingLead, setOpeningLead] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  async function goLeads() {
    setNav("leads");
    setLeadsLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data.leads ?? []);
    } finally {
      setLeadsLoading(false);
    }
  }

  async function openLead(id: string) {
    setOpeningLead(id);
    // Clear any open map windows / routing state so the lead starts clean.
    setDetailId(null);
    setRouteMode(false);
    setRouteIds([]);
    setPlan(null);
    setRouteLine(null);
    setRouteError(null);
    setStartPoint(null);
    try {
      const res = await fetch("/api/leads/rerun", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeadBrief(data.brief);
        const results = (data.results ?? []).map((r: WorkspaceRow, i: number) => ({
          ...r,
          rank: i + 1,
        }));
        setRows(results);
        setMatched(true);
        setNav("discover");
        fitToResults(results); // #10: zoom to the matched cluster (e.g. the city)
      }
    } finally {
      setOpeningLead(null);
    }
  }

  async function signOut() {
    const sb = supabaseBrowser();
    if (sb) await sb.auth.signOut();
    window.location.reload();
  }

  // New / edit lead form (auth-gated)
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [nlContact, setNlContact] = useState("");
  const [nlEnquiry, setNlEnquiry] = useState("");
  const [nlSaving, setNlSaving] = useState(false);

  function openNewLead() {
    setEditingLeadId(null);
    setNlContact("");
    setNlEnquiry("");
    setNewLeadOpen(true);
  }
  function editLead(l: LeadRow) {
    setEditingLeadId(l.id);
    setNlContact(l.contact ?? "");
    setNlEnquiry(l.raw_text ?? "");
    setNewLeadOpen(true);
  }
  async function deleteLead(id: string) {
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) goLeads();
  }
  async function submitNewLead() {
    setNlSaving(true);
    try {
      const res = await fetch(editingLeadId ? `/api/leads/${editingLeadId}` : "/api/leads", {
        method: editingLeadId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enquiry: nlEnquiry, contact: nlContact || undefined }),
      });
      if (res.ok) {
        setNewLeadOpen(false);
        setEditingLeadId(null);
        setNlContact("");
        setNlEnquiry("");
        goLeads();
      }
    } finally {
      setNlSaving(false);
    }
  }

  // Add property (auth-gated)
  const [addOpen, setAddOpen] = useState(false);
  const [alAddress, setAlAddress] = useState("");
  const [alCity, setAlCity] = useState("Warszawa");
  const [alPrice, setAlPrice] = useState("");
  const [alType, setAlType] = useState("apartment");
  const [alBeds, setAlBeds] = useState("");
  const [alArea, setAlArea] = useState("");
  const [alBath, setAlBath] = useState("");
  const [alFurnished, setAlFurnished] = useState(false);
  const [alDesc, setAlDesc] = useState("");
  const [alSaving, setAlSaving] = useState(false);
  const [alError, setAlError] = useState<string | null>(null);
  async function submitListing() {
    setAlSaving(true);
    setAlError(null);
    try {
      // Fold the extra structured fields into the description so they enrich the
      // text embedding (and are shown in the listing) without a schema change.
      const facts: string[] = [];
      if (alArea) facts.push(`${alArea} m²`);
      if (alBath) facts.push(`${alBath} bathroom${alBath === "1" ? "" : "s"}`);
      if (alFurnished) facts.push("furnished");
      const base = alDesc.trim() || `${alType} in ${alCity}. ${alAddress}.`;
      const description = facts.length ? `${base} · ${facts.join(" · ")}.` : base;
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: alAddress,
          city: alCity,
          price: Number(alPrice),
          propertyType: alType,
          bedrooms: alBeds ? Number(alBeds) : undefined,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlError(data.error ?? "failed");
        return;
      }
      window.location.reload();
    } catch (e) {
      setAlError((e as Error).message);
    } finally {
      setAlSaving(false);
    }
  }

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
      {
        const results = (data.results ?? []).map((r: WorkspaceRow, i: number) => ({
          ...r,
          rank: i + 1,
        }));
        setRows(results);
        fitToResults(results);
      }
      setMatched(true);
      setTriageOpen(false);
    } catch (e) {
      setTriageError((e as Error).message);
    } finally {
      setTriaging(false);
    }
  }

  // Valuation
  const [valuation, setValuation] = useState<ValuationData | null>(null);
  const [valuing, setValuing] = useState(false);
  const [valError, setValError] = useState<string | null>(null);

  async function valuate(listingId: string) {
    setValuing(true);
    setValError(null);
    setValuation(null);
    try {
      const res = await fetch("/api/valuation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (!res.ok) setValError(data.error ?? "valuation failed");
      else setValuation(data);
    } catch (e) {
      setValError((e as Error).message);
    } finally {
      setValuing(false);
    }
  }

  // Viewing route
  const [routeMode, setRouteMode] = useState(false);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [startPoint, setStartPoint] = useState<{ lng: number; lat: number } | null>(null);
  const [plan, setPlan] = useState<RoutePlanData | null>(null);
  const [routeLine, setRouteLine] = useState<RouteLine | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [dwell, setDwell] = useState("30");
  const [returnToStart, setReturnToStart] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  function toggleRoute(id: string) {
    setRouteIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    setPlan(null);
    setRouteLine(null);
  }
  function moveStop(i: number, dir: -1 | 1) {
    setRouteIds((ids) => {
      const j = i + dir;
      if (j < 0 || j >= ids.length) return ids;
      const next = [...ids];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setPlan(null);
    setRouteLine(null);
  }
  function clearRoute() {
    setRouteIds([]);
    setPlan(null);
    setRouteLine(null);
    setRouteError(null);
    setStartPoint(null);
  }
  async function optimizeRoute() {
    setOptimizing(true);
    setRouteError(null);
    try {
      const start = startPoint ?? { lng: view.lng, lat: view.lat };
      const res = await fetch("/api/route/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          start,
          listingIds: routeIds,
          startTime,
          dwellMin: Number(dwell) || 30,
          returnToStart,
          dayEnd: "17:00",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRouteError(data.error ?? "route failed");
        return;
      }
      setPlan(data);
      setRouteLine(data.geojson);
    } catch (e) {
      setRouteError((e as Error).message);
    } finally {
      setOptimizing(false);
    }
  }

  // Open a printable itinerary in a new tab (print → or "Save as PDF" to download).
  function printRoute() {
    if (!plan) return;
    const rowsHtml = plan.stops
      .map(
        (s) =>
          `<tr><td class="n">${s.position === 0 ? "S" : s.position}</td>` +
          `<td>${s.arrival}</td><td>${esc(s.address ?? "")}</td>` +
          `<td class="leg">${s.position > 0 ? "+" + mins(s.legFromPrevSec) : ""}</td></tr>`,
      )
      .join("");
    const est = plan.mode === "estimated" ? " (estimated — no road data)" : "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Domus — viewing route</title>
      <style>
        body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;padding:32px;max-width:640px;margin:auto}
        h1{font-size:20px;margin:0 0 4px} .sub{color:#666;margin:0 0 20px}
        table{width:100%;border-collapse:collapse} td{padding:8px 6px;border-bottom:1px solid #eee;vertical-align:top}
        .n{font-weight:700;width:26px;text-align:center;color:#2f6bff} .leg{color:#888;text-align:right;white-space:nowrap}
        @media print{body{padding:0}}
      </style></head><body>
      <h1>Domus — viewing route</h1>
      <p class="sub">${plan.stops.length - 1} viewings · ${mins(plan.optimizedDriveSec)} drive${est}</p>
      <table>${rowsHtml}</table>
      <p class="sub" style="margin-top:24px">Generated by Domus</p>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  const markers: MapMarker[] = useMemo(
    () =>
      rows
        .filter((r) => r.lng != null && r.lat != null)
        .map((r) => ({
          id: r.id,
          lng: r.lng as number,
          lat: r.lat as number,
          html: popupHtml(r, fmtShort),
          color: categoryColor(r.property_type),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, currency],
  );

  async function search() {
    setLoading(true);
    try {
      const res = visualMode
        ? await fetch("/api/visual-search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ query: brief }),
          })
        : await fetch("/api/match", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              brief,
              filters: {
                minPrice: minPrice ? Number(minPrice) : null,
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

  async function similar(listingId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/listings/similar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      setRows((data.results ?? []).map((r: WorkspaceRow, i: number) => ({ ...r, rank: i + 1 })));
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
  }, [ptype, minPrice, maxPrice, beds, useLoc]);

  function selectListing(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row?.lng != null && row?.lat != null) {
      setFocus({ id, lng: row.lng, lat: row.lat, key: Date.now() });
    }
    setDetailId(id);
  }

  const routeStops: RouteStop[] = plan
    ? plan.stops.map((s) => ({ lng: s.lng, lat: s.lat, n: s.position }))
    : [];
  const detailRow = detailId ? rows.find((r) => r.id === detailId) ?? null : null;

  function reset() {
    setRows(initial);
    setBrief("");
    setMinPrice("");
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
        <div className="topbar-spacer" />
        <CurrencySwitcher />
        <LangSwitcher />
        <button className="btn triage-btn" onClick={() => setTriageOpen(true)}>
          {t("tb.triage")}
        </button>
        {userEmail ? (
          <div className="auth-chip">
            <span className="auth-email" title={userEmail}>{userEmail}</span>
            <button className="btn ghost" onClick={signOut}>{t("tb.signout")}</button>
          </div>
        ) : (
          <Link href="/login" className="btn signin">{t("cta.signin")}</Link>
        )}
      </header>

      <div className="body">
        {openingLead && (
          <div className="busy-overlay">
            <div className="busy-card">
              <div className="spinner" />
              <div className="busy-text">{t("busy.matching")}</div>
            </div>
          </div>
        )}
        <nav className="rail">
          <button
            className={`rail-btn${nav === "discover" ? " on" : ""}`}
            onClick={() => setNav("discover")}
            title={t("nav.discover")}
          >
            ◎
          </button>
          <button
            className={`rail-btn${nav === "leads" ? " on" : ""}`}
            onClick={goLeads}
            title={t("nav.leads")}
          >
            ✉
          </button>
        </nav>

        {nav === "leads" ? (
          <aside className="panel side">
            <div className="panel-head">
              <span className="panel-title">{t("panel.leadInbox")}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {userEmail && (
                  <button className="btn" onClick={openNewLead}>
                    {t("lead.newBtn")}
                  </button>
                )}
                <span className="count-pill">{leads.length}</span>
              </div>
            </div>
            {!userEmail && (
              <div className="demo-note">
                <Link href="/login">{t("cta.signin")}</Link> — {t("lead.hint")}
              </div>
            )}
            {newLeadOpen && userEmail && (
              <div className="controls">
                <div className="controls-title">{editingLeadId ? t("lead.edit") : t("lead.new")}</div>
                <input
                  className="nl-input"
                  placeholder={t("lead.contact")}
                  value={nlContact}
                  onChange={(e) => setNlContact(e.target.value)}
                />
                <textarea
                  className="nl-input"
                  rows={3}
                  placeholder={t("lead.enquiry")}
                  value={nlEnquiry}
                  onChange={(e) => setNlEnquiry(e.target.value)}
                />
                <div className="nl-hint">{t("lead.hint")}</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                  <button className="btn ghost" onClick={() => setNewLeadOpen(false)}>
                    {t("common.cancel")}
                  </button>
                  <button className="btn" onClick={submitNewLead} disabled={nlSaving || !nlEnquiry.trim()}>
                    {nlSaving ? "…" : editingLeadId ? t("lead.save") : t("lead.add")}
                  </button>
                </div>
              </div>
            )}
            <LeadInbox
              leads={leads}
              loading={leadsLoading}
              onOpen={openLead}
              openingId={openingLead}
              canEdit={!!userEmail}
              onEdit={editLead}
              onDelete={deleteLead}
            />
          </aside>
        ) : (
        <aside className="panel side">
          {(routeMode || routeIds.length > 0) && (
            <div className="route-panel">
              <div className="route-head">
                <span>
                  🚗 {t("route.title")} · {routeIds.length}{" "}
                  {routeIds.length === 1 ? t("route.stop") : t("route.stops")}
                </span>
                <button className="btn ghost" onClick={clearRoute}>
                  {t("common.clear")}
                </button>
              </div>
              {routeIds.length > 0 ? (
                <ol className="route-stops">
                  {routeIds.map((id, i) => {
                    const r = rows.find((x) => x.id === id);
                    return (
                      <li key={id} className="route-stop">
                        <span className="rs-n">{i + 1}</span>
                        <span className="rs-addr">{r?.address ?? "(listing)"}</span>
                        <button className="rs-btn" disabled={i === 0} onClick={() => moveStop(i, -1)} title="Move up">
                          ↑
                        </button>
                        <button
                          className="rs-btn"
                          disabled={i === routeIds.length - 1}
                          onClick={() => moveStop(i, 1)}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button className="rs-btn danger" onClick={() => toggleRoute(id)} title="Remove stop">
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="route-note">{t("route.addHint")}</div>
              )}
              <div className="route-opts">
                <label>
                  {t("route.start")}
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </label>
                <label>
                  {t("route.dwell")}
                  <input
                    type="number"
                    value={dwell}
                    onChange={(e) => setDwell(e.target.value)}
                    style={{ width: 46 }}
                  />
                  m
                </label>
                <label className="near">
                  <input
                    type="checkbox"
                    checked={returnToStart}
                    onChange={(e) => setReturnToStart(e.target.checked)}
                  />
                  {t("route.roundtrip")}
                </label>
              </div>
              <div className="route-note">
                {startPoint ? t("route.startCustom") : t("route.startCentre")}
              </div>
              <button
                className="btn block"
                onClick={optimizeRoute}
                disabled={optimizing || routeIds.length < 1}
              >
                {optimizing ? t("route.optimizing") : t("route.optimize")}
              </button>
              {routeError && <div className="modal-err">{routeError}</div>}
              {plan && (
                <div className="itin">
                  <div className="itin-saved">
                    {t("route.saved")} {mins(plan.savedSec)} · {mins(plan.optimizedDriveSec)}{" "}
                    {t("route.drive")} (vs {mins(plan.naiveDriveSec)})
                  </div>
                  {plan.mode === "estimated" && (
                    <div className="itin-est">{t("route.estimated")}</div>
                  )}
                  {plan.stops.map((s) => (
                    <div key={s.position} className={`itin-row${s.late ? " late" : ""}`}>
                      <span className="itin-num">{s.position}</span>
                      <span className="itin-time">{s.arrival}</span>
                      <span className="itin-addr">{s.address}</span>
                      {s.position > 0 && <span className="itin-leg">+{mins(s.legFromPrevSec)}</span>}
                    </div>
                  ))}
                  <button className="btn ghost block" onClick={printRoute}>
                    🖨 {t("route.print")}
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="controls">
            <div className="controls-title">{t("filters.title")}</div>
            <form
              className="search sidebar-search"
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
                placeholder={visualMode ? t("tb.visualPlaceholder") : t("tb.searchPlaceholder")}
              />
              <button
                type="button"
                className={`vmode${visualMode ? " on" : ""}`}
                title={t("search.visualHint")}
                onClick={() => setVisualMode((v) => !v)}
              >
                ◇ visual
              </button>
            </form>
            {visualMode && <div className="nl-hint">{t("search.visualHint")}</div>}
            <div className="filters">
              <select value={ptype} onChange={(e) => setPtype(e.target.value)}>
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {ty === "" ? t("filters.anyType") : ty}
                  </option>
                ))}
              </select>
              <label className="near">
                <input type="checkbox" checked={useLoc} onChange={(e) => setUseLoc(e.target.checked)} />
                {t("filters.near")}
              </label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder={t("filters.minPrice")}
              />
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={t("filters.maxPrice")}
              />
              <input
                type="number"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                placeholder={t("filters.beds")}
              />
            </div>
            <button className="btn block" onClick={search} disabled={loading}>
              {loading ? t("btn.searching") : t("btn.search")}
            </button>
          </div>

          <div className="panel-head">
            <span className="panel-title">{matched ? t("panel.matches") : t("panel.listings")}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {userEmail && (
                <button className="btn sm" onClick={() => setAddOpen(true)}>
                  {t("tb.property")}
                </button>
              )}
              {matched && (
                <button className="btn ghost" onClick={reset}>
                  {t("common.clear")}
                </button>
              )}
              <span className="count-pill">{rows.length}</span>
            </div>
          </div>
          {leadBrief && (
            <div className="brief">
              <div className="brief-head">{t("brief.head")}</div>
              <div className="brief-chips">
                {leadBrief.propertyType && leadBrief.propertyType !== "any" && (
                  <span className="chip">{leadBrief.propertyType}</span>
                )}
                {leadBrief.bedrooms != null && <span className="chip">{leadBrief.bedrooms} bed</span>}
                {(leadBrief.minPrice != null || leadBrief.maxPrice != null) && (
                  <span className="chip">
                    {leadBrief.minPrice != null ? fmt(leadBrief.minPrice) : fmt(0)}–
                    {leadBrief.maxPrice != null ? fmt(leadBrief.maxPrice) : "∞"}
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
          <ListingList
            listings={rows}
            onSelect={selectListing}
            selectedId={focus?.id}
            onAddRoute={toggleRoute}
            routeIds={new Set(routeIds)}
            onValue={valuate}
            onSimilar={similar}
            onHover={setHoveredId}
          />
        </aside>
        )}

        <section className="panel map-wrap">
          {!detailRow && (
            <div className="map-overlay">
              <div className="map-badge">
                <span className="dot" style={{ background: "var(--pin-green)" }} />
                {markers.length} {t("onmap")}
              </div>
              <button
                className={`btn route-toggle${routeMode ? " on" : ""}`}
                onClick={() => setRouteMode((v) => !v)}
              >
                🚗 {routeMode ? t("route.done") : t("route.plan")}
              </button>
            </div>
          )}
          {routeMode && !detailRow && (
            <div className="route-hint">{t("route.hint")}</div>
          )}
          <Map
            markers={markers}
            onMoveEnd={setView}
            onMarkerClick={selectListing}
            onMapClick={(p) => routeMode && setStartPoint(p)}
            startMarker={routeMode ? startPoint : null}
            focus={focus}
            fit={fit}
            routeLine={routeLine}
            routeStops={routeStops}
            highlightId={hoveredId}
          />
          {detailRow && (
            <DetailDrawer
              listing={detailRow}
              onClose={() => setDetailId(null)}
              onValue={valuate}
              onSimilar={(id) => {
                setDetailId(null);
                similar(id);
              }}
              onAddRoute={toggleRoute}
              inRoute={routeIds.includes(detailRow.id)}
            />
          )}
        </section>
      </div>

      {triageOpen && (
        <div className="modal-backdrop" onClick={() => !triaging && setTriageOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{t("triage.title")}</div>
            <div className="modal-sub">{t("triage.sub")}</div>
            <textarea
              value={enquiry}
              onChange={(e) => setEnquiry(e.target.value)}
              rows={5}
              placeholder={t("triage.placeholder")}
            />
            {triageError && <div className="modal-err">{triageError}</div>}
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setTriageOpen(false)} disabled={triaging}>
                {t("common.cancel")}
              </button>
              <button className="btn" onClick={triage} disabled={triaging || !enquiry.trim()}>
                {triaging ? t("triage.running") : t("triage.run")}
              </button>
            </div>
          </div>
        </div>
      )}

      {(valuing || valuation || valError) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!valuing) {
              setValuation(null);
              setValError(null);
            }
          }}
        >
          <div className="modal val-modal" onClick={(e) => e.stopPropagation()}>
            {valuing && <div className="modal-title">{t("val.valuing")}</div>}
            {valError && (
              <>
                <div className="modal-title">{t("val.title")}</div>
                <div className="modal-err">{valError}</div>
                <div className="modal-actions">
                  <button className="btn" onClick={() => setValError(null)}>
                    {t("common.close")}
                  </button>
                </div>
              </>
            )}
            {valuation && (
              <>
                <div className="modal-title">{t("val.estTitle")}</div>
                <div className="modal-sub">
                  {valuation.subject.address} · {valuation.subject.propertyType} ·{" "}
                  {valuation.subject.bedrooms} bed
                </div>
                <div className="val-estimate">{fmt(valuation.estimate)}</div>
                <div className="val-range">
                  {t("val.range")} {fmt(valuation.low)} – {fmt(valuation.high)}
                </div>
                <div className="val-meta">
                  <span className={`chip val-conf c${Math.round(valuation.confidence * 5)}`}>
                    {t("val.confidence")} {Math.round(valuation.confidence * 100)}%
                  </span>
                  <span className="chip">
                    {valuation.compCount} {t("val.comps")} · {valuation.radiusKm} km
                  </span>
                  {valuation.actual != null && (
                    <span className="chip">
                      {t("val.actual")} {fmt(valuation.actual)} · {t("val.err")} {valuation.errorPct}%
                    </span>
                  )}
                </div>
                <div className="val-comps">
                  <div className="val-comps-head">{t("val.compsHead")}</div>
                  {valuation.comps.slice(0, 8).map((c) => (
                    <div key={c.id} className="val-comp">
                      <span className="vc-price">{fmt(c.price)}</span>
                      <span className="vc-dist">{Math.round(c.distanceM)} m</span>
                      <span className="vc-beds">{c.bedrooms ?? "?"}b</span>
                      <span className="vc-addr">{c.address}</span>
                      <span className="vc-w">{(c.weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                <div className="modal-actions">
                  <button className="btn" onClick={() => setValuation(null)}>
                    {t("common.close")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {addOpen && (
        <div className="modal-backdrop" onClick={() => !alSaving && setAddOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{t("add.title")}</div>
            <div className="modal-sub">{t("add.sub")}</div>
            <div className="add-form">
              <input
                className="nl-input"
                placeholder={t("add.address")}
                value={alAddress}
                onChange={(e) => setAlAddress(e.target.value)}
              />
              <div className="add-row">
                <select className="nl-input" value={alCity} onChange={(e) => setAlCity(e.target.value)}>
                  {["Warszawa", "Kraków", "Wrocław", "Gdańsk", "Poznań", "Łódź"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select className="nl-input" value={alType} onChange={(e) => setAlType(e.target.value)}>
                  {["apartment", "house", "studio", "townhouse"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="add-row">
                <input
                  className="nl-input"
                  type="number"
                  placeholder={t("add.price")}
                  value={alPrice}
                  onChange={(e) => setAlPrice(e.target.value)}
                />
                <input
                  className="nl-input"
                  type="number"
                  placeholder={t("add.bedrooms")}
                  value={alBeds}
                  onChange={(e) => setAlBeds(e.target.value)}
                />
              </div>
              <div className="add-row">
                <input
                  className="nl-input"
                  type="number"
                  placeholder={t("add.area")}
                  value={alArea}
                  onChange={(e) => setAlArea(e.target.value)}
                />
                <input
                  className="nl-input"
                  type="number"
                  placeholder={t("add.bathrooms")}
                  value={alBath}
                  onChange={(e) => setAlBath(e.target.value)}
                />
                <label className="near furnished-toggle">
                  <input
                    type="checkbox"
                    checked={alFurnished}
                    onChange={(e) => setAlFurnished(e.target.checked)}
                  />
                  {t("add.furnished")}
                </label>
              </div>
              <textarea
                className="nl-input"
                rows={2}
                placeholder={t("add.desc")}
                value={alDesc}
                onChange={(e) => setAlDesc(e.target.value)}
              />
            </div>
            {alError && <div className="modal-err">{alError}</div>}
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setAddOpen(false)} disabled={alSaving}>
                {t("common.cancel")}
              </button>
              <button
                className="btn"
                onClick={submitListing}
                disabled={alSaving || !alAddress.trim() || !alPrice}
              >
                {alSaving ? t("add.saving") : t("add.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Onboarding />
    </div>
  );
}
