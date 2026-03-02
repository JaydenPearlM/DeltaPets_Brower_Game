import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export function useAnnouncements(limit = 5) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,body,created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!alive) return;

      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        setItems((data ?? []) as Announcement[]);
      }

      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [limit]);

  return { items, loading, error };
}
