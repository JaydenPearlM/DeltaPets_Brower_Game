import { useEffect, useRef, useState } from "react";

export type WildwoodVisit = { steps: number; roomId: string | null; prepared: boolean };
const emptyVisit: WildwoodVisit = { steps: 0, roomId: null, prepared: false };

export function advanceVisit(visit: WildwoodVisit, roomId: string | null): WildwoodVisit {
  if (!roomId || visit.roomId === roomId) return visit;
  return { steps: Math.min(100, visit.steps + 1), roomId, prepared: true };
}

export function moveTeamMember(ids: string[], id: string, destination: number): string[] {
  const index = ids.indexOf(id);
  if (index < 0 || destination < 0 || destination >= ids.length) return ids;
  const next = [...ids];
  next.splice(index, 1);
  next.splice(destination, 0, id);
  return next;
}

export function readVisit(raw: string | null): WildwoodVisit {
  try {
    const value = JSON.parse(raw ?? "null");
    if (value && Number.isInteger(value.steps) && value.steps >= 0 && value.steps <= 100 &&
        (value.roomId === null || typeof value.roomId === "string") && typeof value.prepared === "boolean") return value;
  } catch { /* An unavailable or outdated local snapshot never replaces server state. */ }
  return { ...emptyVisit };
}

// This is only a visit counter. The authoritative room/battle is never reset here.
export function useWildwoodVisit(userId: string | undefined) {
  const key = `deltapets:wildwood-visit:${userId ?? "anonymous"}`;
  const [state, setState] = useState<{ key: string; visit: WildwoodVisit }>(() => ({ key: "", visit: { ...emptyVisit } }));
  const lifetime = useRef({ token: 0, key });
  const visit = state.key === key ? state.visit : emptyVisit;
  useEffect(() => {
    const token = lifetime.current.token + 1;
    lifetime.current = { token, key };
    let restored = { ...emptyVisit };
    try {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navigation?.type === "reload") restored = readVisit(sessionStorage.getItem(key));
    } catch { /* Storage can be disabled. In-memory exploration still works. */ }
    setState({ key, visit: restored });
    let unloading = false;
    const beforeUnload = () => { unloading = true; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      // StrictMode replays effects without leaving the route. Clear only a real exit.
      queueMicrotask(() => {
        if (!unloading && (lifetime.current.token === token || lifetime.current.key !== key)) {
          try { sessionStorage.removeItem(key); } catch { /* Optional storage. */ }
        }
      });
    };
  }, [key]);
  useEffect(() => {
    if (state.key !== key) return;
    try { sessionStorage.setItem(key, JSON.stringify(state.visit)); } catch { /* Optional storage. */ }
  }, [key, state]);
  return {
    visit,
    setPrepared: (prepared: boolean) => setState(current => ({ key, visit: { ...(current.key === key ? current.visit : emptyVisit), prepared } })),
    recordRoom: (roomId: string | null) => setState(current => ({ key, visit: advanceVisit(current.key === key ? current.visit : emptyVisit, roomId) })),
  };
}
