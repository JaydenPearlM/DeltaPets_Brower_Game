filename: frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
linenumber: 422
old_code:
```
className="ww-explore-viewport dp-standard-panel"
```
new_code:
```
className="ww-explore-viewport"
```
description: Remove the nested standard-panel inset border that crowds Path content.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
linenumber: 460
old_code:
```
className="ww-art-panel dp-standard-panel"
```
new_code:
```
className="ww-art-panel"
```
description: Keep the outer standard panel intact; avoid nested border overlays on the scene.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 38
old_code:
```
grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 2.8fr);
```
new_code:
```
grid-template-columns: minmax(150px, 1fr) minmax(210px, 1.3fr) minmax(0, 3fr);
```
description: Reserve readable team/control widths while retaining the dominant scene column.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 52
old_code:
```
  aspect-ratio: 16 / 9;
```
new_code:
```
  /* The artwork itself retains 16:9; the caption follows below it. */
```
description: Let the scene wrapper accommodate its caption without clipping artwork.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 78
old_code:
```
  position: absolute;
  inset: 0;
  margin: 0;
```
new_code:
```
  position: relative;
  margin: 0;
```
description: Return the scene figure to normal flow so its height includes the caption.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 119
old_code:
```
/* Keep temporary vector scenery hidden while awaiting approved artwork.
   Scene selection and the existing caption remain available. */
.ww-art-panel .ww-scene > svg.ww-scene__art {
  display: none;
}
```
new_code:
```
/* Existing approved placeholder artwork; no new illustration. */
.ww-art-panel .ww-scene > svg.ww-scene__art {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: contain;
}
```
description: Restore the existing vector placeholders with proportional widescreen sizing.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 128
old_code:
```
.ww-scene__caption {
  position: absolute;
  inset: auto 0 0;
```
new_code:
```
.ww-scene__caption {
  position: relative;
```
description: Place the location caption beneath the artwork instead of covering it.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 133
old_code:
```
  background: linear-gradient(transparent, rgba(3, 20, 38, 0.96) 35%);
```
new_code:
```
  background: #031426;
```
description: Use a clean dark-blue caption bar.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 152
old_code:
```
@media (max-width: 800px) {
```
new_code:
```
@media (max-width: 1000px) {
```
description: Stack before the desktop minimum column widths become cramped; mobile stays single-column.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 322
old_code:
```
.ww-page .ww-exploration-layout > .ww-explore-viewport {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid var(--dp-panel-border);
  border-radius: 8px;
}
```
new_code:
```
.ww-page .ww-exploration-layout > .ww-explore-viewport {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 16px;
  box-sizing: border-box;
  border: 1px solid var(--dp-panel-border);
  border-radius: 8px;
  background-color: #031426;
  box-shadow: inset 0 0 0 1px var(--dp-panel-purple-border);
  overflow-wrap: anywhere;
}

.ww-exploration-layout > .ww-explore-viewport,
.ww-exploration-layout > .ww-art-panel {
  background-image: var(--dp-standard-panel-blue-grid);
  background-size: var(--dp-popup-grid-size) var(--dp-popup-grid-size);
}

.ww-explore-viewport .ww-explore-control > .dp-btn {
  box-sizing: border-box;
  max-width: 100%;
  overflow-wrap: anywhere;
}
```
description: Use a single scoped cyan/purple panel, shared grid texture and intrinsic height; keep wrapped controls inside.