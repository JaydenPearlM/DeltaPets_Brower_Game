import { useMemo, useState } from "react";
import { useAnnouncements } from "./useAnnouncements";
import "./AnnouncementPanel.css";

type AnnouncementsPanelProps = {
  className?: string;
  pageScope?: string;
  title?: string;
  subtitle?: string;
};

type Announcement = {
  id: string;
  title: string;
  body?: string | null;
  created_at?: string | null;
};

function formatDate(dateString?: string | null) {
  if (!dateString) return "Unknown date";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function AnnouncementPanel({
  className = "",
  pageScope = "homepage",
  title = "Aliune News",
  subtitle = "Latest transmissions from the world",
}: AnnouncementsPanelProps) {
  const { items = [], loading, error } = useAnnouncements(6, pageScope);
  const [selected, setSelected] = useState<Announcement | null>(null);

  const normalized = useMemo<Announcement[]>(() => {
    return (items as Announcement[]).map((item) => ({
      id: item.id,
      title: item.title ?? "Untitled update",
      body: item.body ?? "",
      created_at: item.created_at ?? null,
    }));
  }, [items]);

  const newest = normalized[0] ?? null;
  const archive = normalized.slice(1, 6);

  return (
    <>
      <section
        className={["anp-panel", className].filter(Boolean).join(" ")}
        aria-label={title}
      >
        <div className="anp-header">
          <h2 className="anp-title">{title}</h2>
          <p className="anp-subtitle">{subtitle}</p>
        </div>

        <div className="anp-body">
          {loading && normalized.length === 0 ? (
            <p className="anp-status">Loading announcements…</p>
          ) : null}

          {!loading && error && normalized.length === 0 ? (
            <p className="anp-status">Could not load announcements.</p>
          ) : null}

          {!loading && !error && !newest ? (
            <p className="anp-status">No announcements yet.</p>
          ) : null}

          {newest ? (
            <article className="anp-featured" aria-label={newest.title}>
              <span className="anp-featuredEyebrow">Newest Transmission</span>
              <h3 className="anp-featuredTitle">{newest.title}</h3>
              <p className="anp-featuredDate">
                {formatDate(newest.created_at)}
              </p>
              {newest.body ? (
                <p className="anp-featuredBody">{newest.body}</p>
              ) : null}
            </article>
          ) : null}

          {archive.length > 0 ? (
            <div className="anp-archiveWrap">
              <h3 className="anp-archiveHeading">Past Announcements</h3>

              <ul className="anp-archiveList">
                {archive.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="anp-archiveItem"
                      onClick={() => setSelected(item)}
                    >
                      <span className="anp-archiveTitle">{item.title}</span>
                      <span className="anp-archiveDate">
                        {formatDate(item.created_at)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {selected ? (
        <div
          className="anp-modalBackdrop"
          role="presentation"
          onClick={() => setSelected(null)}
        >
          <div
            className="anp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aliune-news-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="anp-modalClose"
              aria-label="Close announcement"
              onClick={() => setSelected(null)}
            >
              ×
            </button>

            <p className="anp-modalEyebrow">Aliune Archive</p>
            <h3 id="aliune-news-modal-title" className="anp-modalTitle">
              {selected.title}
            </h3>
            <p className="anp-modalDate">{formatDate(selected.created_at)}</p>
            <p className="anp-modalBody">{selected.body || "No message."}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
