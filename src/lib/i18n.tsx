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
  "filters.minPrice": "Min zł",
  "filters.maxPrice": "Max zł",
  "filters.beds": "Min beds",
  "filters.near": "Near map",
  "busy.matching": "Matching listings…",
  "btn.search": "Search",
  "btn.searching": "Searching…",
  "panel.listings": "Listings",
  "panel.matches": "Matches",
  "panel.leadInbox": "Lead inbox",
  "onmap": "on map",
  // common
  "common.clear": "Clear",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "search.visualHint": "Visual search: matches listings by how their photos look (CLIP), not by keywords.",
  // routing
  "route.plan": "Plan a route",
  "route.done": "Done planning",
  "route.hint": "Click listings to add stops · click the map (or drag the S pin) to set your start point.",
  "route.title": "Route",
  "route.stops": "stops",
  "route.stop": "stop",
  "route.addHint": "Click a listing’s “+ route” button to add viewing stops.",
  "route.start": "Start",
  "route.dwell": "Dwell",
  "route.roundtrip": "round trip",
  "route.startCustom": "Start: your custom point ✓ (drag the S pin to adjust)",
  "route.startCentre": "Start: map centre — click the map to set a custom start.",
  "route.optimize": "Optimize route",
  "route.optimizing": "Optimizing…",
  "route.saved": "Saved",
  "route.drive": "drive",
  "route.estimated": "Straight-line estimate — no road data for these points.",
  "route.print": "Print / save PDF",
  // add property
  "add.title": "Add a property",
  "add.sub": "Saved to your listings (badged “Yours”) and shown on your map alongside the shared catalogue.",
  "add.address": "Address (e.g. ul. Marszałkowska 12)",
  "add.price": "Price (zł)",
  "add.bedrooms": "Bedrooms",
  "add.area": "Area (m²)",
  "add.bathrooms": "Bathrooms",
  "add.furnished": "Furnished",
  "add.desc": "Description (optional)",
  "add.saving": "Adding…",
  "add.submit": "Add property",
  // triage
  "triage.title": "Triage a lead enquiry",
  "triage.sub": "Paste a buyer’s message — the LLM extracts a structured brief and matches listings.",
  "triage.placeholder": "e.g. We’re after a 3-bedroom house in Kraków under 900k zł with a garden — definitely not a studio or a new build.",
  "triage.run": "Triage & match",
  "triage.running": "Triaging…",
  // lead form / inbox
  "lead.newBtn": "+ New",
  "lead.new": "New lead",
  "lead.edit": "Edit lead",
  "lead.contact": "Contact (name / email)",
  "lead.enquiry": "Enquiry — e.g. ‘2-room apartment in Kraków under 700k zł, needs a balcony’",
  "lead.hint": "Saved with an LLM-extracted brief so it matches on open.",
  "lead.save": "Save changes",
  "lead.add": "Add lead",
  "inbox.loading": "Loading leads…",
  "inbox.empty": "No leads yet — triage an enquiry or add one.",
  // valuation
  "val.valuing": "Valuing…",
  "val.title": "Valuation",
  "val.estTitle": "Estimated value",
  "val.range": "range",
  "val.confidence": "confidence",
  "val.comps": "comps",
  "val.actual": "actual",
  "val.err": "err",
  "val.compsHead": "Comparable sales (weighted)",
  "brief.head": "Extracted brief",
  "list.empty": "No matches.",
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
  "filters.minPrice": "Min zł",
  "filters.maxPrice": "Maks. zł",
  "filters.beds": "Min pokoi",
  "filters.near": "W pobliżu",
  "busy.matching": "Dopasowuję oferty…",
  "btn.search": "Szukaj",
  "btn.searching": "Szukam…",
  "panel.listings": "Oferty",
  "panel.matches": "Dopasowania",
  "panel.leadInbox": "Skrzynka leadów",
  "onmap": "na mapie",
  "common.clear": "Wyczyść",
  "common.cancel": "Anuluj",
  "common.close": "Zamknij",
  "search.visualHint": "Wyszukiwanie wizualne: dopasowuje oferty po wyglądzie zdjęć (CLIP), nie po słowach.",
  "route.plan": "Zaplanuj trasę",
  "route.done": "Zakończ planowanie",
  "route.hint": "Klikaj oferty, aby dodać przystanki · kliknij mapę (lub przeciągnij pin S), aby ustawić punkt startu.",
  "route.title": "Trasa",
  "route.stops": "przystanków",
  "route.stop": "przystanek",
  "route.addHint": "Kliknij przycisk „+ route” przy ofercie, aby dodać przystanki.",
  "route.start": "Start",
  "route.dwell": "Postój",
  "route.roundtrip": "w obie strony",
  "route.startCustom": "Start: Twój punkt ✓ (przeciągnij pin S, aby zmienić)",
  "route.startCentre": "Start: środek mapy — kliknij mapę, aby ustawić własny start.",
  "route.optimize": "Optymalizuj trasę",
  "route.optimizing": "Optymalizuję…",
  "route.saved": "Zaoszczędzono",
  "route.drive": "jazdy",
  "route.estimated": "Szacunek w linii prostej — brak danych drogowych dla tych punktów.",
  "route.print": "Drukuj / zapisz PDF",
  "add.title": "Dodaj nieruchomość",
  "add.sub": "Zapisane w Twoich ofertach (oznaczone „Yours”) i pokazane na mapie obok wspólnego katalogu.",
  "add.address": "Adres (np. ul. Marszałkowska 12)",
  "add.price": "Cena (zł)",
  "add.bedrooms": "Sypialnie",
  "add.area": "Powierzchnia (m²)",
  "add.bathrooms": "Łazienki",
  "add.furnished": "Umeblowane",
  "add.desc": "Opis (opcjonalnie)",
  "add.saving": "Dodaję…",
  "add.submit": "Dodaj nieruchomość",
  "triage.title": "Analiza zapytania leada",
  "triage.sub": "Wklej wiadomość kupującego — LLM tworzy ustrukturyzowany brief i dopasowuje oferty.",
  "triage.placeholder": "np. Szukamy domu 3-pokojowego w Krakowie do 900k zł z ogrodem — na pewno nie kawalerka ani nowe budownictwo.",
  "triage.run": "Analizuj i dopasuj",
  "triage.running": "Analizuję…",
  "lead.newBtn": "+ Nowy",
  "lead.new": "Nowy lead",
  "lead.edit": "Edytuj leada",
  "lead.contact": "Kontakt (imię / e-mail)",
  "lead.enquiry": "Zapytanie — np. „mieszkanie 2-pokojowe w Krakowie do 700k zł, z balkonem”",
  "lead.hint": "Zapisane z briefem od LLM, więc dopasowuje się przy otwarciu.",
  "lead.save": "Zapisz zmiany",
  "lead.add": "Dodaj leada",
  "inbox.loading": "Ładuję leady…",
  "inbox.empty": "Brak leadów — przeanalizuj zapytanie lub dodaj nowego.",
  "val.valuing": "Wyceniam…",
  "val.title": "Wycena",
  "val.estTitle": "Szacowana wartość",
  "val.range": "zakres",
  "val.confidence": "pewność",
  "val.comps": "porównań",
  "val.actual": "rzeczywista",
  "val.err": "błąd",
  "val.compsHead": "Porównywalne transakcje (ważone)",
  "brief.head": "Wyodrębniony brief",
  "list.empty": "Brak dopasowań.",
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
  "filters.minPrice": "Мін. zł",
  "filters.maxPrice": "Макс. zł",
  "filters.beds": "Мін. кімнат",
  "filters.near": "Біля мапи",
  "busy.matching": "Підбираю обʼєкти…",
  "btn.search": "Пошук",
  "btn.searching": "Шукаю…",
  "panel.listings": "Обʼєкти",
  "panel.matches": "Збіги",
  "panel.leadInbox": "Вхідні ліди",
  "onmap": "на мапі",
  "common.clear": "Очистити",
  "common.cancel": "Скасувати",
  "common.close": "Закрити",
  "search.visualHint": "Візуальний пошук: підбирає обʼєкти за виглядом фото (CLIP), а не за словами.",
  "route.plan": "Спланувати маршрут",
  "route.done": "Завершити",
  "route.hint": "Клікайте обʼєкти, щоб додати зупинки · клікніть мапу (або перетягніть пін S), щоб задати старт.",
  "route.title": "Маршрут",
  "route.stops": "зупинок",
  "route.stop": "зупинка",
  "route.addHint": "Натисніть „+ route” на обʼєкті, щоб додати зупинки.",
  "route.start": "Старт",
  "route.dwell": "Огляд",
  "route.roundtrip": "туди й назад",
  "route.startCustom": "Старт: ваша точка ✓ (перетягніть пін S, щоб змінити)",
  "route.startCentre": "Старт: центр мапи — клікніть мапу, щоб задати власний старт.",
  "route.optimize": "Оптимізувати маршрут",
  "route.optimizing": "Оптимізую…",
  "route.saved": "Заощаджено",
  "route.drive": "їзди",
  "route.estimated": "Оцінка по прямій — немає дорожніх даних для цих точок.",
  "route.print": "Друк / зберегти PDF",
  "add.title": "Додати обʼєкт",
  "add.sub": "Збережено у ваших обʼєктах (позначка „Yours”) і показано на мапі поряд зі спільним каталогом.",
  "add.address": "Адреса (напр. ul. Marszałkowska 12)",
  "add.price": "Ціна (zł)",
  "add.bedrooms": "Спальні",
  "add.area": "Площа (m²)",
  "add.bathrooms": "Санвузли",
  "add.furnished": "Мебльовано",
  "add.desc": "Опис (необовʼязково)",
  "add.saving": "Додаю…",
  "add.submit": "Додати обʼєкт",
  "triage.title": "Аналіз запиту ліда",
  "triage.sub": "Вставте повідомлення покупця — LLM формує структурований бриф і підбирає обʼєкти.",
  "triage.placeholder": "напр. Шукаємо будинок на 3 спальні у Кракові до 900k zł із садом — точно не студія і не новобудова.",
  "triage.run": "Аналіз і підбір",
  "triage.running": "Аналізую…",
  "lead.newBtn": "+ Новий",
  "lead.new": "Новий лід",
  "lead.edit": "Редагувати лід",
  "lead.contact": "Контакт (імʼя / e-mail)",
  "lead.enquiry": "Запит — напр. „2-кімнатна квартира у Кракові до 700k zł, потрібен балкон”",
  "lead.hint": "Зберігається з брифом від LLM, тож підбір спрацьовує при відкритті.",
  "lead.save": "Зберегти зміни",
  "lead.add": "Додати лід",
  "inbox.loading": "Завантажую ліди…",
  "inbox.empty": "Ще немає лідів — проаналізуйте запит або додайте новий.",
  "val.valuing": "Оцінюю…",
  "val.title": "Оцінка",
  "val.estTitle": "Оцінена вартість",
  "val.range": "діапазон",
  "val.confidence": "впевненість",
  "val.comps": "порівнянь",
  "val.actual": "фактична",
  "val.err": "похибка",
  "val.compsHead": "Порівнянні продажі (зважені)",
  "brief.head": "Виділений бриф",
  "list.empty": "Немає збігів.",
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
