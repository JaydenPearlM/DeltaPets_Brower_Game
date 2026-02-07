// src/features/achievements/achievement.tsx
import { useState } from "react";
import "./achievement.css";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "obtain_pet",
    title: "Obtain Pet",
    description: "Hatch your very first Delta.",
    unlocked: true, // mock true for now
  },
  {
    id: "daily_quest",
    title: "Daily Quest",
    description: "Complete your first daily quest.",
    unlocked: false,
  },
  {
    id: "first_bond",
    title: "First Bond",
    description: "Interact with your Delta for the first time.",
    unlocked: false,
  },
  {
    id: "caregiver",
    title: "Caregiver",
    description: "Feed, clean, and bond with your Delta in one day.",
    unlocked: false,
  },
  {
    id: "its_alive",
    title: "It’s Alive!",
    description: "Hatch an egg.",
    unlocked: true,
  },
];

export function AchievementButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="achievement-button" onClick={() => setOpen(true)}>
        Achievements
      </button>

      {open && (
        <div className="achievement-panel">
          <div className="achievement-header">
            <h2>Achievements</h2>
            <button className="close-btn" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="achievement-list">
            {ACHIEVEMENTS.map((a) => (
              <div
                key={a.id}
                className={`achievement-card ${
                  a.unlocked ? "unlocked" : "locked"
                }`}
              >
                <div className="achievement-title">{a.title}</div>
                <div className="achievement-desc">{a.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
