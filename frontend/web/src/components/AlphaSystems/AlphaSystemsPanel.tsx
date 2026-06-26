import { useState } from "react";
import { useAlphaSystems } from "./useAlphaSystems";
import { usePatchNotes } from "./usePatchNotes";
import "./AlphaSystemsPanel.css";

type Props = {
  className?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

function toBulletItems(value?: string | null): string[] {
  if (!value) return [];

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-\s*/, ""));
}

export function AlphaSystemsPanel({ className = "" }: Props) {
  const { items, loading: systemsLoading } = useAlphaSystems();
  const { patch, loading: patchLoading } = usePatchNotes();
  const [view, setView] = useState<"systems" | "patches">("systems");

  return (
    <section className={`alpha-panel dp-standard-panel-purple ${className}`}>
      <div className="alpha-header">
        <h2 className="alpha-title">
          {view === "systems" ? "Alpha Current" : "Patch Notes"}
        </h2>

        <button
          className="alpha-button"
          onClick={() => setView(view === "systems" ? "patches" : "systems")}
          type="button"
        >
          {view === "systems" ? "View Patches" : "Back to Systems"}
        </button>
      </div>

      <div className="alpha-body">
        {view === "systems" && (
          <>
            {systemsLoading && <p className="alpha-status">Loading systems…</p>}

            {!systemsLoading && items.length === 0 && (
              <p className="alpha-status">No systems yet.</p>
            )}

            {!systemsLoading && items.length > 0 && (
              <>
                <div className="alpha-tableHeader">
                  <span>System</span>
                  <span>Description</span>
                  <span>Date</span>
                </div>

                <div className="alpha-table">
                  {items.map((item) => (
                    <div key={item.id} className="alpha-row">
                      <span className="alpha-name">{item.title}</span>

                      <span className="alpha-desc">
                        {item.description || ""}
                      </span>

                      <span className="alpha-date">
                        {formatDate(item.released_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {view === "patches" && (
          <>
            {patchLoading && <p className="alpha-status">Loading patches…</p>}

            {!patchLoading && !patch && (
              <p className="alpha-status">No published patch notes yet.</p>
            )}

            {!patchLoading && patch && (
              <div className="alpha-patchView">
                <div className="alpha-patchMeta">
                  <div className="alpha-patchMetaTop">
                    <span className="alpha-patchVersion">{patch.version}</span>
                    <span className="alpha-patchReleased">
                      {formatDate(patch.released_at)}
                    </span>
                  </div>

                  <h3 className="alpha-patchTitle">{patch.title}</h3>

                  {patch.summary ? (
                    <p className="alpha-patchSummary">{patch.summary}</p>
                  ) : null}
                </div>

                <div className="alpha-patchTable">
                  <div className="alpha-patchTableHeader">
                    <span>New</span>
                    <span>Updated</span>
                    <span>Fixed</span>
                    <span>Notes</span>
                  </div>

                  <div className="alpha-patchTableRow">
                    <div className="alpha-patchTableCell">
                      {toBulletItems(patch.new_notes).length > 0 ? (
                        <ul className="alpha-patchList">
                          {toBulletItems(patch.new_notes).map((item, index) => (
                            <li key={`new-${index}`}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="alpha-patchEmpty"></p>
                      )}
                    </div>

                    <div className="alpha-patchTableCell">
                      {toBulletItems(patch.updated_notes).length > 0 ? (
                        <ul className="alpha-patchList">
                          {toBulletItems(patch.updated_notes).map(
                            (item, index) => (
                              <li key={`updated-${index}`}>{item}</li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="alpha-patchEmpty"></p>
                      )}
                    </div>

                    <div className="alpha-patchTableCell">
                      {toBulletItems(patch.fixed_notes).length > 0 ? (
                        <ul className="alpha-patchList">
                          {toBulletItems(patch.fixed_notes).map(
                            (item, index) => (
                              <li key={`fixed-${index}`}>{item}</li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="alpha-patchEmpty"></p>
                      )}
                    </div>

                    <div className="alpha-patchTableCell">
                      {toBulletItems(patch.notes).length > 0 ? (
                        <ul className="alpha-patchList">
                          {toBulletItems(patch.notes).map((item, index) => (
                            <li key={`notes-${index}`}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="alpha-patchEmpty"></p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
