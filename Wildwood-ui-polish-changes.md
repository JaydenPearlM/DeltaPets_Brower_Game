filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 398
old_code:
```tsx
(["Eggs"] as const)
```
new_code:
```tsx
(["Eggs", "Relics", "Etchings", "Clothes"] as const)
```
description: Restore the four category headings requested in this latest brief; collection state is unchanged.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 422
old_code:
```tsx
className="ww-explore-viewport"
```
new_code:
```tsx
className="ww-explore-viewport dp-standard-panel"
```
description: Use the existing panel system for the middle controls.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 460
old_code:
```tsx
className="ww-art-panel"
```
new_code:
```tsx
className="ww-art-panel dp-standard-panel"
```
description: Use the existing grid panel system for the artwork viewport.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 38
old_code:
```css
grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) minmax(0, 3fr);
```
new_code:
```css
grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 2.8fr);
```
description: Give compact team content more room while keeping the viewport largest.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 41
old_code:
```css
  margin-top: 24px;
  padding-top: 24px;
```
new_code:
```css
  margin-top: 20px;
  padding-top: 0;
```
description: Remove doubled blank space above exploration.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 54
old_code:
```css
  border-left: 1px solid var(--dp-panel-border);
  background: rgba(3, 20, 38, 0.7);
```
new_code:
```css
  border-left: 1px solid var(--dp-panel-border);
  background-color: #031426;
```
description: Retain the shared grid background image with a dark-blue interior.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 63
old_code:
```css
  overflow: hidden;
  border: 1px solid var(--dp-panel-border);
```
new_code:
```css
  overflow: hidden;
  padding: 0;
  margin: 0;
  border: 1px solid var(--dp-panel-border);
```
description: Keep the viewport aligned and remove shared panel spacing from its fixed ratio.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 120
old_code:
```css
.ww-scene__art {
  display: block;
  width: 100%;
  height: 100%;
}
```
new_code:
```css
/* Keep temporary vector scenery hidden while awaiting approved artwork.
   Scene selection and the existing caption remain available. */
.ww-art-panel .ww-scene > svg.ww-scene__art {
  display: none;
}
```
description: Hide only the temporary SVG illustration, preserving the scene caption and component.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 159
old_code:
```css
  margin: 24px 0;
  overflow-wrap: anywhere;
```
new_code:
```css
  margin: 16px 0 0;
  overflow-wrap: anywhere;
```
description: Place Recent Finds compactly below the fourth team slot.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 265
old_code:
```css
  gap: 5px;
  padding: 0;
  list-style: none;
```
new_code:
```css
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
```
description: Keep exactly 5px between slots and remove browser list margins.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 321
old_code:
```css
.ww-explore-viewport {
  min-width: 0;
  min-height: 0;
  margin-top: 0;
}
```
new_code:
```css
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

.ww-recent-finds > h2 {
  margin: 0 0 12px;
}
```
description: Align the middle panel vertically with consistent padding; scope specificity preserves padding against mobile overrides.