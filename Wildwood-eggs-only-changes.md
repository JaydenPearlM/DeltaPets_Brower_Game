filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 398
old_code:
```tsx
(["Eggs", "Relics", "Etchings", "Clothes"] as const)
```
new_code:
```tsx
(["Eggs"] as const)
```
description: Show only the Eggs category for now.

filename: A:\Deltapets_vault\01_Current_Project\frontend\web\src\pages\Cities\Kithna\Wildwood\WildwoodPage.tsx
linenumber: 418
old_code:
```tsx
                  {recentFinds.some((find) => find.category === null) && (
                    <div className="ww-unclassified-finds">
                      <p>Other or uncategorized finds — category, rarity, description and slot details unavailable.</p>
                      <ul>
                        {recentFinds.filter((find) => find.category === null).map((find, index) => (
                          <li key={`${index}-${find.name}`}>{find.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
```
new_code: (removed)
description: Hide the non-egg uncategorized section.
