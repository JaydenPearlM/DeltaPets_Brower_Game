import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/useAuth";
import { apiFetch } from "@/lib/api/baseClient";
import type { BackendInventoryItem } from "@/components/inventory/inventory";
import { kennithCatalog } from "@/lib/kithna/kennithCatalog";
import careDefinitions from "../../../../../pet_items/care_items.json";
import DpPopupWindow from "./DpPopupWindow";

export default function OwnedCarePicker({ open, onClose, onUse, busy, canPet, message }: {
  open: boolean; onClose: () => void; onUse: (slug?: string) => void; busy: boolean; canPet: boolean; message: string | null;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<BackendInventoryItem[] | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (busy) return;
    let active = true;
    setItems(null);
    setReady(false);
    setError("");
    if (!open || !user) return;
    void apiFetch<{ items: BackendInventoryItem[]; equipment?: { ready: boolean } }>("/api/inventory").then(data => {
      if (active) {
        setItems(data.items.filter(item => (item.availableQty ?? item.qty) > 0 && kennithCatalog.petCare.some(def => def.slug === item.slug)));
        setReady(data.equipment?.ready === true);
      }
    }).catch(() => { if (active) setError("Could not load owned care items."); });
    return () => { active = false; };
  }, [open, user?.id, retry, busy]);
  return <DpPopupWindow open={open} onClose={onClose} label="Owned Care Items">
    <h2>Owned Care Items</h2>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
    {!items && !error && <p>Loading care items…</p>}
    {items && !ready && <p role="status">Purchased-item care is unavailable until the equipment update is enabled.</p>}
    {items?.length === 0 && <p>You have no purchased basic care items available.</p>}
    {items?.map(item => <div key={item.slug}>
      <strong>{item.name}</strong> ×{item.availableQty ?? item.qty}
      <p>{careDefinitions.find(def => def.slug === item.slug)?.description}</p>
      <button type="button" className="dp-btn--close" disabled={busy || !ready} onClick={() => onUse(item.slug)}>Use {item.name}</button>
    </div>)}
    <button type="button" className="dp-btn--close" disabled={busy || !canPet} onClick={() => onUse()}>Pet using an owned comfort item</button>
  </DpPopupWindow>;
}
