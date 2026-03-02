import "./nextLogPanel.css";

type WhatsNextItem = {
  label: string;
  tone?: "normal" | "hot" | "new";
};

type WhatsNextPanelProps = {
  title?: string;
  direction?: "right" | "left";
  subtitle?: string;
  items?: WhatsNextItem[];
  className?: string;
};

export function WhatsNextPanel({
  title = "What’s Next",
  direction = "right",
  subtitle = "Patch notes, what’s happening now, and what’s coming soon.",
  items = [
    { label: "Current focus: stability + UI polish", tone: "normal" },
    { label: "Next up: systems + progression", tone: "new" },
    { label: "Patch notes & changes live here", tone: "hot" },
  ],
  className = "",
}: WhatsNextPanelProps) {
  const arrow = direction === "left" ? "◀" : "▶";

  return (
    <section className={["dp-next", className].filter(Boolean).join(" ")}>
      <div className="dp-nextHeader">
        <div className="dp-nextTitle">{title}</div>
        <div className="dp-nextArrow" aria-hidden="true">
          {arrow}
        </div>
      </div>

      <div className="dp-nextSubtitle">{subtitle}</div>

      <div className="dp-nextBody">
        {items.map((it, idx) => (
          <div
            key={idx}
            className={["dp-nextItem", it.tone ? `is-${it.tone}` : ""].join(
              " ",
            )}
          >
            {it.label}
          </div>
        ))}
      </div>
    </section>
  );
}
