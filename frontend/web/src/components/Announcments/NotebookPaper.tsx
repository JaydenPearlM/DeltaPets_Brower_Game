import type { PropsWithChildren } from "react";
import "./NotebookPaper.css";

type NotebookPaperProps = PropsWithChildren<{
  title?: string;
  className?: string;
  minHeight?: number | string;
}>;

export function NotebookPaper({
  title,
  className = "",
  minHeight,
  children,
}: NotebookPaperProps) {
  const style =
    minHeight == null
      ? undefined
      : {
          minHeight:
            typeof minHeight === "number" ? `${minHeight}px` : minHeight,
        };

  return (
    <section className={`dp-paper dp-paper--torn ${className}`} style={style}>
      {title ? <div className="dp-paperTitle">{title}</div> : null}
      <div className="dp-paperBody">{children}</div>
    </section>
  );
}
