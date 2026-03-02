import type { PropsWithChildren, ReactNode } from "react";
import "./NotebookPaper.css";

type NotebookPaperProps = PropsWithChildren<{
  title?: string;
  className?: string;
  minHeight?: number | string;

  /** Optional footer content (links, donate button, hints, etc.) */
  footer?: ReactNode;

  /** Optional: label for the footer region (a11y) */
  footerAriaLabel?: string;
}>;

export function NotebookPaper({
  title,
  className = "",
  minHeight,
  children,
  footer,
  footerAriaLabel = "Notebook footer",
}: NotebookPaperProps) {
  const style =
    minHeight == null
      ? undefined
      : {
          minHeight:
            typeof minHeight === "number" ? `${minHeight}px` : minHeight,
        };

  const hasFooter = footer != null;

  return (
    <section
      className={["dp-paper", className].filter(Boolean).join(" ")}
      style={style}
      aria-label={title ? `Notebook: ${title}` : "Notebook"}
    >
      {/* paper-only scratches overlay */}
      <div className="dp-paperScratchMount" aria-hidden="true" />

      {title ? <div className="dp-paperTitle">{title}</div> : null}

      <div className="dp-paperBody">{children}</div>

      {hasFooter ? (
        <div className="dp-paperFooter" aria-label={footerAriaLabel}>
          {footer}
        </div>
      ) : null}
    </section>
  );
}
