import { useState } from "react";
import { useAnnouncements, type AnnouncementItem } from "./useAnnouncements";
import "./AnnouncementPanel.css";

type AnnouncementsPanelProps = {
  className?: string;
  pageScope?: string;
  title?: string;
  subtitle?: string;
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
  title = "Aliune News Δ",
  subtitle = "Click Below to read the Newest Transmission",
}: AnnouncementsPanelProps) {
  const { items, loading, error, usingFallback } = useAnnouncements(
    6,
    pageScope,
  );
  const [selected, setSelected] = useState<AnnouncementItem | null>(null);

  const newest = items[0] ?? null;
  const archive = items.slice(1, 6);

  function openAnnouncement(item: AnnouncementItem) {
    setSelected(item);
  }

  function handleFeaturedKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
    item: AnnouncementItem,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAnnouncement(item);
    }
  }

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
          {loading && items.length === 0 ? (
            <p className="anp-status">Loading announcements…</p>
          ) : null}

          {!loading && error && items.length === 0 ? (
            <p className="anp-status">Could not load announcements.</p>
          ) : null}

          {!loading && !newest ? (
            <p className="anp-status">No announcements yet.</p>
          ) : null}

          {usingFallback ? (
            <p className="anp-status">Showing fallback news feed.</p>
          ) : null}

          {newest ? (
            <article
              className="anp-featured"
              aria-label={newest.title}
              role="button"
              tabIndex={0}
              onClick={() => openAnnouncement(newest)}
              onKeyDown={(event) => handleFeaturedKeyDown(event, newest)}
            >
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

            <h3 id="aliune-news-modal-title" className="anp-modalTitle">
              News and Events
            </h3>
            <hr className="anp-modalRule" />

            <h4 className="anp-modalTitle anp-modalEntryTitle">
              {selected.title}
            </h4>
            <p className="anp-modalDate">{formatDate(selected.created_at)}</p>
            <p className="anp-modalBody">{selected.body || "No message."}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
