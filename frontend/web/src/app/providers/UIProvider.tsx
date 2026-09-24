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
  questJournalOpen: boolean;
  openInventory: () => void;
  closeInventory: () => void;
  toggleInventory: () => void;
  openQuestJournal: () => void;
  closeQuestJournal: () => void;
  setInventoryLocked: (locked: boolean) => void; // you’ll wire this to battle later
};

const UIContext = createContext<UIContextValue | null>(null);

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;

  const tag = el.tagName;

  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryLocked, setInventoryLocked] = useState(false);
  const [questJournalOpen, setQuestJournalOpen] = useState(false);

  const value = useMemo<UIContextValue>(
    () => ({
      inventoryOpen,
      inventoryLocked,
      questJournalOpen,

      openInventory: () => {
        if (inventoryLocked) return;

        setQuestJournalOpen(false);
        setInventoryOpen(true);
      },

      closeInventory: () => {
        setInventoryOpen(false);
      },

      toggleInventory: () => {
        if (inventoryLocked) return;

        setQuestJournalOpen(false);
        setInventoryOpen((current) => !current);
      },

      openQuestJournal: () => {
        setInventoryOpen(false);
        setQuestJournalOpen(true);
      },

      closeQuestJournal: () => {
        setQuestJournalOpen(false);
      },

      setInventoryLocked,
    }),
    [inventoryOpen, inventoryLocked, questJournalOpen],
  );

  // Global hotkeys:
  // Ctrl/Cmd + I toggles Inventory.
  // Escape closes whichever global popup is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === "Escape") {
        if (inventoryOpen) {
          setInventoryOpen(false);
        }

        if (questJournalOpen) {
          setQuestJournalOpen(false);
        }

        return;
      }

      const isInventoryToggle =
        (event.ctrlKey || event.metaKey) &&
        (event.key === "i" || event.key === "I");

      if (isInventoryToggle) {
        event.preventDefault();

        if (inventoryLocked) return;

        setQuestJournalOpen(false);
        setInventoryOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [inventoryOpen, inventoryLocked, questJournalOpen]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);

  if (!ctx) {
    throw new Error("useUI must be used inside UIProvider");
  }

  return ctx;
}
