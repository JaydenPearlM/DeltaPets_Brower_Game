import magmadoPortrait from "@/kith/kithna_pets/hatchling_magmoda.png";

const KITH_PORTRAITS: Readonly<Record<string, string>> = {
  kithna_magmado: magmadoPortrait,
  magmado: magmadoPortrait,
};

export function getKithPortrait(value?: string | null): string {
  if (!value) return "";

  const key = value.trim().toLowerCase();

  return KITH_PORTRAITS[key] ?? "";
}

export { magmadoPortrait };
