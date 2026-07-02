import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { currentUserEmail } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FEATURES = [
  ["🔎", "Smart matching", "Hybrid retrieval — semantic + keyword + spatial, fused with RRF."],
  ["✦", "AI lead triage", "An LLM turns a free-text enquiry into a structured brief and matches it."],
  ["🚗", "Viewing routes", "Travel-time matrix (OSRM) + TSP to optimise a day of viewings."],
  ["◇", "Valuations & visual search", "Comparable-sales AVM and CLIP photo similarity."],
];

export default async function Landing() {
  const email = await currentUserEmail();
  if (email) redirect("/map");

  return (
    <main className="landing">
      <section className="landing-copy">
        <div className="brand" style={{ fontSize: 22 }}>
          <Logo size={30} />
          Domus
        </div>
        <h1 className="landing-title">
          AI operations tool for a Polish real-estate agency
        </h1>
        <p className="landing-lead">
          Smart property matching, LLM lead triage, viewing-route optimisation, automated
          valuations and CLIP visual search — over one map, on a 100% free stack (Next.js ·
          Postgres/PostGIS/pgvector · OSRM · Gemini · Transformers.js).
        </p>

        <ul className="landing-feats">
          {FEATURES.map(([icon, title, body]) => (
            <li key={title}>
              <span className="lf-icon">{icon}</span>
              <div>
                <div className="lf-title">{title}</div>
                <div className="lf-body">{body}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="landing-cta">
          <Link href="/map" className="btn big">Explore the map →</Link>
          <Link href="/login" className="btn ghost big">Sign in</Link>
          <a href="/IvettaDashkova_CV.pdf" download className="btn ghost big">↓ CV</a>
        </div>

        <div className="landing-links">
          <a href="https://github.com/IvettaDashkova" target="_blank" rel="noreferrer">Portfolio</a>
          <span>·</span>
          <a href="https://github.com/IvettaDashkova/domus" target="_blank" rel="noreferrer">Source</a>
          <span>·</span>
          <a href="https://linkedin.com/in/ivettadashkova" target="_blank" rel="noreferrer">LinkedIn</a>
          <span>·</span>
          <a href="mailto:ivettadashkovafsd@gmail.com">Email</a>
        </div>
      </section>

      <section className="landing-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="landing-photo" src="/ivetta.jpg" alt="Ivetta Dashkova" />
        <div className="speech">
          <b>Hi, I&apos;m Ivetta</b> 👋 — a front-end / full-stack developer (React · Next.js ·
          TypeScript · Node). I build production geospatial &amp; AI apps. Meet <b>Domus</b> — my
          portfolio project.
        </div>
      </section>
    </main>
  );
}
