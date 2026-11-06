filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\components\RoamEncounterToast\RoamEncounterToast.tsx
linenumber: 18
old_code:
```tsx
  onDismiss: () => void;
```
new_code:
```tsx
  onDismiss: () => void;
  onTaken?: (egg: { egg_id: string; egg_name: string }) => void;
```
description: Optional receipt callback; existing consumers unchanged.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\components\RoamEncounterToast\RoamEncounterToast.tsx
linenumber: 74
old_code:
```tsx
  onDismiss,
}: RoamEncounterToastProps)
```
new_code:
```tsx
  onDismiss,
  onTaken,
}: RoamEncounterToastProps)
```
description: Accept the Wildwood receipt handler.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\components\RoamEncounterToast\RoamEncounterToast.tsx
linenumber: 88
old_code:
```tsx
      await apiFetch<unknown>(`/api/kithna/roam/${action}`, {
```
new_code:
```tsx
      const receipt = await apiFetch<{ taken?: boolean; egg_id?: string; egg_name?: string }>(`/api/kithna/roam/${action}`, {
```
description: Read the existing response; no additional grant request.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\components\RoamEncounterToast\RoamEncounterToast.tsx
linenumber: 92
old_code:
```tsx
      onDismiss();
```
new_code:
```tsx
      if (action === "take" && receipt.taken === true && receipt.egg_id && receipt.egg_name) {
        onTaken?.({ egg_id: receipt.egg_id, egg_name: receipt.egg_name });
      }
      onDismiss();
```
description: Only a confirmed take adds an egg. Leave and failures never do.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodExploreResult.tsx
linenumber: 6
old_code:
```tsx
type WildwoodCollectedItem = {
  slug: string;
  name: string;
  type: string;
  description: string | null;
  rarity: number;
  stackLimit: number;
  effects: Record<string, unknown>;
};
```
new_code:
```tsx
import type { BackendInventoryItem } from "@/components/inventory/inventory";

export type WildwoodCollectedItem = Omit<BackendInventoryItem, "qty" | "updatedAt">;
```
description: Reuse the existing inventory metadata type.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodExploreResult.tsx
linenumber: 60
old_code:
```tsx
onCollected: (name: string) => void;
```
new_code:
```tsx
onCollected: (item: WildwoodCollectedItem) => void;
```
description: Pass complete awarded metadata.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodExploreResult.tsx
linenumber: 103
old_code:
```tsx
      onCollected(response.item.name);
```
new_code:
```tsx
      if (response.qty > 0) onCollected(response.item);
```
description: Notify only after a successful positive-quantity response.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 17
old_code:
```tsx
import WildwoodExploreResult from "./WildwoodExploreResult";
```
new_code:
```tsx
import WildwoodExploreResult, { type WildwoodCollectedItem } from "./WildwoodExploreResult";
import { kennithCatalog } from "@/lib/kithna/kennithCatalog";
```
description: Use existing item types and authoritative catalog membership.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 33
old_code:
```tsx
    { name: string; category: "Eggs" | null }[]
```
new_code:
```tsx
    { id: string; name: string; category: "Eggs" | "Relics" | "Etchings" | "Clothes" | null; rarity?: number; description?: string | null }[]
```
description: Retain metadata and stable receipt identity.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 408
old_code:
```tsx
                                  <span>Rarity unavailable.</span>
```
new_code:
```tsx
                                  {find.rarity != null && <span>Rarity: {find.rarity}</span>}
                                  {find.description && <span>{find.description}</span>}
```
description: Show actual metadata only; do not invent rarity names.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 443
old_code:
```tsx
                      onCollected={(name) =>
                        setRecentFinds((finds) => [...finds, { name, category: null }])
                      }
```
new_code:
```tsx
                      onCollected={(item: WildwoodCollectedItem) => {
                        const category = kennithCatalog.relics.some(({ slug }) => slug === item.slug)
                          ? "Relics" : [...kennithCatalog.clothing, ...kennithCatalog.accessories].some(({ slug }) => slug === item.slug)
                            ? "Clothes" : item.type === "etching" ? "Etchings" : null;
                        const id = `${room.id}:${item.slug}`;
                        setRecentFinds((finds) => finds.some((find) => find.id === id) ? finds : [
                          ...finds, { id, name: item.name, category, rarity: item.rarity, description: item.description },
                        ]);
                      }}
```
description: Classify by catalog slug or explicit item type, never names; deduplicate room receipts.


filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 532
old_code:
```tsx
        onDismiss={() => {
          if (eggEncounter?.egg_name) {
            const eggName = eggEncounter.egg_name;

            if (eggName) {
              setRecentFinds((finds) => [...finds, { name: eggName, category: "Eggs" }]);
            }
          }

          setEggEncounter(null);
        }}
```
new_code:
```tsx
        onTaken={(egg) => setRecentFinds((finds) => finds.some((find) => find.id === egg.egg_id)
          ? finds : [...finds, { id: egg.egg_id, name: egg.egg_name, category: "Eggs" }])}
        onDismiss={() => setEggEncounter(null)}
```
description: Record confirmed egg receipts; dismissal alone no longer adds finds.
