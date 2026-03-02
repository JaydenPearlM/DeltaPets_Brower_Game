import { NotebookPaper } from "./NotebookPaper";
import { useAnnouncements } from "./useAnnouncements";
import { MarkdownBody } from "../../markdown/MarkdownBody";
import { DonateButton } from "../Real_Money/DonateButton";

type AnnouncementsPanelProps = {
  className?: string;
  minHeight?: number | string;
};

type Announcement = {
  id: string;
  title: string;
  body?: string | null;
  created_at?: string | null;
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
  className = "",
  minHeight = 240,
}: AnnouncementsPanelProps) {
  const { items = [], loading, error } = useAnnouncements(1);

  const newest = (items as Announcement[])[0];

  const titleDate = newest?.created_at ? formatDateTime(newest.created_at) : "";
  const panelTitle = titleDate ? `🜂 DeltaPets : ${titleDate}` : "🜂 DeltaPets";

  // Only Supabase content goes inside the panel
  const body = newest?.body ?? "";

  return (
    <NotebookPaper
      title={panelTitle}
      className={className}
      minHeight={minHeight}
      footer={<DonateButton />}
      footerAriaLabel="Support DeltaPets"
    >
      {loading ? (
        <div style={{ opacity: 0.8 }}>Loading…</div>
      ) : error ? (
        <div style={{ opacity: 0.85 }}>Could not load announcements.</div>
      ) : !newest ? (
        <div style={{ opacity: 0.75 }}>No announcements yet.</div>
      ) : (
        <div className="dp-annSingle">
          {/* Optional: show the Supabase title as a heading. Remove if you don't want it. */}
          {newest.title ? (
            <div className="dp-annHeading">{newest.title}</div>
          ) : null}

          <div className="dp-annBody">
            <MarkdownBody content={body} className="dp-markdown" />
          </div>
        </div>
      )}
    </NotebookPaper>
  );
}
