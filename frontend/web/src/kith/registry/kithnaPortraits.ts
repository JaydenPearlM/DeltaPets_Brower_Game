import glimmerPortrait from "../assets/Kithna_pets/hatchling_glimmer.png";
import magmadoPortrait from "../assets/Kithna_pets/hatchling_magmado.png";
import pebelinPortrait from "../assets/Kithna_pets/hatchling_pebelin.png";
import shadePortrait from "../assets/Kithna_pets/hatchling_shade.png";
import clodianPortrait from "../assets/Kithna_pets/hatchling_clodion.png";

const KITHNA_PORTRAITS: Readonly<Record<string, string>> = {
  kithna_glimmer: glimmerPortrait,
  glimmer: glimmerPortrait,

  kithna_magmado: magmadoPortrait,
  magmado: magmadoPortrait,

  kithna_pebelin: pebelinPortrait,
  pebelin: pebelinPortrait,

  kithna_shade: shadePortrait,
  shade: shadePortrait,

  kithna_clodian: clodianPortrait,
  clodian: clodianPortrait,
  clodion: clodianPortrait,
};

export function getKithnaPortrait(value?: string | null): string | null {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();

  return KITHNA_PORTRAITS[key] ?? null;
}

export {
  glimmerPortrait,
  magmadoPortrait,
  pebelinPortrait,
  shadePortrait,
  clodianPortrait,
};
