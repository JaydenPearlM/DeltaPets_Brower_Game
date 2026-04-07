import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type PatchNoteItem = {
  id: string;
  version: string;
  title: string;
  summary: string;
  released_at?: string | null;
  new_notes?: string | null;
  updated_notes?: string | null;
  fixed_notes?: string | null;
  notes?: string | null;
};

type UsePatchNotesResult = {
  patch: PatchNoteItem | null;
  loading: boolean;
  error: string;
};

export function usePatchNotes(): UsePatchNotesResult {
  const [patch, setPatch] = useState<PatchNoteItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPatchNotes() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("patch_notes")
        .select(
          "id, version, title, summary, released_at, new_notes, updated_notes, fixed_notes, notes",
        )
        .eq("is_published", true)
        .order("released_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("[patch-notes] fetch failed", error);
        setPatch(null);
        setError(error.message || "Failed to load patch notes.");
        setLoading(false);
        return;
      }

      if (!data) {
        setPatch(null);
        setLoading(false);
        return;
      }

      setPatch({
        id: String(data.id),
        version:
          typeof data.version === "string" && data.version.trim().length > 0
            ? data.version
            : "Unknown Version",
        title:
          typeof data.title === "string" && data.title.trim().length > 0
            ? data.title
            : "Untitled Patch",
        summary:
          typeof data.summary === "string" && data.summary.trim().length > 0
            ? data.summary
            : "",
        released_at:
          typeof data.released_at === "string" ? data.released_at : null,
        new_notes: typeof data.new_notes === "string" ? data.new_notes : "",
        updated_notes:
          typeof data.updated_notes === "string" ? data.updated_notes : "",
        fixed_notes:
          typeof data.fixed_notes === "string" ? data.fixed_notes : "",
        notes: typeof data.notes === "string" ? data.notes : "",
      });

      setLoading(false);
    }

    void loadPatchNotes();

    return () => {
      active = false;
    };
  }, []);

  return { patch, loading, error };
}
