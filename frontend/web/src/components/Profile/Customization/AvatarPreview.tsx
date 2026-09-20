import { AVATAR_LAYER_ASSETS } from "./avatarAssets";
import type { AvatarCustomization } from "./avatarTypes";

type AvatarPreviewProps = {
  customization: AvatarCustomization;
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
    </div>
  );
}
