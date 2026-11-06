filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 272
old_code:
```tsx
  const room = session?.room;
```
new_code:
```tsx
  const room = session?.room;
  const pathStep = Math.min(100, Math.max(0, room?.sequence ?? visitSteps));
```
description: Use the existing persisted room sequence for display; retain the visit counter as fallback. No stored values change.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 439
old_code:
```tsx
                      step={visitSteps}
```
new_code:
```tsx
                      step={pathStep}
```
description: Keep the event panel path synchronized with the scenery.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 447
old_code:
```tsx
Path {Math.min(100, Math.max(0, visitSteps))} / 100
```
new_code:
```tsx
Path {pathStep} / 100
```
description: Use the same capped path in the empty-state heading.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 465
old_code:
```tsx
<WildwoodScene room={room} />
```
new_code:
```tsx
<WildwoodScene room={room} step={pathStep} />
```
description: Pass presentation progress to the existing right-hand scene.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodScene.tsx
linenumber: 6
old_code:
```tsx
  clearing: "Woodland Clearing",
```
new_code:
```tsx
  clearing: "Mushroom Clearing",
  creek: "Forest Creek",
  ancient: "Ancient Woodland",
```
description: Add two reusable categories and specialize the clearing.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodScene.tsx
linenumber: 15
old_code:
```tsx
function sceneFor(room?: WildwoodRoomView | null): WildwoodSceneId {
  if (!room) return "entrance";
  if (room.corrupted) return "corrupted";
  if (room.battle) return "brush";
  const locations = ["entrance", "brush", "clearing"] as const;
  const seed = Array.from(room.id).reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return locations[seed % locations.length];
}
```
new_code:
```tsx
function sceneFor(step: number, room?: WildwoodRoomView | null): WildwoodSceneId {
  if (step === 0) return "entrance";
  if (room?.corrupted) return "corrupted";
  const locations = ["brush", "clearing", "creek", "ancient"] as const;
  return locations[(Math.max(1, room?.sequence ?? step) - 1) % locations.length];
}
```
description: Path zero always selects entrance; later rooms cycle deterministically, with existing corruption taking priority.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodScene.tsx
linenumber: 22
old_code:
```tsx
export default function WildwoodScene({ room, sceneId }: {
  room?: WildwoodRoomView | null;
  sceneId?: WildwoodSceneId;
}) {
  const scene = sceneId ?? sceneFor(room);
```
new_code:
```tsx
export default function WildwoodScene({ room, step = room?.sequence ?? 0, sceneId }: {
  room?: WildwoodRoomView | null;
  step?: number;
  sceneId?: WildwoodSceneId;
}) {
  const scene = step === 0 ? "entrance" : sceneId ?? sceneFor(step, room);
```
description: Keep optional scene overrides reusable while guaranteeing the Path 0 entrance.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodScene.tsx
linenumber: 65
old_code:
```tsx
        {scene === "corrupted" && (
```
new_code:
```tsx
        {scene === "entrance" && (
          <g>
            {[[190, 370], [246, 330], [545, 350], [610, 320]].map(([x, y], i) => (
              <g key={x} transform={`translate(${x} ${y})`}>
                <path d="M0 0V18M0 12L-7 7" stroke="#447849" strokeWidth="3" />
                <path d="M0-10C12-16 17-2 7 3C15 15 0 19-4 8C-18 12-20-4-8-5C-12-17-1-20 0-10Z" fill={i % 2 ? "#ffcb79" : "#efa6c5"} />
                <circle r="4" fill="#fff2a6" />
              </g>
            ))}
          </g>
        )}
        {scene === "clearing" && (
          <g stroke="var(--ww-outline)" strokeWidth="3">
            <path d="M490 330L590 343L580 361L480 350Z" fill="#796f52" />
            {[275, 320, 470].map((x, i) => (
              <g key={x} transform={`translate(${x} ${325 + i * 10})`}>
                <path d="M-4 0H4L7 23H-7Z" fill="#efdfb1" />
                <path d="M-22 0Q0-38 22 0Z" fill="#d99379" />
                <circle cy="-8" r="3" fill="#fff1c7" stroke="none" />
              </g>
            ))}
          </g>
        )}
        {scene === "creek" && (
          <g>
            <path d="M420 250Q320 298 465 325T530 450H290Q540 365 400 332T420 250Z" fill="#74bfc7" />
            <path d="M402 287L431 289M428 337L470 340M373 409L445 413" stroke="#d4f0d9" strokeWidth="4" fill="none" />
          </g>
        )}
        {scene === "ancient" && (
          <g fill="#8b9d91" stroke="var(--ww-outline)" strokeWidth="4" strokeLinejoin="round">
            <path d="M335 327L341 240H365L371 327ZM447 327L450 240H475L483 327Z" />
            <path d="M332 237L351 217H463L482 237L477 250H337Z" />
            <path d="M345 252L350 281M453 242L469 242M339 317L366 317" stroke="#69976c" strokeWidth="9" />
          </g>
        )}
        {scene === "corrupted" && (
```
description: Add lightweight flowers, mushrooms, creek water, and mossy stone ruins using the existing SVG approach.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodScene.tsx
linenumber: 123
old_code:
```tsx
Wildwood · Scenery study
```
new_code:
```tsx
Wildwood · Temporary placeholder
```
description: Clearly identify missing approved illustrations.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\wildwood.css
linenumber: 81
old_code:
```tsx
.ww-scene--brush {
```
new_code:
```tsx
.ww-scene--entrance {
  --ww-sky: #91cbd0;
  --ww-far: #71a78a;
  --ww-ground: #80a65f;
  --ww-path: #e0c68c;
  --ww-bark: #877b59;
  --ww-leaf: #4b895b;
  --ww-light: #fff0b3;
}

.ww-scene--brush {
```
description: Give Path 0 a warm daylight palette without modifying global styling.
