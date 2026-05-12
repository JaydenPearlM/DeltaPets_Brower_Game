import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import "./popupWindow.css";

type PopupWindowProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
};

export function PopupWindow({
  isOpen,
  onClose,
  children,
  className = "",
  labelledBy,
}: PopupWindowProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="dpPopupWindowBackdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className={`dpPopupWindow ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dpPopupWindowContent">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

export default PopupWindow;
