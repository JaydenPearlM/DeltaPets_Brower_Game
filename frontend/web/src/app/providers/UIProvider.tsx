// frontend/web/src/app/providers/UIProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type UIContextValue = {
  inventoryOpen: boolean;
  inventoryLocked: boolean;
  openInventory: () => void;
  closeInventory: () => void;
  toggleInventory: () => void;
  setInventoryLocked: (locked: boolean) => void; // you’ll wire this to battle later
};

const UIContext = createContext<UIContextValue | null>(null);

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as any).isContentEditable;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryLocked, setInventoryLocked] = useState(false);

  const value = useMemo<UIContextValue>(
    () => ({
      inventoryOpen,
      inventoryLocked,
      openInventory: () => {
        if (!inventoryLocked) setInventoryOpen(true);
      },
      closeInventory: () => setInventoryOpen(false),
      toggleInventory: () => {
        if (inventoryLocked) return;
        setInventoryOpen((v) => !v);
      },
      setInventoryLocked,
    }),
    [inventoryOpen, inventoryLocked],
  );

  // Global hotkeys: Ctrl+I toggles inventory, Esc closes it
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      // ESC closes
      if (e.key === "Escape") {
        if (inventoryOpen) setInventoryOpen(false);
        return;
      }

      // Ctrl+I toggles (also allow Cmd+I on mac)
      const isToggle =
        (e.ctrlKey || e.metaKey) && (e.key === "i" || e.key === "I");
      if (isToggle) {
        e.preventDefault();
        if (!inventoryLocked) setInventoryOpen((v) => !v);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inventoryOpen, inventoryLocked]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside UIProvider");
  return ctx;
}
