import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type Announcement = {
  id: string;
  title: string;
  body?: string | null;
  created_at?: string | null;
  is_published?: boolean | null;
  page_scope?: string | null;
};

export function useAnnouncements(limit = 1, pageScope = "homepage") {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;

    async function loadAnnouncements() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, created_at, is_published, page_scope")
        .eq("is_published", true)
        .eq("page_scope", pageScope)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!alive) return;

      if (error) {
        setError(error.message || "Failed to load announcements.");
        setItems([]);
      } else {
        setItems(data ?? []);
      }

      setLoading(false);
    }

    loadAnnouncements();

    return () => {
      alive = false;
    };
  }, [limit, pageScope]);

  return { items, loading, error };
}
