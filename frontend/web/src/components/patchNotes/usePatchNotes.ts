import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type PatchNote = {
  id: string;
  title: string;
  html: string;
  created_at: string;
};

export function usePatchNotes() {
  const [patches, setPatches] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("patch_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Patch notes error:", error);
      }

      setPatches(data || []);
      setLoading(false);
    }

    load();
  }, []);

  return { patches, loading };
}
