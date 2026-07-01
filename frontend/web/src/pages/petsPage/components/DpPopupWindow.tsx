import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type DpPopupWindowSize = "default" | "compact" | "large" | "wide";

type DpPopupWindowProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  size?: DpPopupWindowSize;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function DpPopupWindow({
  open,
  onClose,
  label,
  size = "default",
  className = "",
  contentClassName = "",
  children,
}: DpPopupWindowProps) {
  const windowRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previousActiveElement = document.activeElement;
    const popupWindow = windowRef.current;

    requestAnimationFrame(() => {
      const focusableElements = Array.from(
        popupWindow?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );

      (focusableElements[0] ?? popupWindow)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !popupWindow) return;

      const focusableElements = Array.from(
        popupWindow.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        popupWindow.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const windowClassName = [
    "dpPopupWindow",
    size !== "default" ? `dpPopupWindow--${size}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const contentClassNames = ["dpPopupWindowContent", contentClassName]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      className="dpPopupWindowBackdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        ref={windowRef}
        className={windowClassName}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={contentClassNames}>{children}</div>
      </section>
    </div>,
    document.body,
  );
}
