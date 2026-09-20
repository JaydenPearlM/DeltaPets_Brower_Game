import bodyFrameA from "@/kith/assets/Avatar/layers/body-frame-a.png";
import bodyFrameB from "@/kith/assets/Avatar/layers/body-frame-b.png";
import skinLight from "@/kith/assets/Avatar/layers/skin-light.png";
import skinDeep from "@/kith/assets/Avatar/layers/skin-deep.png";
import eyesRound from "@/kith/assets/Avatar/layers/eyes-round.png";
import eyesSoft from "@/kith/assets/Avatar/layers/eyes-soft.png";
import hairShort from "@/kith/assets/Avatar/layers/hair-masculine.png";
import hairLong from "@/kith/assets/Avatar/layers/hair-feminine.png";
import mouthSmile from "@/kith/assets/Avatar/layers/mouth-smile.png";
import mouthNeutral from "@/kith/assets/Avatar/layers/mouth-neutral.png";
import hairShortBlack from "@/kith/assets/Avatar/layers/hair-masculine-black.png";
import hairShortBrown from "@/kith/assets/Avatar/layers/hair-masculine-brown.png";
import hairShortBlonde from "@/kith/assets/Avatar/layers/hair-masculine-blonde.png";
import hairShortPurple from "@/kith/assets/Avatar/layers/hair-masculine-purple.png";
import hairLongBlack from "@/kith/assets/Avatar/layers/hair-feminine-black.png";
import hairLongBrown from "@/kith/assets/Avatar/layers/hair-feminine-brown.png";
import hairLongBlonde from "@/kith/assets/Avatar/layers/hair-feminine-blonde.png";
import hairLongPurple from "@/kith/assets/Avatar/layers/hair-feminine-purple.png";
import eyesRoundBlue from "@/kith/assets/Avatar/layers/eyes-round-blue.png";
import eyesRoundGreen from "@/kith/assets/Avatar/layers/eyes-round-green.png";
import eyesRoundHazel from "@/kith/assets/Avatar/layers/eyes-round-hazel.png";
import eyesRoundPurple from "@/kith/assets/Avatar/layers/eyes-round-purple.png";
import eyesSoftBlue from "@/kith/assets/Avatar/layers/eyes-soft-blue.png";
import eyesSoftGreen from "@/kith/assets/Avatar/layers/eyes-soft-green.png";
import eyesSoftHazel from "@/kith/assets/Avatar/layers/eyes-soft-hazel.png";
import eyesSoftPurple from "@/kith/assets/Avatar/layers/eyes-soft-purple.png";

export const AVATAR_LAYER_ASSETS: {
  body: Record<string, string>;
  skin: Record<string, string>;
  eyes: Record<string, Record<string, string>>;
  hair: Record<string, Record<string, string>>;
  mouth: Record<string, string>;
} = {
  body: { "body-frame-a": bodyFrameA, "body-frame-b": bodyFrameB },
  skin: { "skin-01": skinLight, "skin-05": skinDeep },
  eyes: {
    "eyes-round-01": {
      brown: eyesRound, blue: eyesRoundBlue, green: eyesRoundGreen,
      hazel: eyesRoundHazel, purple: eyesRoundPurple,
    },
    "eyes-soft-01": {
      brown: eyesSoft, blue: eyesSoftBlue, green: eyesSoftGreen,
      hazel: eyesSoftHazel, purple: eyesSoftPurple,
    },
  },
  hair: {
    "hair-bald": {},
    "hair-short-01": {
      "dark-brown": hairShort, black: hairShortBlack, brown: hairShortBrown,
      blonde: hairShortBlonde, purple: hairShortPurple,
    },
    "hair-ponytail-01": {
      "dark-brown": hairLong, black: hairLongBlack, brown: hairLongBrown,
      blonde: hairLongBlonde, purple: hairLongPurple,
    },
  },
  mouth: { "mouth-smile-01": mouthSmile, "mouth-neutral-01": mouthNeutral },
};
