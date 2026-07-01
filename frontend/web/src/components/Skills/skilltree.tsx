import { useEffect, useMemo, useState } from "react";
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

const ACTIVE_TALENT_TREE_KEYS: TalentTreeKey[] = ["feral", "aegis", "majo"];

const ROW_UNLOCK_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 4,
  3: 8,
  4: 12,
  5: 16,
  6: 22,
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

function getPetTalentStorageKey(petId: unknown) {
  return petId ? `deltapets:talents:${String(petId)}` : null;
}

function isTalentNodeId(value: string): value is TalentNodeId {
  return TALENT_NODES.some((node) => node.id === value);
}

function normalizeTalentRanks(value: unknown): TalentRanks {
  if (!value || typeof value !== "object") return {};

  return Object.entries(value as Record<string, unknown>).reduce<TalentRanks>(
    (nextRanks, [nodeId, rankValue]) => {
      if (!isTalentNodeId(nodeId)) return nextRanks;

      const rank = Math.max(0, Math.floor(toNumber(rankValue, 0)));
      const node = TALENT_NODES.find((talentNode) => talentNode.id === nodeId);

      if (!node || rank <= 0) return nextRanks;

      nextRanks[nodeId] = Math.min(rank, node.maxRank);
      return nextRanks;
    },
    {},
  );
}

function readSavedTalentRanks(pet?: Record<string, any> | null): TalentRanks {
  const petRanks =
    pet?.talent_ranks ??
    pet?.talentRanks ??
    pet?.talents ??
    pet?.skill_tree_ranks ??
    pet?.skillTreeRanks;

  const normalizedPetRanks = normalizeTalentRanks(petRanks);
  if (Object.keys(normalizedPetRanks).length > 0) return normalizedPetRanks;

  const storageKey = getPetTalentStorageKey(pet?.id);
  if (!storageKey || typeof window === "undefined") return {};

  try {
    const storedBuild = window.localStorage.getItem(storageKey);
    if (!storedBuild) return {};

    const parsedBuild = JSON.parse(storedBuild) as { ranks?: unknown };
    return normalizeTalentRanks(parsedBuild.ranks);
  } catch {
    return {};
  }
}

function getSpentPoints(
  ranks: TalentRanks,
  nodes: TalentNode[] = TALENT_NODES,
) {
  return nodes.reduce((total, node) => {
    return total + getNodeRank(ranks, node.id) * node.costPerRank;
  }, 0);
}

function getTreeNodes(tree: TalentTreeKey) {
  return TALENT_NODES.filter((node) => node.tree === tree);
}

function getEffectsText(node: TalentNode) {
  return node.description;
}

