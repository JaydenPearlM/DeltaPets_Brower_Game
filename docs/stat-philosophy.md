# DeltaPets Alpha — Stat Philosophy (0–10)

## Goals

- Stats must feel consistent across battles and pet care.
- A pet should not randomly “change personality” or “lose base power” after hatch.
- All stat changes must be explainable: birth roll, level-up allocation, equipment/buffs, status effects.

---

## 1) Which stats are stored raw? (DB truth)

These are saved in the database and treated as the source of truth.

### Immutable raw stats (set at hatch / creation)

- Base stat roll (the pet's genetics / hatch roll):
  - base_hp
  - base_atk
  - base_magi
  - base_def
  - base_speed
- Personality (one trait)
- Species / line / appearance seed (if used)
- Elemental affinity seed (if used)

### Mutable raw stats (saved + can change)

- Level (0–10 for Alpha)
- Stat allocation points spent by player:
  - alloc_hp
  - alloc_atk
  - alloc_magi
  - alloc_def
    \- alloc_speed
- Element training progression:
  - element_xp per element
  - element_level per element (optional)
- Current “care” meters (non-battle):
  - hunger
  - cleanliness
  - happiness / mood / energy (whatever you chose)

### Battle state raw stats (saved only if you need persistence)

- current_hp (only if battles persist across refresh)
- status effects (only if battles persist across refresh)

---

## 2) Which stats are derived in frontend? (computed)

These are computed from raw values + rules. The frontend should NEVER invent base stats.

### Derived combat stats

- max_hp = base_hp + alloc_hp + gear_hp + buffs_hp
- atk = base_atk + alloc_atk + gear_atk + buffs_atk
- magi = base_magi + alloc_magi + gear_magi + buffs_magi
- def = base_def + alloc_def + gear_def + buffs_def
- resist = base_resist + alloc_resist + gear_resist + buffs_resist
- speed = base_speed + alloc_speed + gear_speed + buffs_speed

### Derived progression

- total_points_birth = sum(base stats)
- total_points_alloc = sum(alloc stats)
- points_remaining = (points_per_level \* level + starter_alloc_bonus) - total_points_alloc

### Derived element access (for skills)

- pet_has_element(E) = element_level[E] >= required_level (or element_xp threshold)
- skill_eligible(skill) = all required elements are trained enough

---

## 3) What is immutable after hatch?

Once the egg hatches into a baby, these cannot change (Alpha rule):

- base stat roll (the “genetics” numbers)
- personality trait
- original species/line (unless evolution later)
- hatch timestamp / birth timestamp

Optional immutable:

- “true element” seed (if you use “null baby becomes ice later” logic)

---

## 4) What can never go below zero?

Hard floor rules (always clamp >= 0):

- currency (dots, crystals)
- inventory quantity
- element_xp (cannot be negative)
- stat allocations (alloc values cannot be negative)
- care meters (hunger/cleanliness/etc.)
- HP during battle: current_hp floor is 0

---

## 5) What resets on level up? (if anything)

Default: NOTHING resets on level up.

Level up does:

- +1 level
- grants +N allocation points (player chooses where to spend)
- may restore HP to max_hp (DECIDE THIS):
  - Option A: restore fully on level up (more casual)
  - Option B: restore partially (more RPG-ish)
  - Option C: no restore (hardcore)

Level up does NOT:

- reroll base stats
- remove spent allocation points
- change elements
- change personality

---

## 6) Alpha numeric rules (write these down so you don’t reinvent them)

### Base stat roll at hatch

- Total base points at hatch: **\_\_\_\_**
- Max per stat at hatch: **\_\_\_\_** (you mentioned “baby can only have 10 per stat”)

### Level-up allocation

- Points gained per level: **\_\_\_\_**
- Total allocation points by level 10: **\_\_\_\_**

### Buff stacking rules (for later, but define now)

- Battle food buffs:
  - temporary for battle only OR temporary for X minutes?
  - stackable? Y/N
- Equipment:
  - permanent while equipped
  - cannot change base stats

---

## 7) Why HP feels wrong (future sanity section)

If HP feels wrong, check:

- Are we using max_hp consistently?
- Are we clamping current_hp >= 0?
- Are we accidentally double-adding alloc stats?
- Is level-up restoring HP and causing “free heals” unexpectedly?
