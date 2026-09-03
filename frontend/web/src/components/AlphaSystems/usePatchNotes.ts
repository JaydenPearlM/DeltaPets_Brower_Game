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
  sections?: PatchNoteSection[];
};

export type PatchNoteSection = {
  title: string;
  items: string[];
};

export const CURRENT_WEB_PATCH: PatchNoteItem = {
  id: "bundled-v0.0.5-closed-alpha",
  version: "v0.0.5 Closed Alpha",
  title: "DeltaPets v0.0.5 Closed Alpha",
  summary:
    "This build continues strengthening DeltaPets for Open Alpha.",
  released_at: "2026-09-01T00:00:00-04:00",
  sections: [
    {
      title: "Velune",
      items: [
        "Added Velune profile and species data",
        "Added Legendary species support",
        "Added Kithna encounter groundwork",
        "Added Velune sighting popup behavior",
        "Added backend and database support",
      ],
    },
    {
      title: "Battle & Kith",
      items: [
        "Updated PvE battle handling",
        "Updated pet and trainer backend routes",
        "Updated species registration",
        "Updated Starter species data",
      ],
    },
    {
      title: "Starter Kith",
      items: [
        "Updated Starter display names",
        "Updated Espyr and Kindle Hatchling assets",
        "Cleaned up Starter Kith display handling",
        "Fixed production asset filename casing",
      ],
    },
    {
      title: "Hatchery & Storage",
      items: [
        "Updated Hatchery behavior and UI",
        "Improved Pet Storage handling",
        "Updated Main Team behavior",
      ],
    },
    {
      title: "Inventory",
      items: [
        "Updated inventory behavior and rendering",
        "Improved inventory styling and mobile layout",
      ],
    },
    {
      title: "Kithna",
      items: [
        "Reworked parts of the Kithna map",
        "Cleaned up map styling",
        "Updated merchant styling",
        "Expanded encounter logic",
      ],
    },
    {
      title: "Mobile",
      items: [
        "Major mobile CSS improvements",
        "Improved small-screen layouts",
        "Fixed spacing, containment, and panel behavior",
        "Continued Pixel and general mobile QA",
        "Preserved desktop layouts",
      ],
    },
    {
      title: "Homepage & Profile",
      items: [
        "Updated Homepage layout and styling",
        "Updated Profile behavior and content",
        "Added more Closed Alpha profile functionality",
      ],
    },
    {
      title: "Skills",
      items: [
        "Updated Skill Chamber behavior",
        "Improved Starter Kith display handling",
      ],
    },
    {
      title: "Testing & QA",
      items: [
        "Expanded gameplay expectations and test planning",
        "Continued deployment and mobile regression testing",
      ],
    },
    {
      title: "Deployment",
      items: [
        "Fixed Linux/Render case-sensitive asset imports",
        "Verified frontend and backend builds",
        "Synced Core Systems with main",
      ],
    },
  ],
};

function getVersionParts(version: string): number[] {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : [0, 0, 0];
}

function isNewerThanCurrent(version: string): boolean {
  const candidate = getVersionParts(version);
  const current = getVersionParts(CURRENT_WEB_PATCH.version);

  for (let index = 0; index < current.length; index += 1) {
    if (candidate[index] > current[index]) return true;
    if (candidate[index] < current[index]) return false;
  }

  return false;
}

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
        setPatch(CURRENT_WEB_PATCH);
        setError(error.message || "Failed to load patch notes.");
        setLoading(false);
        return;
      }

      if (!data) {
        setPatch(CURRENT_WEB_PATCH);
        setLoading(false);
        return;
      }

      const databasePatch: PatchNoteItem = {
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
      };

      setPatch(
        isNewerThanCurrent(databasePatch.version)
          ? databasePatch
          : CURRENT_WEB_PATCH,
      );

      setLoading(false);
    }

    void loadPatchNotes();

    return () => {
      active = false;
    };
  }, []);

  return { patch, loading, error };
}
