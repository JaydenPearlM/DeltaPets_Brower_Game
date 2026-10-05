import glimmerPortrait from "../assets/Kithna_pets/hatchlings/hatchling_glimmer.png";
import magmadoPortrait from "../assets/Kithna_pets/hatchlings/hatchling_magmado.png";
import pebelinPortrait from "../assets/Kithna_pets/hatchlings/hatchling_pebelin.png";
import shadePortrait from "../assets/Kithna_pets/hatchlings/hatchling_shade.png";
import clodianPortrait from "../assets/Kithna_pets/hatchlings/hatchling_clodion.png";
import clodzitePortrait from "../assets/Kithna_pets/lowform/lowform_Clodzite.png";
import glammorayePortrait from "../assets/Kithna_pets/lowform/lowform_glammoraye.png";
import magmopedPortrait from "../assets/Kithna_pets/lowform/lowform_magmoped.png";
import noctuffPortrait from "../assets/Kithna_pets/lowform/lowform_noctuff.png";
import rockcrashPortrait from "../assets/Kithna_pets/lowform/lowform_Rockcrash.png";

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
  clodzite: clodzitePortrait,
  glammoraye: glammorayePortrait,
  magmoped: magmopedPortrait,
  noctuff: noctuffPortrait,
  rockcrash: rockcrashPortrait,
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
