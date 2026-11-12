import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/baseClient";

import { getInventoryChangeEventName } from "@/components/inventory/inventory";

import type { StoragePet } from "@/components/Hatchery/pages/storage/usePetStorage";

type TreasureTab = "Eggs" | "Items" | "Clothes";

type TreasureItem = {
  roomId: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  rarity: number;
  createdAt: string;
};

type TreasureResponse = {
  items: TreasureItem[];
  eggs?: { roomId: string; name: string; species: string; line: string }[];
};
type TreasureEntry = { roomId: string; name: string; description?: string | null; kind: "item" | "egg" };
const entryKey = (entry: TreasureEntry) => `${entry.kind}:${entry.roomId}`;

type WildwoodInventoryProps = {
  userId?: string;
  eggs: StoragePet[];
  eggsLoading: boolean;
  eggsError: string;
  refreshSignal: number;
  onRetryEggs: () => void;
  onPendingChange?: (pending: boolean) => void;
};

const tabs: TreasureTab[] = ["Eggs", "Items", "Clothes"];

export default function WildwoodInventory({
  userId,
  refreshSignal,
  onPendingChange,
}: WildwoodInventoryProps) {
  const [tab, setTab] = useState<TreasureTab>("Items");

  const [items, setItems] = useState<TreasureEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const visibleItems = items.filter(item => item.kind === (tab === "Eggs" ? "egg" : "item"));
  const destination = tab === "Eggs" ? "Storage" : "Inventory";

  useEffect(() => {
    onPendingChange?.(items.length > 0);
  }, [items, onPendingChange]);

  useEffect(() => {
    let active = true;

    async function loadTreasure() {
      setLoading(true);
      setError("");

      if (!userId) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        const result = await apiFetch<TreasureResponse>(
          "/api/kithna/wildwood/treasure",
        );

        if (!Array.isArray(result.items)) {
          throw new Error("Invalid Treasure response.");
        }

        if (active) {
          if (result.eggs !== undefined && !Array.isArray(result.eggs)) throw new Error("Invalid Treasure eggs response.");
          setItems([
            ...result.items.map(item => ({ ...item, kind: "item" as const })),
            ...(result.eggs ?? []).map(egg => ({ ...egg, kind: "egg" as const })),
          ]);
        }
      } catch (problem) {
        if (active) {
          setError(
            problem instanceof Error
              ? problem.message
              : "Could not load Treasure.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadTreasure();

    return () => {
      active = false;
    };
  }, [userId, refreshSignal, revision]);

  function toggleItem(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function transferItems(roomIds: string[]) {
    if (!userId || transferring || loading) {
      return;
    }

    const validIds = roomIds.filter((id) =>
      visibleItems.some((item) => entryKey(item) === id),
    );

    if (validIds.length === 0) {
      return;
    }

    setTransferring(true);
    setNotice("");

    let transferred = 0;

    try {
      for (const id of validIds) {
        const entry = visibleItems.find(item => entryKey(item) === id)!;
        const receipt = await apiFetch<{ success: boolean }>(`/api/kithna/wildwood/treasure/${entry.kind === "egg" ? "transfer-egg" : "transfer"}`, {
          method: "POST",
          json: { roomId: entry.roomId },
        });
        if (receipt?.success !== true) throw new Error("Transfer was not confirmed. Reload Treasure.");

        transferred += 1;

        // Remove only items whose transfer was confirmed.
        setItems((current) => current.filter((item) => entryKey(item) !== id));

        setSelectedIds((current) => current.filter((selected) => selected !== id));
      }

      setNotice(
        `${transferred} ${
          tab === "Eggs" ? (transferred === 1 ? "egg" : "eggs") : (transferred === 1 ? "item" : "items")
        } moved to ${destination}.`,
      );
    } catch (problem) {
      setNotice(
        `${transferred} transferred. ${
          problem instanceof Error
            ? problem.message
            : "The transfer could not be completed."
        }`,
      );
    } finally {
      if (transferred > 0) {
        window.dispatchEvent(new Event(getInventoryChangeEventName()));
      }

      setTransferring(false);
      setRevision((value) => value + 1);
    }
  }

  return (
    <section className="ww-inventory ww-card" aria-label="Wildwood Treasure">
      <div className="ww-card-heading">
        <h2>Treasure</h2>
      </div>

      <div
        className="ww-inventory-tabs"
        role="tablist"
        aria-label="Treasure categories"
      >
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`ww-tab-${name}`}
            aria-controls="ww-inventory-panel"
            aria-selected={tab === name}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => {
              setTab(name);
              setSelectedIds([]);
              setNotice("");
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div
        id="ww-inventory-panel"
        role="tabpanel"
        aria-labelledby={`ww-tab-${tab}`}
        tabIndex={0}
        aria-busy={loading || transferring}
      >
        {tab === "Clothes" ? (
          <p>
            No unclaimed Wildwood clothing is available in visit Treasure yet.
          </p>
        ) : loading ? (
          <p role="status">Loading Treasure…</p>
        ) : error ? (
          <div role="alert">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Retry
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <p>No unclaimed {tab === "Eggs" ? "eggs" : "items"} found this visit.</p>
        ) : (
          <>
            <ol className="ww-treasure-egg-list">
              {visibleItems.map((item, index) => (
                <li key={entryKey(item)}>
                  <label className="ww-treasure-egg">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(entryKey(item))}
                      disabled={transferring}
                      onChange={() => toggleItem(entryKey(item))}
                      aria-label={`Select ${item.name}`}
                    />

                    <span className="ww-treasure-egg-number">{index + 1}.</span>

                    <span>
                      <strong>{item.name}</strong>

                      {item.description && <small>{item.description}</small>}
                    </span>
                  </label>
                </li>
              ))}
            </ol>

            <div className="ww-treasure-actions">
              <button
                type="button"
                disabled={transferring || selectedIds.length === 0}
                onClick={() => void transferItems(selectedIds)}
              >
                Send selected to {destination}
              </button>

              <button
                type="button"
                disabled={transferring}
                onClick={() =>
                  void transferItems(visibleItems.map(entryKey))
                }
              >
                Send all to {destination}
              </button>
            </div>
          </>
        )}

        {notice && <p role="status">{notice}</p>}
      </div>
    </section>
  );
}
