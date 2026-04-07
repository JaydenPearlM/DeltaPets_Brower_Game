import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import "./nextLogsPanel.css";

type Page = 0 | 1 | 2;
type LogCategory = "complete" | "coming_next" | "patch";

type LogRow = {
  id: string;
  category: LogCategory;
  title: string;
  description: string | null;
  patch_html: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
};

type NextLogsPanelProps = {
  className?: string;
};

function formatDate(dateString: string | null) {
  if (!dateString) return "Unknown date";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function NextLogsPanel({ className = "" }: NextLogsPanelProps) {
  const [page, setPage] = useState<Page>(0);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [activePatch, setActivePatch] = useState<LogRow | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadLogs() {
      setLoading(true);
      setErrorText("");

      const { data, error } = await supabase
        .from("homepage_logs")
        .select("category, title, description")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[homepage_logs] query failed:", error);
      } else {
        console.log("[homepage_logs] query ok:", data);
      }

      if (!alive) return;

      if (error) {
        console.error("homepage_logs fetch error:", error);
        setRows([]);
        setErrorText(error.message || "Could not load homepage logs.");
        setLoading(false);
        return;
      }

      setRows((data as LogRow[]) ?? []);
      setLoading(false);
    }

    loadLogs();

    return () => {
      alive = false;
    };
  }, []);

  const completeLogs = useMemo(
    () => rows.filter((row) => row.category === "complete"),
    [rows],
  );

  const nextLogs = useMemo(
    () => rows.filter((row) => row.category === "coming_next"),
    [rows],
  );

  const patchLogs = useMemo(
    () => rows.filter((row) => row.category === "patch"),
    [rows],
  );

  function prev() {
    setPage((current) => (current === 0 ? 2 : ((current - 1) as Page)));
  }

  function next() {
    setPage((current) => (current === 2 ? 0 : ((current + 1) as Page)));
  }

  function renderStateRow(message: string) {
    return (
      <li className="nextLogsItem">
        <div className="nextLogsTextBlock">
          <span className="label">{message}</span>
        </div>
      </li>
    );
  }

  function renderStandardList(
    items: LogRow[],
    emptyText: string,
    showCheck = false,
  ) {
    if (loading) {
      return <ul className="nextLogsList">{renderStateRow("Loading...")}</ul>;
    }

    if (errorText) {
      return <ul className="nextLogsList">{renderStateRow(errorText)}</ul>;
    }

    if (items.length === 0) {
      return <ul className="nextLogsList">{renderStateRow(emptyText)}</ul>;
    }

    return (
      <ul className="nextLogsList">
        {items.map((item) => (
          <li key={item.id} className="nextLogsItem">
            {showCheck ? <span className="check">✓</span> : null}

            <div className="nextLogsTextBlock">
              <span className="label labelTitle">{item.title}</span>

              {item.description ? (
                <span className="labelSubtext">{item.description}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  function renderPatchList(items: LogRow[]) {
    if (loading) {
      return <ul className="nextLogsList">{renderStateRow("Loading...")}</ul>;
    }

    if (errorText) {
      return <ul className="nextLogsList">{renderStateRow(errorText)}</ul>;
    }

    if (items.length === 0) {
      return (
        <ul className="nextLogsList">
          {renderStateRow("No patch notes yet.")}
        </ul>
      );
    }

    return (
      <ul className="nextLogsList">
        {items.map((patch) => (
          <li key={patch.id} className="nextLogsItem nextLogsItem--patch">
            <button
              type="button"
              className="patchRowBtn"
              onClick={() => setActivePatch(patch)}
            >
              <div className="patchRowTop">
                <span className="patchRowTitle">{patch.title}</span>
                <span className="patchRowDate">
                  {formatDate(patch.created_at)}
                </span>
              </div>

              {patch.description ? (
                <div className="patchRowDesc">{patch.description}</div>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <div className={`nextLogsOuterPanel ${className}`.trim()}>
        <div className="nextLogsInnerPanel">
          <div className="nextLogsHeader">
            <div className="alphaTitleRow">
              <h3 className="alphaTitle">
                {page === 0 && "What's Complete"}
                {page === 1 && "What's Coming Next"}
                {page === 2 && "Deployment & Patch Notes"}
              </h3>

              <span className="alphaVersion">ALPHA v0.0.1</span>
            </div>

            <div className="taglineRow">
              <p className="alphaTagline">
                {page === 0 && "Systems that are stable and live."}
                {page === 1 && "Features currently under development."}
                {page === 2 && "Release pipeline + what changed when."}
              </p>
            </div>
          </div>

          {page === 0 &&
            renderStandardList(completeLogs, "No completed systems yet.", true)}

          {page === 1 &&
            renderStandardList(nextLogs, "Nothing queued yet.", false)}

          {page === 2 && renderPatchList(patchLogs)}

          <div className="nextLogsPager">
            <button type="button" className="nextLogsArrow" onClick={prev}>
              ←
            </button>

            <div className="nextLogsDots" aria-hidden="true">
              <span className={`nextLogsDot ${page === 0 ? "active" : ""}`} />
              <span className={`nextLogsDot ${page === 1 ? "active" : ""}`} />
              <span className={`nextLogsDot ${page === 2 ? "active" : ""}`} />
            </div>

            <button type="button" className="nextLogsArrow" onClick={next}>
              →
            </button>
          </div>
        </div>
      </div>

      {activePatch && (
        <div
          className="patchModalOverlay"
          onClick={() => setActivePatch(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="patch-modal-title"
        >
          <div className="patchModal" onClick={(e) => e.stopPropagation()}>
            <div className="patchModalHeader">
              <div>
                <h2 id="patch-modal-title" className="patchModalTitle">
                  {activePatch.title}
                </h2>
                <p className="patchModalMeta">
                  Released {formatDate(activePatch.created_at)}
                </p>
              </div>

              <button
                type="button"
                className="patchClose"
                onClick={() => setActivePatch(null)}
              >
                Close
              </button>
            </div>

            {activePatch.description ? (
              <p className="patchModalDesc">{activePatch.description}</p>
            ) : null}

            <div
              className="patchContent"
              dangerouslySetInnerHTML={{
                __html:
                  activePatch.patch_html?.trim() || "<p>No patch body yet.</p>",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
