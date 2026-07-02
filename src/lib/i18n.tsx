"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Locale = "en" | "pl" | "uk";
export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "pl", label: "PL" },
  { code: "uk", label: "UA" },
];

type Dict = Record<string, string>;

const en: Dict = {
  // landing
  "landing.title": "AI operations tool for a Polish real-estate agency",
  "landing.lead":
    "Smart property matching, LLM lead triage, viewing-route optimisation, automated valuations and CLIP visual search — over one map, on a 100% free stack.",
  "landing.speech":
    "Hi, I'm Ivetta 👋 — a front-end / full-stack developer (React · Next.js · TypeScript · Node). I build production geospatial & AI apps. Meet Domus — my portfolio project.",
  "landing.f1t": "Smart matching",
  "landing.f1b": "Hybrid retrieval — semantic + keyword + spatial, fused with RRF.",
  "landing.f2t": "AI lead triage",
  "landing.f2b": "An LLM turns a free-text enquiry into a structured brief and matches it.",
  "landing.f3t": "Viewing routes",
  "landing.f3b": "Travel-time matrix (OSRM) + TSP to optimise a day of viewings.",
  "landing.f4t": "Valuations & visual search",
  "landing.f4b": "Comparable-sales AVM and CLIP photo similarity.",
  "landing.explore": "Explore the map →",
  "cta.signin": "Sign in",
  "cta.cv": "↓ CV",
  "links.portfolio": "Portfolio",
  "links.source": "Source",
  // topbar / nav
  "tb.triage": "✦ Triage lead",
  "tb.property": "+ Property",
  "tb.signout": "Sign out",
  "tb.searchPlaceholder": "Describe the property a buyer wants…  (press Enter)",
  "tb.visualPlaceholder": "Describe how it should look…  (visual search, Enter)",
  "nav.discover": "Discover",
  "nav.leads": "Leads",
  // filters / panels
  "filters.title": "Filters",
  "filters.anyType": "Any type",
  "filters.maxPrice": "Max zł",
  "filters.beds": "Beds (est.)",
  "filters.near": "Near map",
  "btn.search": "Search",
  "btn.searching": "Searching…",
  "panel.listings": "Listings",
  "panel.matches": "Matches",
  "panel.leadInbox": "Lead inbox",
  "onmap": "on map",
};

const pl: Dict = {
  "landing.title": "Narzędzie operacyjne AI dla polskiej agencji nieruchomości",
  "landing.lead":
    "Inteligentne dopasowanie ofert, triaging leadów przez LLM, optymalizacja tras oglądań, automatyczne wyceny i wyszukiwanie wizualne CLIP — na jednej mapie, w 100% darmowym stacku.",
  "landing.speech":
    "Cześć, jestem Ivetta 👋 — front-end / full-stack developerka (React · Next.js · TypeScript · Node). Buduję produkcyjne aplikacje geoprzestrzenne i AI. Oto Domus — mój projekt portfolio.",
  "landing.f1t": "Inteligentne dopasowanie",
  "landing.f1b": "Wyszukiwanie hybrydowe — semantyczne + słowa kluczowe + przestrzenne, łączone przez RRF.",
  "landing.f2t": "Triaging leadów AI",
  "landing.f2b": "LLM zamienia zapytanie w ustrukturyzowany brief i dopasowuje oferty.",
  "landing.f3t": "Trasy oglądań",
  "landing.f3b": "Macierz czasów przejazdu (OSRM) + TSP do optymalizacji dnia oglądań.",
  "landing.f4t": "Wyceny i wyszukiwanie wizualne",
  "landing.f4b": "Wycena na bazie porównań sprzedaży i podobieństwo zdjęć CLIP.",
  "landing.explore": "Zobacz mapę →",
  "cta.signin": "Zaloguj się",
  "cta.cv": "↓ CV",
  "links.portfolio": "Portfolio",
  "links.source": "Kod źródłowy",
  "tb.triage": "✦ Zgłoszenie",
  "tb.property": "+ Nieruchomość",
  "tb.signout": "Wyloguj",
  "tb.searchPlaceholder": "Opisz, czego szuka kupujący…  (Enter)",
  "tb.visualPlaceholder": "Opisz, jak ma wyglądać…  (wyszukiwanie wizualne, Enter)",
  "nav.discover": "Odkrywaj",
  "nav.leads": "Leady",
  "filters.title": "Filtry",
  "filters.anyType": "Dowolny typ",
  "filters.maxPrice": "Maks. zł",
  "filters.beds": "Pokoje (szac.)",
  "filters.near": "W pobliżu",
  "btn.search": "Szukaj",
  "btn.searching": "Szukam…",
  "panel.listings": "Oferty",
  "panel.matches": "Dopasowania",
  "panel.leadInbox": "Skrzynka leadów",
  "onmap": "na mapie",
};

