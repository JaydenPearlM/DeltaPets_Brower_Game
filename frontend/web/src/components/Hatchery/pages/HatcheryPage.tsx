import { useMemo, useState } from "react";
import "../styles/hatchery.css";

import { Nest } from "../components/Nest";
import { EggInfoPanel } from "../components/EggInfoPanel";
import type { HatcheryEgg } from "../types";

function makeIsoAfterMs(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

const MOCK_EGGS_L0: HatcheryEgg[] = [
  {
    id: "egg_1",
    element: "water",
    level: 0,
    base_stats: { power: 8, defense: 5, speed: 3, luck: 6 },
    hatch_ends_at: makeIsoAfterMs(2 * 60 * 1000),
  },
  {
    id: "egg_2",
    element: "fire",
    level: 0,
    base_stats: { power: 9, defense: 4, speed: 4, luck: 5 },
    hatch_ends_at: makeIsoAfterMs(3 * 60 * 1000 + 30 * 1000),
  },
];

export default function HatcheryPage() {
  const serverNowIso = useMemo(() => new Date().toISOString(), []);

  const [eggs] = useState<Array<HatcheryEgg | null>>([
    MOCK_EGGS_L0[0],
    MOCK_EGGS_L0[1],
  ]);

  const [selectedEggId, setSelectedEggId] = useState<string | null>(
    eggs[0]?.id ?? null,
  );

  const selectedEgg =
    eggs.find((e) => e?.id === selectedEggId) ?? eggs.find(Boolean) ?? null;

  return (
    <div className="hatchery">
      <header className="hatchery__topbar">
        <div className="hatchery__title">Deltapets Hatchery</div>
      </header>

      <main className="hatchery__content">
        <section className="hatchery__left">
          <div className="hatchery__sectionTitle">Starter Nest</div>
          <Nest
            eggs={eggs}
            selectedEggId={selectedEgg?.id ?? null}
            serverNowIso={serverNowIso}
            onSelectEgg={(id) => setSelectedEggId(id)}
          />
          <div className="hatchery__helperText">Level 0: 2 egg slots</div>
        </section>

        <section className="hatchery__center">
          <EggInfoPanel egg={selectedEgg} serverNowIso={serverNowIso} />
        </section>

        <section className="hatchery__right">
          <div className="hatchery__sectionTitle">Enhancement Items</div>

          <div className="itemShelf itemShelf--locked">
            <div className="itemShelf__slot" />
            <div className="itemShelf__slot" />
            <div className="itemShelf__slot" />
          </div>

          <div className="hatchery__helperText">
            Locked — unlocks at Hatchery Lv. 1
          </div>
        </section>
      </main>
    </div>
  );
}
