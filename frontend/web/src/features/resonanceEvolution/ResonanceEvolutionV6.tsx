import { useEffect, useState } from "react";
import "./ResonanceEvolutionV6.css";

export type ResonanceV6Element =
  | "fire" | "water" | "earth" | "air" | "ice"
  | "storm" | "light" | "shadow" | "voidborne";

export type ResonanceEvolutionV6Props = {
  hatchlingImage: string;
  evolvedImage: string;
  element?: ResonanceV6Element;
  kithName?: string;
  autoPlay?: boolean;
  onComplete?: () => void;
};

const ELEMENTS: Record<ResonanceV6Element, { rune: string }> = {
  fire: { rune: "△" },
  water: { rune: "◒" },
  earth: { rune: "⬢" },
  air: { rune: "⌁" },
  ice: { rune: "✦" },
  storm: { rune: "ϟ" },
  light: { rune: "☼" },
  shadow: { rune: "◐" },
  voidborne: { rune: "◇" },
};

type Phase = "idle" | "title" | "summon" | "rune" | "shards" | "strain" | "cocoon" | "shift" | "reveal";
const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function ResonanceEvolutionV6({
  hatchlingImage,
  evolvedImage,
  element = "storm",
  kithName = "Your Kith",
  autoPlay = false,
  onComplete,
}: ResonanceEvolutionV6Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [playing, setPlaying] = useState(false);

  const evolve = async () => {
    if (playing) return;
    setPlaying(true);
    setPhase("idle"); await sleep(300);
    setPhase("title"); await sleep(1800);
    setPhase("summon"); await sleep(1450);
    setPhase("rune"); await sleep(650);
    setPhase("shards"); await sleep(1400);
    setPhase("strain"); await sleep(1050);
    setPhase("cocoon"); await sleep(1050);
    setPhase("shift"); await sleep(1450);
    setPhase("reveal"); await sleep(1400);
    setPlaying(false);
    onComplete?.();
  };

  useEffect(() => { if (autoPlay) void evolve(); }, [autoPlay]);

  return (
    <main className="resV6Wrap" data-element={element}>
      <section className="resV6Scene" data-phase={phase}>
        <div className="resV6WallGrid" />
        <div className="resV6Grid" />
        <div className="resV6Title">Resonance Evolution</div>
        <div className="resV6Platform" />
        <div className="resV6Rune" aria-hidden="true">{ELEMENTS[element].rune}</div>

        <img className="resV6Kith resV6Hatch" src={hatchlingImage} alt="" />
        <img className="resV6Kith resV6Low" src={evolvedImage} alt="" />

        <div className="resV6Shards">
          {Array.from({ length: 6 }, (_, i) => <i className="resV6Shard" key={i} />)}
        </div>
        <div className="resV6Energy" />
        <div className="resV6Health">
          <div className="resV6HealthTrack"><div className="resV6HealthFill" /></div>
          <div className="resV6HealthNumber" />
        </div>
        <div className="resV6Sparkles">
          {[
            [-420,-220],[-330,150],[380,-180],[430,130],[-180,-260],[190,-250],[-480,20],
            [470,-30],[-250,240],[260,230],[-90,-300],[100,290],[340,240],[-360,-130],
            [310,-80],[0,-310],[0,280],[-440,210],[450,-230],[220,-300]
          ].map(([x,y], i) => (
            <i className="resV6Spark" key={i} style={{"--sx":`${x}px`,"--sy":`${y}px`,"--delay":`-${(i%7)*0.13}s`} as React.CSSProperties} />
          ))}
        </div>
        <div className="resV6EvolvedMsg">Your {kithName} has Evolved</div>
        <div className="resV6Flash" />
      </section>
      <div className="resV6Controls">
        <button type="button" onClick={() => void evolve()} disabled={playing}>{playing ? "PLAYING" : phase === "idle" ? "PLAY" : "REPLAY"}</button>
      </div>
    </main>
  );
}
