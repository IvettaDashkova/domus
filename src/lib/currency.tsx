"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Currency = "PLN" | "EUR";

// Fallback PLN→EUR if the live rate can't be fetched.
const FALLBACK_RATE = 0.233;

interface Ctx {
  currency: Currency;
  rate: number; // PLN -> EUR
  setCurrency: (c: Currency) => void;
  fmt: (plnAmount: number | null) => string; // full, grouped
  fmtShort: (plnAmount: number | null) => string; // k / M
}

const CurrencyContext = createContext<Ctx>({
  currency: "PLN",
  rate: FALLBACK_RATE,
  setCurrency: () => {},
  fmt: () => "—",
  fmtShort: () => "—",
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("PLN");
  const [rate, setRate] = useState(FALLBACK_RATE);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem("domus-currency") as Currency | null;
      if (saved === "EUR" || saved === "PLN") setCurrencyState(saved);
    });
    // today's PLN -> EUR rate (free, no key)
    fetch("https://api.frankfurter.app/latest?base=PLN&symbols=EUR")
      .then((r) => r.json())
      .then((d) => {
        if (d?.rates?.EUR) setRate(d.rates.EUR);
      })
      .catch(() => {});
  }, []);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    localStorage.setItem("domus-currency", c);
  }

  function fmt(pln: number | null): string {
    if (pln == null) return "—";
    if (currency === "PLN") return `${Math.round(pln).toLocaleString("pl-PL")} zł`;
    return `€${Math.round(pln * rate).toLocaleString("en-US")}`;
  }
  function fmtShort(pln: number | null): string {
    if (pln == null) return "—";
    const v = currency === "PLN" ? pln : pln * rate;
    const sym = currency === "PLN" ? " zł" : "";
    const pre = currency === "PLN" ? "" : "€";
    if (v >= 1_000_000) return `${pre}${(v / 1_000_000).toFixed(v % 1_000_000 ? 2 : 0)}M${sym}`;
    if (v >= 1_000) return `${pre}${Math.round(v / 1000)}k${sym}`;
    return `${pre}${Math.round(v)}${sym}`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, rate, setCurrency, fmt, fmtShort }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);

export function CurrencySwitcher() {
  const { currency, setCurrency, rate } = useCurrency();
  return (
    <div className="lang-switch" title={`1 zł ≈ €${rate.toFixed(3)} (live)`}>
      {(["PLN", "EUR"] as Currency[]).map((c) => (
        <button
          key={c}
          className={`lang-btn${c === currency ? " on" : ""}`}
          onClick={() => setCurrency(c)}
        >
          {c === "PLN" ? "zł" : "€"}
        </button>
      ))}
    </div>
  );
}
