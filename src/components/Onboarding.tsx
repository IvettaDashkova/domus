"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

const KEY = "domus-onboarded-v1";

const STEPS = [
  {
    title: "Welcome to Domus",
    body: "An operations workspace for a real-estate agency — smart matching, lead triage, viewing routes, valuations and visual search, over one map. Everything here runs on free, open data.",
  },
  {
    title: "Search & smart matching",
    body: "Describe what a buyer wants in the top bar (Enter) or use the filters. Results are ranked by hybrid retrieval (semantic + keyword + location). Toggle ◇ visual to search on the photos instead.",
  },
  {
    title: "Triage, value & route",
    body: "✦ Triage a free-text enquiry → the LLM extracts a structured brief and matches listings. Click a card for its detail drawer: estimate value from comparable sales, find similar-looking homes, or add it to an optimized viewing route.",
  },
  {
    title: "Demo vs. your data",
    body: "Browse everything as a live demo — no account needed. Sign in to create and save your own leads (your CRM data stays private to you).",
  },
];

export default function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(KEY)) {
      queueMicrotask(() => setOpen(true));
    }
  }, []);

  function done() {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="modal-backdrop" onClick={done}>
      <div className="modal onboard" onClick={(e) => e.stopPropagation()}>
        <div className="onboard-head">
          <Logo size={28} />
          <span className="onboard-step">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="modal-title">{s.title}</div>
        <div className="modal-sub" style={{ lineHeight: 1.55 }}>{s.body}</div>
        <div className="onboard-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboard-dot${i === step ? " on" : ""}`} />
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={done}>Skip</button>
          {!last ? (
            <button className="btn" onClick={() => setStep((v) => v + 1)}>Next →</button>
          ) : (
            <button className="btn" onClick={done}>Get started</button>
          )}
        </div>
      </div>
    </div>
  );
}
