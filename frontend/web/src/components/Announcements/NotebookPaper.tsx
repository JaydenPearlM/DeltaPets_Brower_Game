import type { PropsWithChildren, ReactNode } from "react";
import "./NotebookPaper.css";

type NotebookPaperProps = PropsWithChildren<{
  title?: string;
  className?: string;
  minHeight?: number | string;
  footer?: ReactNode;
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
      <div className="dp-paperScratches" aria-hidden="true" />

      {title ? (
        <header className="dp-paperHeader">
          <h3 className="dp-paperTitle">{title}</h3>
        </header>
      ) : null}

      <div className="dp-paperBody">{children}</div>

      {hasFooter ? (
        <footer className="dp-paperFooter" aria-label={footerAriaLabel}>
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
