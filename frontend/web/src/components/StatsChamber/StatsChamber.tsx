import { titleCase } from "@/lib/petUtils";
import Armory from "@/pages/petsPage/components/Armory/Armory";
import "./StatsChamber.css";

type PetRecord = Record<string, any>;

const STAT_ORDER = ["hp", "atk", "def", "spd", "magi", "mana"] as const;

const STAT_LABELS: Record<(typeof STAT_ORDER)[number], string> = {
  hp: "HP",
  atk: "Attack",
  def: "Defense",
  spd: "Speed",
  magi: "Magi",
  mana: "Mana",
};

type StatKey = (typeof STAT_ORDER)[number];

type ElementRow = {
  key: string;
  label: string;
  value: number;
  active: boolean;
};

type StatsChamberProps = {
  pet: PetRecord;
  petLabel?: string | null;
  totalStats: Record<StatKey, number>;
  elementRows: ElementRow[];
  petElementTheme: string;
  growthTraits: {
    strongStats: StatKey[];
    weakStat: StatKey | null;
  };
  onOpenSkillTree: () => void;
};

function SectionPill({ title }: { title: string }) {
  return (
    <h3 className="petRepoSectionPill dp-standard-panel-section-title">
      {title}
    </h3>
  );
}

export default function StatsChamber({
  pet,
  petLabel,
  totalStats,
  elementRows,
  petElementTheme,
  growthTraits,
  onOpenSkillTree,
}: StatsChamberProps) {
  return (
    <article className="statsChamber dp-standard-panel">
      <h2 className="statsChamberTitle dp-standard-panel-title">
        Stats Chamber
      </h2>
      {petLabel ? (
        <p
          className="statsChamberPetLabel"
          data-element={
            elementRows.find((row) => row.active)?.key ?? petElementTheme
          }
        >
          {petLabel}
        </p>
      ) : null}

      <p
        className="statsChamberPetName"
        style={{ color: `var(--element-${petElementTheme})` }}
      >
        {pet.nickname?.trim?.() ||
          pet.name?.trim?.() ||
          pet.species_name?.trim?.() ||
          pet.species?.trim?.() ||
          "Your Delta"}
      </p>

      <div className="petRepoDataTwoCol">
        <section className="petRepoInfoSection petRepoInfoSection--stats statsChamberSubPanel">
          <SectionPill title="Stats:" />

          <div className="petRepoStatList">
            {STAT_ORDER.map((statKey) => {
              const value = totalStats[statKey];
              const rowClassNames = ["petRepoInfoRow"];

              if (growthTraits.strongStats.includes(statKey)) {
                rowClassNames.push("is-strong-stat");
              }

              if (growthTraits.weakStat === statKey) {
                rowClassNames.push("is-weak-stat");
              }

              return (
                <div key={statKey} className={rowClassNames.join(" ")}>
                  <span>{STAT_LABELS[statKey]}</span>
                  <span>{String(value)}</span>
                </div>
              );
            })}
          </div>

          <div className="petRepoPassiveTraitCard">
            <div className="petRepoPassiveTraitHeader">
              <span>Passive Trait</span>
              <span
                className="petRepoPassiveTraitRarity"
                data-rarity={(
                  pet.passive_trait_rarity ?? "Common"
                ).toLowerCase()}
              >
                {pet.passive_trait_rarity ?? "Common"}
              </span>
            </div>

            <h3 className="petRepoPassiveTraitName">
              <span className="petRepoPassiveTraitStar" aria-hidden="true">
                ★
              </span>
              <span>
                {pet.passive_trait_name ??
                  titleCase(pet.passive_trait_key ?? "Unknown Trait")}
              </span>
            </h3>

            <p>
              {pet.passive_trait_description ??
                "Kindness isn't weakness. It's how they win."}
            </p>

            <div className="petRepoPassiveTraitEffects">
              <strong>Battle Effect:</strong>
              <span>
                {pet.passive_trait_effect_summary ??
                  "Battle bonus will appear here once this passive is fully connected."}
              </span>
            </div>
          </div>
        </section>

        <section
          className={`petRepoInfoSection petRepoInfoSection--elements statsChamberSubPanel petRepoPanel--element petRepoPanel--element-${petElementTheme}`}
        >
          <SectionPill title="Element Stats:" />

          <div className="petRepoStatList">
            {elementRows.map((row) => {
              const rowClassNames = [
                "petRepoInfoRow",
                `petRepoInfoRow--element-${row.key}`,
              ];

              if (row.active) {
                rowClassNames.push("is-active-element");
              }

              return (
                <div key={row.key} className={rowClassNames.join(" ")}>
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="petRepoSkillTreeButton btn btn-gold"
            onClick={onOpenSkillTree}
          >
            Skill Trees
          </button>
        </section>
      </div>

      <Armory />
    </article>
  );
}
