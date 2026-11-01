import { kennithItemImages } from "@/lib/kithna/kennithItemImages";
import { AVATAR_LAYER_ASSETS } from "./avatarAssets";
import type { AvatarCustomization } from "./avatarTypes";

type AvatarPreviewProps = {
  customization: AvatarCustomization;
};

// Per-item placement on the existing 1280px canvas, including each icon's padding.
// Square viewports preserve these square source images without stretching.
// Insets exclude detached neighboring-item fragments, never the wearable itself.
const WEARABLE_PLACEMENTS: Record<string, { x: number; y: number; width: number; height: number; transform?: string; clipPath?: string }> = {
  "battered-shirt-cream": { x: 380, y: 250, width: 512, height: 512 },
  "battered-shirt-muted-blue": { x: 340, y: 230, width: 550, height: 550, clipPath: "inset(0 0 0 18%) fill-box" },
  "battered-shirt-dusty-green": { x: 340, y: 230, width: 550, height: 550, clipPath: "inset(0 0 0 18%) fill-box" },
  "battered-shirt-faded-plum": { x: 340, y: 225, width: 600, height: 600 },
  "battered-trousers-dark-brown": { x: 294, y: 505, width: 640, height: 640, clipPath: "inset(0 0 0 24%) fill-box" },
  "battered-trousers-slate-gray": { x: 294, y: 505, width: 640, height: 640 },
  "battered-trousers-faded-olive": { x: 314, y: 505, width: 640, height: 640 },
  "battered-skirt-muted-purple": { x: 310, y: 430, width: 640, height: 640 },
  "battered-skirt-dusty-blue": { x: 301, y: 435, width: 640, height: 640 },
  "battered-skirt-moss-green": { x: 310, y: 439, width: 640, height: 640 },
  "battered-side-cap-brown": { x: 275, y: -235, width: 680, height: 680, clipPath: "inset(0 33.6% 0 0) fill-box" },
  "battered-travel-cap-blue": { x: 275, y: -235, width: 680, height: 680, clipPath: "inset(0 26.6% 0 0) fill-box" },
  "battered-menders-cap-olive": { x: 328, y: -180, width: 580, height: 580 },
  "round-glasses-dark-metal": { x: 174, y: -210, width: 900, height: 900, transform: "rotate(-6 624 240)" },
  "round-glasses-bronze": { x: 174, y: -210, width: 900, height: 900, transform: "rotate(-6 624 240)" },
  "square-glasses-dark-metal": { x: 147, y: -210, width: 900, height: 900, transform: "rotate(-7 624 240)", clipPath: "inset(0 0 43% 37%) fill-box" },
  "square-glasses-blue-gray": { x: 96, y: -300, width: 1025, height: 1025, transform: "rotate(-12 624 240)" },
  "brass-monocle": { x: 207, y: -90, width: 730, height: 730 },
};

export function AvatarPreview({ customization }: AvatarPreviewProps) {
  const layers = [
    { id: "body", src: AVATAR_LAYER_ASSETS.body[customization.bodyFrame] },
    { id: "skin", src: AVATAR_LAYER_ASSETS.skin[customization.skinTone] },
    {
      id: "eyes",
      src: AVATAR_LAYER_ASSETS.eyes[customization.eyeStyle]?.[
        customization.eyeColor
      ],
    },
    { id: "mouth", src: AVATAR_LAYER_ASSETS.mouth[customization.mouthStyle] },
    {
      id: "hair",
      src: AVATAR_LAYER_ASSETS.hair[customization.hairStyle]?.[
        customization.hairColor
      ],
    },
  ];

  // Align the existing shop artwork with the base artwork's 1280px canvas.
  // The same crop as the base layers keeps equipment aligned at every viewport size.
  const wearables = [
    { slug: customization.lowerBodyClothing, x: 385, y: 535, width: 485, height: 710 },
    { slug: customization.upperBodyClothing, x: 380, y: 220, width: 512, height: 614 },
    { slug: customization.hat, x: 275, y: -235, width: 680, height: 680 },
    { slug: customization.eyewear, x: 222, y: -315, width: 790, height: 790 },
  ];

  return (
    <div className="dp-avatar-preview" role="img" aria-label="Trainer avatar">
      {layers.map((layer) =>
        layer.src ? (
          <img
            key={`${layer.id}-${layer.src}`}
            src={layer.src}
            alt=""
            draggable={false}
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : null,
      )}
      <svg
        viewBox="0 0 1280 1280"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        {wearables.map(({ slug, ...placement }) => slug && kennithItemImages[slug] ? (
          <image key={slug} href={kennithItemImages[slug]} {...(WEARABLE_PLACEMENTS[slug] ?? placement)} preserveAspectRatio="xMidYMin meet" />
        ) : null)}
      </svg>
    </div>
  );
}
