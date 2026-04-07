import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { FALLBACK_ANNOUNCEMENTS } from "@/pages/Homepage/FallBack";

export type AnnouncementItem = {
  id: string;
  title: string;
  body?: string | null;
  created_at?: string | null;
};

type UseAnnouncementsResult = {
  items: AnnouncementItem[];
  loading: boolean;
  error: string;
  usingFallback: boolean;
};

function getFallbackAnnouncements(limit: number): AnnouncementItem[] {
  return FALLBACK_ANNOUNCEMENTS.slice(0, limit).map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    created_at: item.createdAt,
  }));
}

export function useAnnouncements(
  limit = 6,
  pageScope = "homepage",
): UseAnnouncementsResult {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAnnouncements() {
      setLoading(true);
      setError("");
      setUsingFallback(false);

      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .eq("is_published", true)
        .eq("page_scope", pageScope)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!active) return;

      if (error) {
        console.error("[announcements] fetch failed", error);
        setItems(getFallbackAnnouncements(limit));
        setError(error.message || "Failed to load announcements.");
        setUsingFallback(true);
        setLoading(false);
        return;
      }

      const normalized: AnnouncementItem[] = Array.isArray(data)
        ? data.map((item) => ({
            id: String(item.id),
            title:
              typeof item.title === "string" && item.title.trim().length > 0
                ? item.title
                : "Untitled update",
            body: typeof item.body === "string" ? item.body : "",
            created_at: item.created_at ?? null,
          }))
        : [];

      if (normalized.length === 0) {
        setItems(getFallbackAnnouncements(limit));
        setUsingFallback(true);
      } else {
        setItems(normalized);
      }

      setLoading(false);
    }

    void loadAnnouncements();

    return () => {
      active = false;
    };
  }, [limit, pageScope]);

  return { items, loading, error, usingFallback };
}
