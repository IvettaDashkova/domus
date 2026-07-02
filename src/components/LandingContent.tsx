"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useI18n, LangSwitcher } from "@/lib/i18n";

const FEATURES: [string, string, string][] = [
  ["🔎", "landing.f1t", "landing.f1b"],
  ["✦", "landing.f2t", "landing.f2b"],
  ["🚗", "landing.f3t", "landing.f3b"],
  ["◇", "landing.f4t", "landing.f4b"],
];

export default function LandingContent() {
  const { t } = useI18n();
  return (
    <main className="landing-bg">
      <div className="landing">
      <section className="landing-copy">
        <div className="landing-top">
          <div className="brand" style={{ fontSize: 22 }}>
            <Logo size={30} />
            Domus
          </div>
          <LangSwitcher />
        </div>
        <h1 className="landing-title">{t("landing.title")}</h1>
        <p className="landing-lead">{t("landing.lead")}</p>

        <ul className="landing-feats">
          {FEATURES.map(([icon, tk, bk]) => (
            <li key={tk}>
              <span className="lf-icon">{icon}</span>
              <div>
                <div className="lf-title">{t(tk)}</div>
                <div className="lf-body">{t(bk)}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="landing-cta">
          <Link href="/map" className="btn big">{t("landing.explore")}</Link>
          <Link href="/login" className="btn ghost big">{t("cta.signin")}</Link>
          <a
            href="https://portfolio.ivettadashkova.com/IvettaDashkova_Resume.pdf"
            target="_blank"
            rel="noreferrer"
            className="btn ghost big"
          >
            {t("cta.cv")}
          </a>
        </div>

        <div className="landing-links">
          <a href="https://portfolio.ivettadashkova.com/" target="_blank" rel="noreferrer">{t("links.portfolio")}</a>
          <span>·</span>
          <a href="https://github.com/IvettaDashkova/domus" target="_blank" rel="noreferrer">{t("links.source")}</a>
          <span>·</span>
          <a href="https://linkedin.com/in/ivettadashkova" target="_blank" rel="noreferrer">LinkedIn</a>
          <span>·</span>
          <a href="mailto:ivettadashkovafsd@gmail.com">Email</a>
        </div>
      </section>

      <section className="landing-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="landing-photo" src="/ivetta-hero.png" alt="Ivetta Dashkova — illustrated intro" />
      </section>
      </div>
    </main>
  );
}
