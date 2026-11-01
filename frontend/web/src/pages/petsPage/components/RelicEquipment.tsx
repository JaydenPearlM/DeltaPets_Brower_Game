import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/providers/useAuth";
import { apiFetch } from "@/lib/api/baseClient";
import { getInventoryChangeEventName, type BackendInventoryItem } from "@/components/inventory/inventory";
import { kennithCatalog } from "@/lib/kithna/kennithCatalog";
import DpPopupWindow from "./DpPopupWindow";

type EquipmentInventory = {
  items: BackendInventoryItem[];
  equipment?: { ready: boolean; relics: { petId: string; slug: string }[] };
};

export default function RelicEquipment({ petId, onTree }: { petId: string; onTree: () => void }) {
  const { user } = useAuth();
  const [data, setData] = useState<EquipmentInventory | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const version = useRef(0);
  const owner = useRef("");
  owner.current = `${user?.id}:${petId}`;
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const request = ++version.current;
    setData(null);
    if (!user) return;
    void apiFetch<EquipmentInventory>("/api/inventory").then(result => {
      if (version.current === request) setData(result);
    }).catch(() => { if (version.current === request) setError("Could not load your relics. Please retry."); });
    return () => { version.current++; };
  }, [user?.id, petId, refresh]);
  useEffect(() => {
    const reload = () => setRefresh(value => value + 1);
    window.addEventListener(getInventoryChangeEventName(), reload);
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener(getInventoryChangeEventName(), reload);
      window.removeEventListener("focus", reload);
    };
  }, []);
  const equipped = data?.equipment?.relics.find(item => item.petId === petId)?.slug;
  const name = kennithCatalog.relics.find(item => item.slug === equipped)?.name ?? "No Relic";
  const owned = data?.items.filter(item => item.qty > 0 && kennithCatalog.relics.some(relic => relic.slug === item.slug)) ?? [];
  const equip = async (slug: string | null) => {
    if (pending.current || !data?.equipment?.ready) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const requestedOwner = owner.current;
    try {
      const result = await apiFetch<{ ok: boolean }>("/api/inventory/relic", { method: "PUT", json: { petId, slug } });
      if (result?.ok !== true) throw new Error("Could not confirm equipment. Refresh before retrying.");
      window.dispatchEvent(new Event(getInventoryChangeEventName()));
    } catch (err) {
      if (requestedOwner === owner.current) setError(err instanceof Error ? err.message : "Could not equip the relic.");
    } finally {
      pending.current = false;
      setBusy(false);
      setRefresh(value => value + 1);
    }
  };
  return <>
    <div className="petRepoRelicPanel">
      <div className="petRepoRelicPanelInner dp-blue-grid-panel">
        <div className="petRepoRelicPanelHeader"><span>Relic Artes Chamber</span></div>
        <div className="petRepoRelicPanelContent">
          <div className="petRepoRelicArtColumn">
            <div className="petRepoRelicArtFrame"><span>{data ? name : "—"}</span></div>
            <div className="petRepoRelicArtCopy"><h3>{data ? name : "Loading Relics"}</h3><p>Browse this Kith's collected Relics and equip one here.</p></div>
          </div>
          <div className="petRepoRelicActions">
            <button type="button" className="dp-btn--close petRepoRelicBrowseButton" onClick={() => { setOpen(true); setRefresh(value => value + 1); }}>Browse Relics</button>
            <button type="button" className="dp-btn--close petRepoRelicTreeButton" onClick={onTree}>See Arte Tree</button>
          </div>
        </div>
      </div>
    </div>
    <DpPopupWindow open={open} onClose={() => setOpen(false)} label="Browse Relics">
      <h2>Browse Relics</h2>
      {error && <p role="alert">{error}</p>}
      {!data ? <button type="button" onClick={() => setRefresh(value => value + 1)}>Retry relics</button> : <>
        {!data.equipment?.ready && <p role="status">Relic equipment is unavailable until the equipment update is enabled.</p>}
        {owned.length === 0 && <p>You have no owned basic relics.</p>}
        {owned.map(item => <div key={item.slug}>
          <strong>{item.name}</strong> — Available: {item.availableQty ?? item.qty}
          <button type="button" className="dp-btn--close" disabled={busy || !data.equipment?.ready || (item.availableQty ?? item.qty) < 1 || equipped === item.slug} onClick={() => void equip(item.slug)}>{equipped === item.slug ? "Equipped" : "Equip"}</button>
        </div>)}
        {equipped && <button type="button" className="dp-btn--close" disabled={busy || !data.equipment?.ready} onClick={() => void equip(null)}>Unequip {name}</button>}
      </>}
    </DpPopupWindow>
  </>;
}
