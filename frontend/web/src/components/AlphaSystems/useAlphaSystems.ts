import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type AlphaSystemItem = {
  id: string;
  title: string;
  description?: string | null;
  released_at?: string | null;
};

type UseAlphaSystemsResult = {
  items: AlphaSystemItem[];
  loading: boolean;
  error: string;
};

export function useAlphaSystems(): UseAlphaSystemsResult {
  const [items, setItems] = useState<AlphaSystemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAlphaSystems() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("alpha_systems")
        .select("id, title, description, released_at")
        .eq("enabled", true)
        .order("released_at", { ascending: false }) // newest first
        .limit(5); // only show 5

      if (!active) return;

      if (error) {
        console.error("[alpha-systems] fetch failed", error);
        setItems([]);
        setError(error.message || "Failed to load alpha systems.");
        setLoading(false);
        return;
      }

      const normalized: AlphaSystemItem[] = Array.isArray(data)
        ? data.map((item) => ({
            id: String(item.id),
            title:
              typeof item.title === "string" && item.title.trim().length > 0
                ? item.title
                : "Untitled system",
            description:
              typeof item.description === "string" ? item.description : "",
            released_at:
              typeof item.released_at === "string" ? item.released_at : null,
          }))
        : [];

      setItems(normalized);
      setLoading(false);
    }

    void loadAlphaSystems();

    return () => {
      active = false;
    };
  }, []);

  return { items, loading, error };
}