const uk: Dict = {
  "landing.title": "AI-інструмент для польського агентства нерухомості",
  "landing.lead":
    "Розумний підбір обʼєктів, LLM-тріаж лідів, оптимізація маршрутів переглядів, автоматична оцінка та візуальний пошук CLIP — на одній мапі, на 100% безкоштовному стеку.",
  "landing.speech":
    "Привіт, я Іветта 👋 — front-end / full-stack розробниця (React · Next.js · TypeScript · Node). Будую продакшн геопросторові та AI-застосунки. Це Domus — мій портфоліо-проєкт.",
  "landing.f1t": "Розумний підбір",
  "landing.f1b": "Гібридний пошук — семантика + ключові слова + простір, обʼєднані через RRF.",
  "landing.f2t": "AI-тріаж лідів",
  "landing.f2b": "LLM перетворює вільний текст на структурований бриф і підбирає обʼєкти.",
  "landing.f3t": "Маршрути переглядів",
  "landing.f3b": "Матриця часу (OSRM) + TSP для оптимізації дня переглядів.",
  "landing.f4t": "Оцінка та візуальний пошук",
  "landing.f4b": "Оцінка за аналогами продажів і схожість фото через CLIP.",
  "landing.explore": "Відкрити мапу →",
  "cta.signin": "Увійти",
  "cta.cv": "↓ CV",
  "links.portfolio": "Портфоліо",
  "links.source": "Код",
  "tb.triage": "✦ Тріаж ліда",
  "tb.property": "+ Обʼєкт",
  "tb.signout": "Вийти",
  "tb.searchPlaceholder": "Опишіть, що шукає покупець…  (Enter)",
  "tb.visualPlaceholder": "Опишіть, як має виглядати…  (візуальний пошук, Enter)",
  "nav.discover": "Огляд",
  "nav.leads": "Ліди",
  "filters.title": "Фільтри",
  "filters.anyType": "Будь-який тип",
  "filters.maxPrice": "Макс. zł",
  "filters.beds": "Кімнати (оцін.)",
  "filters.near": "Біля мапи",
  "btn.search": "Пошук",
  "btn.searching": "Шукаю…",
  "panel.listings": "Обʼєкти",
  "panel.matches": "Збіги",
  "panel.leadInbox": "Вхідні ліди",
  "onmap": "на мапі",
};

const DICT: Record<Locale, Dict> = { en, pl, uk };

interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}
const I18nContext = createContext<Ctx>({ locale: "en", setLocale: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem("domus-locale") as Locale | null;
      if (saved && DICT[saved]) setLocaleState(saved);
      else {
        const nav = navigator.language.slice(0, 2);
        if (nav === "pl") setLocaleState("pl");
        else if (nav === "uk" || nav === "ru") setLocaleState("uk");
      }
    });
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("domus-locale", l);
  }
  const t = (key: string) => DICT[locale][key] ?? DICT.en[key] ?? key;

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

export function LangSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="lang-switch">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          className={`lang-btn${l.code === locale ? " on" : ""}`}
          onClick={() => setLocale(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
