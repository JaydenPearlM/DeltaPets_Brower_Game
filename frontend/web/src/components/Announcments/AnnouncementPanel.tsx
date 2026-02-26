import { NotebookPaper } from "./NotebookPaper";
import { useAnnouncements } from "./useAnnouncements";
import { MarkdownBody } from "../../markdown/MarkdownBody";
import { DonateButton } from "../Real_Money/DonateButton";

type AnnouncementsPanelProps = {
  limit?: number;
  className?: string;
  minHeight?: number | string;
};

function formatDateTime(dateString: string) {
  const date = new Date(dateString);

  const datePart = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();

  return `${datePart} : ${timePart}`;
}

export function AnnouncementsPanel({
  limit = 5,
  className = "",
  minHeight = 260,
}: AnnouncementsPanelProps) {
  const { items = [], loading, error } = useAnnouncements(limit);

  const newest = items[0];
  const titleDate = newest?.created_at
    ? formatDateTime(newest.created_at)
    : "—";

  return (
    <NotebookPaper
      title={`Announcements : ${titleDate}`}
      className={className}
      minHeight={minHeight}
    >
      <>
        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading…</div>
        ) : error ? (
          <div style={{ opacity: 0.85 }}>Could not load announcements.</div>
        ) : items.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No announcements yet.</div>
        ) : (
          <ul className="homeList">
            {items.map((a: any) => (
              <li key={a.id}>
                <strong>{a.title}</strong>

                {/* Optional: show per-announcement timestamp */}
                {a.created_at ? (
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>
                    {formatDateTime(a.created_at)}
                  </div>
                ) : null}

                {/* ✅ Markdown body (two-column newspaper) */}
                <div className="homeNote">
                  <MarkdownBody
                    content={a.body ?? ""}
                    className="dp-markdown dp-newspaper"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* ✅ Permanent Donate Button (always visible in notebook) */}
        <div className="dp-paperFooter">
          <DonateButton />
        </div>
      </>
    </NotebookPaper>
  );
}
