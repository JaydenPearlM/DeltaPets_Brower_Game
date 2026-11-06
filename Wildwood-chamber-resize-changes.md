filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 38
old_code:
```css
.ww-exploration-layout {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(520px, 2.6fr) minmax(0, 1.6fr);
  align-items: start;
  gap: 16px;
```
new_code:
```css
.ww-exploration-layout {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(300px, 1.6fr) minmax(0, 2.6fr);
  align-items: start;
  gap: 16px;
```
description: Reallocate middle-column width to scenery and compact only Wildwood Chamber spacing; keep original shared styles untouched.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 906
old_code:
```css
  flex: 0 0 auto;
}
```
new_code:
```css
  flex: 0 0 auto;
}

/* Compact Chamber presentation only inside Wildwood. */
.ww-middle-column > .skillsPanel {
  min-width: 0;
  padding: 16px;
}
.ww-middle-column > .skillsPanel::before {
  inset: 5px;
}
.ww-middle-column .skillsTitle {
  font-size: 1.15rem !important;
  line-height: 1.3;
  letter-spacing: 0.02em !important;
  white-space: normal !important;
  transform: none;
}
.ww-middle-column .skillsPanelHeader {
  margin-bottom: 10px;
}
.ww-middle-column .skillChamberControlsRow {
  flex-wrap: wrap !important;
  gap: 8px;
  margin-bottom: 10px;
}
.ww-middle-column .skillCenterActionRow {
  min-width: 0;
  max-width: 100%;
}
.ww-middle-column .skillCenterActionRow > button {
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}
.ww-middle-column .skillInventoryPanel {
  padding: 8px;
  min-width: 0;
}
.ww-middle-column .skillChamberStatusRow {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 8px;
}
.ww-middle-column .skillChamberPetBadge,
.ww-middle-column .skillChamberBars {
  min-width: 0;
  min-height: 44px;
  padding: 6px;
  overflow-wrap: anywhere;
}
.ww-middle-column .skillChamberPetBadge strong {
  font-size: 0.9rem;
  line-height: 1.2;
}
.ww-middle-column .skillChamberBarLine {
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 4px;
}
.ww-middle-column .skillChamberBarLine span {
  font-size: 0.8rem;
}
.ww-middle-column .skillChamberCommandPanel {
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 5px;
}
.ww-middle-column .skillChamberCommandOrb {
  width: 64px;
  height: 64px;
  box-sizing: border-box;
}
.ww-middle-column .skillChamberBattleSlots {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}
.ww-middle-column .skillChamberBattleSlot {
  min-width: 0;
  min-height: 44px;
  padding: 5px;
  overflow-wrap: anywhere;
}
.ww-middle-column .skillChamberBattleSlot strong {
  font-size: 0.75rem;
  line-height: 1.25;
}
```
description: Reallocate middle-column width to scenery and compact only Wildwood Chamber spacing; keep original shared styles untouched.