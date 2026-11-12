import cribi from "../assets/startepets/hatchlings/back/hatchling_cribi_back.png";
import espyr from "../assets/startepets/hatchlings/back/hatchling_espyr_back.png";
import kindlekin from "../assets/startepets/hatchlings/back/hatchling_kindlekin_back.png";
import mizu from "../assets/startepets/hatchlings/back/hatchling_mizu_back.png";
import solen from "../assets/startepets/hatchlings/back/hatchling_solen_back.png";
import twiglet from "../assets/startepets/hatchlings/back/hatchling_twiglet_back.png";
import volb from "../assets/startepets/hatchlings/back/hatchling_volb_back.png";
import wistpip from "../assets/startepets/hatchlings/back/hatchling_wistpip_back.png";
import clodion from "../assets/Kithna_pets/hatchlings/back/hatchling_clodion_back.png";
import glimmer from "../assets/Kithna_pets/hatchlings/back/hatchling_glimmer_back.png";
import magmado from "../assets/Kithna_pets/hatchlings/back/hatchling_magmado_back.png";
import pebelin from "../assets/Kithna_pets/hatchlings/back/hatchling_pebelin_back.png";
import shade from "../assets/Kithna_pets/hatchlings/back/hatchling_shade_back.png";
import cribit from "../assets/startepets/lowform/back/lowform_cribit_back.png";
import esperia from "../assets/startepets/lowform/back/lowform_esperia_back.png";
import mizulite from "../assets/startepets/lowform/back/lowform_mizulite_back.png";
import moltikin from "../assets/startepets/lowform/back/lowform_moltikin_back.png";
import solite from "../assets/startepets/lowform/back/lowform_solite_back.png";
import treeflip from "../assets/startepets/lowform/back/lowform_treeflip_back.png";
import voltaire from "../assets/startepets/lowform/back/lowform_voltaire_back.png";
import wimora from "../assets/startepets/lowform/back/lowform_wimora_back.png";
import clodzite from "../assets/Kithna_pets/lowform/back/lowform_clodzite_back.png";
import glammoraye from "../assets/Kithna_pets/lowform/back/lowform_glammoraye_back.png";
import magmoped from "../assets/Kithna_pets/lowform/back/lowform_magmoped_back.png";
import noctuff from "../assets/Kithna_pets/lowform/back/lowform_noctuff_back.png";
import rockcrash from "../assets/Kithna_pets/lowform/back/lowform_rockcrash_back.png";
import espyrian from "../assets/startepets/lowform/back/lowform_GoodP_Esperian_back.png";

// Presentation aliases only: never rewrite persisted species identifiers.
const sprites: Readonly<Record<string, string>> = { cribi, espyr, kindlekin, mizu, solen, twiglet, volb, wistpip, clodion, glimmer, magmado, pebelin, shade, cribit, esperia, mizulite, moltikin, solite, treeflip, voltaire, wimora, clodzite, glammoraye, magmoped, noctuff, rockcrash, espyrian,
  fire_starter: kindlekin, water_starter: mizu, earth_starter: twiglet,
  air_starter: wistpip, ice_starter: cribi, storm_starter: volb, light_starter: solen,
  shadow_night_bad: espyr, shadow_day_good: espyr, esperon: espyr,
  kithna_clodian: clodion, clodian: clodion, kithna_pebelin: pebelin,
  kithna_magmado: magmado, kithna_shade: shade, kithna_glimmer: glimmer,
  whispip: wistpip, whistpip: wistpip, whispit: wistpip,
  rootle: treeflip, moltikyn: moltikin, mizule: mizulite, zephyx: wimora,
  voltlet: voltaire, solkit: solite, noctimp: esperia, flareclaw: espyrian,
};
const lowforms: Readonly<Record<string, string>> = {
  fire_starter: moltikin, water_starter: mizulite, earth_starter: treeflip,
  air_starter: wimora, ice_starter: cribit, storm_starter: voltaire, light_starter: solite,
  kithna_clodian: clodzite, kithna_pebelin: rockcrash, kithna_magmado: magmoped,
  kithna_shade: noctuff, kithna_glimmer: glammoraye,
};
/** Uses explicit species/form identity, never a player-assigned nickname or level guess.
 * Battle snapshots currently omit stage; lineage IDs therefore use hatchling artwork.
 * Shadow split forms require an explicit form ID; day/night is not personality.
 */
export function getBattleBackSprite(speciesId: string, stage?: string | null): string | null {
  const key = speciesId.trim().toLowerCase();
  if (stage?.toLowerCase() === "lowform") return lowforms[key] ?? sprites[key] ?? null;
  return sprites[key] ?? null;
}
