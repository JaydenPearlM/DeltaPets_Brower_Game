import { useMemo, useState } from "react";
import "./nextLogsPanel.css";

// Auto version from frontend/web/package.json
import pkg from "../../../package.json";

type Page = {
  title: string;
  tagline: string;
  items: string[];
};

type WhatsNextPanelProps = {
  className?: string;
};

export function WhatsNextPanel({ className = "" }: WhatsNextPanelProps) {
  const version =
    (pkg as any)?.version ??
    (import.meta as any)?.env?.VITE_APP_VERSION ??
    "0.0.0-alpha.0";

  const versionLabel = useMemo(() => `ALPHA v${version}`, [version]);

  const pages: Page[] = [
    {
      title: "Alpha Information",
      tagline: "Patch notes, what’s happening now, and what’s coming soon.",
      items: [
        "Tech stack locked (Frontend, Backend, Database)",
        "Data models defined (User, Sprout, Item)",
        "Project folder structure created",
        "Hosting & environment configured",
        "Alpha scope frozen",
        "Authentication (login / register)",
        "Homepage & character creation",
        "App routing & navigation",
        "Global state management",
        "Timers (hatch, dailies, cooldowns)",
        "Hatchery UI layout",
        "Egg hatch timer (5 minutes)",
        "Feed action",
        "Clean action",
        "Sit / bond action",
        "Food trough (2000 capacity)",
        "Pet hunger decay",
        "Pet runaway logic",
      ],
    },
    {
      title: "Currently Working On",
      tagline: "Active tasks in progress right now.",
      items: [
        "UI polish pass (spacing, alignment, mobile)",
        "CareRoom layout cleanup",
        "Homepage panel consistency (global.css tokens)",
        "Hatchery UX improvements",
        "Bug fixes + remove dead/legacy code",
      ],
    },
    {
      title: "Waiting / Up Next",
      tagline: "Queued tasks (Trello backlog / pending).",
      items: [
        "Pet leveling system",
        "Evolution stages + growth rules",
        "Personality bonuses applied to stats",
        "Daily quests / rewards loop",
        "Inventory + item usage",
        "CareRoom furniture buffs",
        "Element bonuses pass",
        "PvE encounters prototype",
      ],
    },
    {
      title: "Deployment & Patch Notes",
      tagline: "Release pipeline + what changed when.",
      items: [
        "Deployment checklist (env, build, migrations)",
        "Patch notes formatting (versioned changelog)",
        "Smoke tests (auth, hatch, care loop)",
        "Performance pass (bundle + lazy loading)",
        "Production sanity checks + monitoring",
      ],
    },
  ];

  const [pageIndex, setPageIndex] = useState(0);
  const page = pages[pageIndex];

  const nextPage = () => setPageIndex((i) => (i + 1) % pages.length);

  return (
    <section className={`nextLogsOuterPanel ${className}`}>
      <div className="nextLogsInnerPanel">
        <header className="nextLogsHeader">
          <div className="alphaTitleRow">
            <h2 className="alphaTitle">{page.title}</h2>
            <div className="alphaVersion">{versionLabel}</div>
          </div>

          <p className="alphaTagline">{page.tagline}</p>
        </header>

        <ul className="nextLogsList" aria-label="Alpha info list">
          {page.items.map((label, i) => (
            <li key={`${pageIndex}-${label}-${i}`} className="nextLogsItem">
              <span className="check" aria-hidden="true">
                ✔
              </span>
              <span className="label">{label}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="nextPageArrow"
          onClick={nextPage}
          aria-label="Next page"
          title="Next"
        >
          ➜
        </button>
      </div>
    </section>
  );
}
