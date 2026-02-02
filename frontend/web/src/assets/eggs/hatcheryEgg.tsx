// src/components/Hatchery/HatcheryEgg.tsx

import { EggDefinition } from "../../assets/eggs/eggType";

type HatcheryEggProps = {
  egg: EggDefinition;
  isShiny?: boolean;
};

export function HatcheryEgg({ egg, isShiny = false }: HatcheryEggProps) {
  const spriteSrc = isShiny && egg.shinySprite ? egg.shinySprite : egg.sprite;

  return (
    <div className="hatchery-egg-wrapper">
      <img
        src={spriteSrc}
        alt={egg.name}
        className="hatchery-egg"
        draggable={false}
      />
      <div className="egg-name">{egg.name}</div>
    </div>
  );
}