function getTooltipText(node: TalentNode) {
  return [node.description, node.tradeoff ? `Tradeoff: ${node.tradeoff}` : ""]
    .filter(Boolean)
    .join(" ");
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
  const totalPoints = Math.max(0, petLevel - 1) * TALENT_POINTS_PER_LEVEL;

  const [activeTree, setActiveTree] = useState<TalentTreeKey>("feral");
  const [ranks, setRanks] = useState<TalentRanks>(() =>
    readSavedTalentRanks(pet),
  );
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [resetStatus, setResetStatus] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<TalentNodeId | null>(
    "feral-root",
  );

  useEffect(() => {
    setRanks(readSavedTalentRanks(pet));
    setSaveStatus("");
    setResetStatus("");
  }, [pet?.id]);

  const activeTreeNodes = useMemo(() => getTreeNodes(activeTree), [activeTree]);
  const spentPoints = useMemo(
    () => getSpentPoints(ranks, activeTreeNodes),
    [activeTreeNodes, ranks],
  );
  const availablePoints = Math.max(0, totalPoints - spentPoints);

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
    setSaveStatus("");
    setResetStatus("");
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

    setSaveStatus("Unsaved talent changes");

    setRanks((currentRanks) => ({
      ...currentRanks,
      [node.id]: getNodeRank(currentRanks, node.id) + 1,
    }));
  }

  function removeNodeRank(node: TalentNode) {
    setSelectedNodeId(node.id);
    setSaveStatus("Unsaved talent changes");

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
    const activeTreeNodeIds = new Set(activeTreeNodes.map((node) => node.id));

    setRanks((currentRanks) => {
      return Object.fromEntries(
        Object.entries(currentRanks).filter(([nodeId]) => {
          return !activeTreeNodeIds.has(nodeId);
        }),
      ) as TalentRanks;
    });
    setSelectedNodeId(activeTreeNodes[0]?.id ?? null);
    setResetStatus("Reset Successful");
  }

  function saveLocalBuild() {
    const storageKey = getPetTalentStorageKey(pet?.id);

    if (!storageKey || typeof window === "undefined") {
      setSaveStatus("Choose an active pet before saving talents.");
      return;
    }

    const talentBuild = {
      petId: pet?.id,
      activeTree,
      totalPoints,
      spentPoints,
      availablePoints,
      totalSpentPoints: getSpentPoints(ranks),
      ranks,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(storageKey, JSON.stringify(talentBuild));
    window.dispatchEvent(
      new CustomEvent("deltapets:talents-saved", { detail: talentBuild }),
    );

    setSaveStatus("Talents saved to this pet.");
  }

  return (
    <section
      className="skillTreeModal feralPathPanel dpPopupWindow dp-blue-grid-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Kith Talent System"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span className="feralPathComet" aria-hidden="true" />

      <div className="talentTreeHeader">
        <div className="talentTreeHeaderCopy">
          <h3 className="talentTreeTitle">{TALENT_TREE_LABELS[activeTree]}</h3>
        </div>

        <div className="talentTreeHeaderActions">
          <div className="talentPointPanel">
            <div>
              <span>Your Points</span>
              <strong>{totalPoints}</strong>
            </div>

            <div>
              <span>Used Points</span>
              <strong>{spentPoints}</strong>
            </div>

            <div>
              <span>Unused Points</span>
              <strong>{availablePoints}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="talentTreeLegend" aria-label="Talent tree paths">
        {ACTIVE_TALENT_TREE_KEYS.map((treeKey) => (
          <button
            key={treeKey}
            type="button"
            className={activeTree === treeKey ? "is-active" : ""}
            onClick={() => openTree(treeKey)}
          >
            {TALENT_TREE_LABELS[treeKey]}
          </button>
        ))}

        <button type="button" disabled>
          {TALENT_TREE_LABELS.genesis}
        </button>
      </div>

      {activeTreeNodes.length <= 0 ? (
        <div className="talentTreeEmptyState">
          <h4>No talents built yet</h4>
          <p>This path does not have battle talents wired in yet.</p>
        </div>
      ) : (
        <>
          <div className={`talentTreeBoard talentTreeBoard--${activeTree}`}>
            <button
              type="button"
              className="talentResetHeaderButton talentResetBoardButton"
              onClick={resetLocalBuild}
            >
              Reset Local Build
            </button>

            <p className="talentResetBoardStatus">{resetStatus}</p>

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
              <div className="talentNodeInfoRow">
                <span className="talentInfoLabel">Talent Skill</span>
                <span className="talentInfoValue">{selectedNode.name}</span>

                <span className="talentInfoLabel">Talent Effect</span>
                <span className="talentInfoValue">
                  {getEffectsText(selectedNode)}
                  {selectedNode.tradeoff ? (
                    <span className="talentNodeTradeoff">
                      {selectedNode.tradeoff}
                    </span>
                  ) : null}
                </span>
              </div>

              <div className="talentDetailsButtons">
                <div className="talentSaveRow">
                  <p className="talentTreeSaveStatus">{saveStatus}</p>

                  <button
                    type="button"
                    className="skillPopupClose talentSaveButton"
                    onClick={saveLocalBuild}
                  >
                    Save Talents
                  </button>
                </div>

                <button
                  type="button"
                  className="skillPopupClose talentDetailsClose dp-btn--close"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </aside>
          ) : null}
        </>
      )}
    </section>
  );
}
