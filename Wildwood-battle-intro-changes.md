filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 28
old_code:
```
  const [showBattle, setShowBattle] = useState(false);
```
new_code:
```
  const [showBattle, setShowBattle] = useState(false);
  const [introBattleId, setIntroBattleId] = useState<string | null>(null);
  const introducedBattles = useRef(new Set<string>());
```
description: Track intro presentation and deduplicate by confirmed battle ID.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 289
old_code:
```
  const canExplore =
    !busy &&
```
new_code:
```
  useEffect(() => {
    if (!introBattleId) return;
    const timer = window.setTimeout(() => {
      setIntroBattleId(null);
      if (room?.battle?.id === introBattleId && room.battle.status === "active") {
        setShowBattle(true);
      }
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1500);
    return () => window.clearTimeout(timer);
  }, [introBattleId, room?.battle?.id, room?.battle?.status]);

  const canExplore =
    !introBattleId &&
    !busy &&
```
description: Bounded timer opens only the same active battle, cleans up on unmount, and skips animation for reduced motion.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 198
old_code:
```
      setShowBattle(false);
```
new_code:
```
      const battle = next.room?.battle;
      if (next.room?.corrupted && battle?.status === "active") {
        if (!introducedBattles.current.has(battle.id)) {
          introducedBattles.current.add(battle.id);
          setIntroBattleId(battle.id);
          setShowBattle(false);
        } else {
          setShowBattle(true);
        }
      } else {
        setShowBattle(false);
      }
```
description: Start only from the existing successful exploration response; duplicate IDs open directly without replay.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 488
old_code:
```
                <WildwoodScene room={room} step={pathStep} />
```
new_code:
```
                <WildwoodScene room={room} step={pathStep} />
                {introBattleId && (
                  <div key={introBattleId} className="ww-battle-intro" role="status" aria-label="Battle starting">
                    <span className="ww-battle-intro__streak ww-battle-intro__streak--cyan" aria-hidden="true" />
                    <span className="ww-battle-intro__streak ww-battle-intro__streak--purple" aria-hidden="true" />
                    <span className="ww-battle-intro__pulse" aria-hidden="true" />
                    <strong className="ww-battle-intro__title" aria-hidden="true">BATTLE!</strong>
                  </div>
                )}
```
description: Overlay only the existing scene panel without moving other sections.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodExploreResult.tsx
linenumber: 187
old_code:
```
          <button
            className="dp-btn dp-btn--yellow"
            disabled={busy}
            onClick={onBattle}
          >
            Continue to battle
          </button>
```
new_code:
```
          {!room.corrupted && (
            <button
              className="dp-btn dp-btn--yellow"
              disabled={busy}
              onClick={onBattle}
            >
              Continue to battle
            </button>
          )}
```
description: Corrupted encounters enter automatically; preserve the manual route for non-corrupted encounters.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 779
old_code:
```
(insertion)
```
new_code:
```

/* Scene-only battle introduction: one surge, impact, pulse and reveal. */
.ww-art-panel > .ww-battle-intro {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: inherit;
  background: rgba(3, 12, 32, 0.78);
  container-type: inline-size;
  animation: wwIntroReveal 1500ms ease both;
}

.ww-battle-intro__title {
  z-index: 2;
  color: var(--dp-title-gold, #ffdf75);
  font-family: var(--font-heading);
  font-size: clamp(1.5rem, 13cqw, 5rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.04em;
  text-shadow: 2px 3px 0 #061426, -2px -2px 0 #061426,
    0 0 14px #67e8f9, 0 0 28px #a970ed;
  animation: wwIntroImpact 1500ms ease both;
}

.ww-battle-intro__streak {
  position: absolute;
  top: 50%;
  width: 80%;
  height: 3px;
  background: #67e8f9;
  box-shadow: 0 0 12px currentColor;
  color: #67e8f9;
  animation: wwIntroStreak 1500ms ease both;
}

.ww-battle-intro__streak--purple {
  color: #c084fc;
  background: #c084fc;
  top: calc(50% + 6px);
  animation-name: wwIntroStreakReverse;
}

.ww-battle-intro__pulse {
  position: absolute;
  width: 42%;
  aspect-ratio: 1;
  border: 2px solid #67e8f9;
  border-radius: 50%;
  background: radial-gradient(circle, #a970ed55, transparent 70%);
  box-shadow: 0 0 22px #a970ed;
  animation: wwIntroPulse 1500ms ease-out both;
}

@keyframes wwIntroReveal {
  0% { opacity: 0; }
  12%, 75% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes wwIntroImpact {
  0%, 16% { opacity: 0; transform: scale(0.45); }
  25% { opacity: 1; transform: scale(1.12); }
  36%, 73% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.2); }
}

@keyframes wwIntroStreak {
  0% { opacity: 0; transform: translateX(-130%) scaleX(0.3); }
  17%, 73% { opacity: 1; transform: translateX(0) scaleX(1); }
  100% { opacity: 0; transform: scaleX(0); }
}

@keyframes wwIntroStreakReverse {
  0% { opacity: 0; transform: translateX(130%) scaleX(0.3); }
  17%, 73% { opacity: 1; transform: translateX(0) scaleX(1); }
  100% { opacity: 0; transform: scaleX(0); }
}

@keyframes wwIntroPulse {
  0%, 15% { opacity: 0; transform: scale(0.1); }
  18% { opacity: 0.65; transform: scale(0.4); }
  28%, 43% { opacity: 0; transform: scale(0.5); }
  47% { opacity: 0.75; transform: scale(0.6); }
  73%, 100% { opacity: 0; transform: scale(1.8); }
}

@media (prefers-reduced-motion: reduce) {
  .ww-art-panel > .ww-battle-intro,
  .ww-battle-intro > * {
    animation: none;
  }
  .ww-battle-intro__streak,
  .ww-battle-intro__pulse {
    display: none;
  }
}

```
description: Add scoped CSS-only 1.5-second effects and reduced-motion styling.