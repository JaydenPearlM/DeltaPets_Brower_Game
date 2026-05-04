import { useMemo, useState } from "react";
import {
  TALENT_NODES,
  TALENT_POINTS_PER_LEVEL,
  TALENT_TREE_LABELS,
  type TalentNode,
  type TalentNodeId,
  type TalentTreeKey,
} from "./talentTreeRegistry";
import "./talentTrees/feralPath.css";
import "./skillTree.css";

type SkillTreeProps = {
  pet?: Record<string, any> | null;
  onClose: () => void;
};

type TalentRanks = Partial<Record<TalentNodeId, number>>;

// ─── ROW UNLOCK THRESHOLDS ─────────────────────────────────
// WoW-style: rows unlock by total points spent in tree.
// Row 1 (root) always available. Each subsequent row requires
// a minimum total spend before any talent in that row lights up.
const ROW_UNLOCK_THRESHOLDS: Record<number, number> = {
  1: 0, // root
  2: 4,
  3: 8,
  4: 12,
  5: 16,
  6: 22, // capstone row
};

function getRowForLevel(requiredLevel: number): number {
  if (requiredLevel <= 1) return 1;
  if (requiredLevel <= 2) return 2;
  if (requiredLevel <= 4) return 3;
  if (requiredLevel <= 6) return 4;
  if (requiredLevel <= 8) return 5;
  return 6;
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getPetLevel(pet?: Record<string, any> | null) {
  return Math.max(1, toNumber(pet?.level, 1));
}

function getNodeRank(ranks: TalentRanks, nodeId: TalentNodeId) {
  return ranks[nodeId] ?? 0;
}

function getSpentPoints(ranks: TalentRanks) {
  return TALENT_NODES.reduce((total, node) => {
    return total + getNodeRank(ranks, node.id) * node.costPerRank;
  }, 0);
}

function getTreeNodes(tree: TalentTreeKey) {
  return TALENT_NODES.filter((node) => node.tree === tree);
}

function getEffectsText(node: TalentNode) {
  if (node.effects.length === 0) return "No stat effect listed";

  return node.effects
    .map((effect) => {
      const sign = effect.value > 0 ? "+" : "";
      return `${sign}${effect.value} ${effect.type.split("_").join(" ")}`;
    })
    .join(", ");
}

function getTooltipText(node: TalentNode) {
  return getEffectsText(node);
}

function getNodeState({
  node,
  ranks,
  petLevel,
  availablePoints,
  spentPoints,
}: {
  node: TalentNode;
  ranks: TalentRanks;
  petLevel: number;
  availablePoints: number;
  spentPoints: number;
}) {
  const rank = getNodeRank(ranks, node.id);
  const isMaxed = rank >= node.maxRank;
  const hasLevel = petLevel >= node.requiredLevel;
  const hasPoints = availablePoints >= node.costPerRank;

  // WoW-style row gating: check if enough total points have been
  // spent to unlock this row
  const row = getRowForLevel(node.requiredLevel);
  const threshold = ROW_UNLOCK_THRESHOLDS[row] ?? 0;
  const rowUnlocked = spentPoints >= threshold;

  const canUpgrade = !isMaxed && hasLevel && hasPoints && rowUnlocked;

  return {
    rank,
    isMaxed,
    hasLevel,
    hasPoints,
    rowUnlocked,
    canUpgrade,
  };
}

export default function SkillTree({ pet, onClose }: SkillTreeProps) {
  const petLevel = getPetLevel(pet);
  const totalPoints = petLevel * TALENT_POINTS_PER_LEVEL;

  const [activeTree, setActiveTree] = useState<TalentTreeKey | null>("feral");
  const [ranks, setRanks] = useState<TalentRanks>({});
  const [selectedNodeId, setSelectedNodeId] = useState<TalentNodeId | null>(
    "feral-root",
  );

  const spentPoints = useMemo(() => getSpentPoints(ranks), [ranks]);
  const availablePoints = Math.max(0, totalPoints - spentPoints);
  const activeTreeNodes = activeTree ? getTreeNodes(activeTree) : [];

  const selectedNode =
    selectedNodeId !== null
      ? (TALENT_NODES.find((node) => node.id === selectedNodeId) ?? null)
      : (activeTreeNodes[0] ?? null);

  const selectedState = selectedNode
    ? getNodeState({
        node: selectedNode,
        ranks,
        petLevel,
        availablePoints,
        spentPoints,
      })
    : null;

  function openTree(tree: TalentTreeKey) {
    const nodes = getTreeNodes(tree);
    setActiveTree(tree);
    setSelectedNodeId(nodes[0]?.id ?? null);
  }

  function upgradeNode(node: TalentNode) {
    const state = getNodeState({
      node,
      ranks,
      petLevel,
      availablePoints,
      spentPoints,
    });

    setSelectedNodeId(node.id);

    if (!state.canUpgrade) return;

    setRanks((currentRanks) => ({
      ...currentRanks,
      [node.id]: getNodeRank(currentRanks, node.id) + 1,
    }));
  }

  function removeNodeRank(node: TalentNode) {
    setSelectedNodeId(node.id);

    setRanks((currentRanks) => {
      const currentRank = getNodeRank(currentRanks, node.id);

      if (currentRank <= 0) return currentRanks;

      return {
        ...currentRanks,
        [node.id]: currentRank - 1,
      };
    });
  }

  function resetLocalBuild() {
    setRanks({});
    setSelectedNodeId(activeTreeNodes[0]?.id ?? null);
  }

  function saveLocalBuild() {
    console.log("Talent tree build ready for Supabase:", {
      petId: pet?.id,
      activeTree,
      totalPoints,
      spentPoints,
      ranks,
    });
  }

  // Figure out which row the selected node is in for display
  const selectedRow = selectedNode
    ? getRowForLevel(selectedNode.requiredLevel)
    : null;
  const selectedRowThreshold =
    selectedRow !== null ? (ROW_UNLOCK_THRESHOLDS[selectedRow] ?? 0) : 0;

  return (
    <section
      className="skillTreeModal feralPathPanel"
      role="dialog"
      aria-modal="true"
      aria-label="Kith Talent System"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span className="feralPathComet" aria-hidden="true" />

      <div className="talentTreeHeader">
        <div className="talentTreeHeaderCopy">
          <h3 className="talentTreeTitle">
            {activeTree ? TALENT_TREE_LABELS[activeTree] : "Choose a Path"}
          </h3>

          <p className="talentTreeSubtitle">
            You have 4 points. Spend them wisely.
          </p>
        </div>

        <div className="talentTreeHeaderActions">
          <div className="talentPointPanel">
            <span>Available</span>
            <strong>{availablePoints}</strong>
            <small>
              {spentPoints} / {totalPoints} spent
            </small>
          </div>
        </div>

        <button type="button" className="skillPopupClose" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="talentTreeLegend" aria-label="Talent tree paths">
        <button type="button" onClick={() => openTree("feral")}>
          {TALENT_TREE_LABELS.feral}
        </button>

        <button type="button" disabled>
          {TALENT_TREE_LABELS.aegis}
        </button>

        <button type="button" disabled>
          {TALENT_TREE_LABELS.majo}
        </button>

        <button type="button" disabled>
          {TALENT_TREE_LABELS.genesis}
        </button>
      </div>

      {!activeTree ? (
        <div className="talentTreeEmptyState">
          <h4>Select Feral Path</h4>
          <p>
            Feral Path is ready first. Aegis, Majo, and Genesis can be wired in
            after this path feels good.
          </p>
        </div>
      ) : (
        <>
          <div className="talentTreeBoard talentTreeBoard--feral">
            {/* No SVG lines. WoW-style: nodes sit in a grid. */}

            {activeTreeNodes.map((node) => {
              const state = getNodeState({
                node,
                ranks,
                petLevel,
                availablePoints,
                spentPoints,
              });

              return (
                <button
                  key={node.id}
                  type="button"
                  className={[
                    "talentNode",
                    `talentNode--${node.tree}`,
                    `talentNode--${node.id}`,
                    `talentNode--shape-${node.shape}`,
                    node.branch ? `talentNode--branch-${node.branch}` : "",
                    state.rank > 0 ? "is-ranked" : "",
                    state.canUpgrade ? "can-upgrade" : "",
                    !state.rowUnlocked ? "is-row-locked" : "",
                    selectedNodeId === node.id ? "is-selected" : "",
                  ].join(" ")}
                  style={{
                    left: `${node.position.x}%`,
                    top: `${node.position.y}%`,
                  }}
                  data-tooltip={getTooltipText(node)}
                  onClick={() => upgradeNode(node)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    removeNodeRank(node);
                  }}
                >
                  <span className="talentNodeShape" aria-hidden="true">
                    <span className="talentNodeInset" />
                  </span>

                  <span className="talentNodeName">{node.name}</span>

                  <strong className="talentNodeRank">
                    {state.rank}/{node.maxRank}
                  </strong>
                </button>
              );
            })}
          </div>

          {selectedNode && selectedState ? (
            <aside className="talentNodeDetails">
              <div className="talentNodeDetailsMain">
                <p className="skillPopupEyebrow">Selected Node</p>

                <h4>{selectedNode.name}</h4>

                <p>{selectedNode.description}</p>

                {selectedNode.tradeoff ? (
                  <p className="talentNodeTradeoff">
                    <span>Tradeoff</span>
                    {selectedNode.tradeoff}
                  </p>
                ) : null}

                <p className="talentNodeRowUnlock">
                  <span>Row Unlock</span>
                  {selectedRowThreshold} points spent in tree
                </p>
              </div>

              <ul className="talentNodeDetailsStats">
                <li>
                  Rank: {selectedState.rank} / {selectedNode.maxRank}
                </li>
                <li>Cost: {selectedNode.costPerRank} point per rank</li>
                <li>Requires Level: {selectedNode.requiredLevel}</li>
                <li>
                  Status:{" "}
                  {selectedState.canUpgrade
                    ? "Can upgrade"
                    : selectedState.isMaxed
                      ? "Maxed"
                      : !selectedState.rowUnlocked
                        ? `Locked (need ${selectedRowThreshold} pts spent)`
                        : "Locked"}
                </li>
              </ul>
            </aside>
          ) : null}

          <div className="talentTreeActions">
            <button type="button" onClick={resetLocalBuild}>
              Reset Local Build
            </button>

            <button type="button" onClick={saveLocalBuild}>
              Save Build Preview
            </button>
          </div>
        </>
      )}
    </section>
  );
}
