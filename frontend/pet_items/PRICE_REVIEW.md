# Item price review

Potion prices below are proposals, not approved game prices. Formula: ceil(HP restored × rarity / 2) Dots. Assanti buyback is 100% of the approved selling price; no redundant JSON buyback field is added.

Food: 23 missing JSON prices restored from the existing server catalog; existing 5-Dot basic foods preserved. Pumpkin uses Jayden's approved 3 Dots. No food repricing proposed.

## Proposed potion prices (50)

| Slug | Rarity | HP restored | Proposed Dots |
|---|---:|---:|---:|
| minor-healing-potion | 1 | 20 | 10 |
| healing-potion | 1 | 35 | 18 |
| greater-healing-potion | 2 | 55 | 55 |
| major-healing-potion | 3 | 75 | 113 |
| supreme-healing-potion | 4 | 100 | 200 |
| redberry-tonic | 1 | 18 | 9 |
| herbal-remedy | 1 | 22 | 11 |
| warmroot-tonic | 1 | 24 | 12 |
| honey-heal-draught | 1 | 26 | 13 |
| greenleaf-tonic | 1 | 25 | 13 |
| mosswater-elixir | 1 | 28 | 14 |
| sunfruit-tonic | 1 | 30 | 15 |
| moonberry-remedy | 2 | 38 | 38 |
| silverleaf-elixir | 2 | 42 | 42 |
| crystalwater-tonic | 2 | 40 | 40 |
| ember-healing-tonic | 2 | 44 | 44 |
| tide-healing-tonic | 2 | 44 | 44 |
| stone-healing-tonic | 2 | 46 | 46 |
| breeze-healing-tonic | 2 | 42 | 42 |
| frost-healing-tonic | 2 | 45 | 45 |
| storm-healing-tonic | 2 | 46 | 46 |
| sun-healing-tonic | 2 | 48 | 48 |
| shade-healing-tonic | 2 | 48 | 48 |
| prismatic-healing-tonic | 3 | 65 | 98 |
| wildwood-remedy | 2 | 50 | 50 |
| kithna-restoration-draught | 2 | 52 | 52 |
| deepwood-elixir | 3 | 60 | 90 |
| mountain-spring-elixir | 3 | 62 | 93 |
| golden-restoration-tonic | 3 | 64 | 96 |
| violet-restoration-tonic | 3 | 63 | 95 |
| ruby-elixir | 3 | 68 | 102 |
| sapphire-elixir | 3 | 68 | 102 |
| emerald-elixir | 3 | 70 | 105 |
| amber-elixir | 3 | 70 | 105 |
| amethyst-elixir | 3 | 72 | 108 |
| royal-healing-draught | 4 | 85 | 170 |
| ancient-restoration-elixir | 4 | 90 | 180 |
| starlight-tonic | 4 | 88 | 176 |
| moonlight-elixir | 4 | 90 | 180 |
| sunlight-elixir | 4 | 92 | 184 |
| prism-restoration-elixir | 4 | 95 | 190 |
| grand-healing-elixir | 4 | 100 | 200 |
| legendary-healing-draught | 5 | 120 | 300 |
| mythic-restoration-elixir | 5 | 130 | 325 |
| celestial-healing-tonic | 5 | 125 | 313 |
| aurora-elixir | 5 | 135 | 338 |
| relic-restoration-draught | 5 | 140 | 350 |
| kithna-grand-remedy | 5 | 145 | 363 |
| prismatic-grand-elixir | 5 | 150 | 375 |
| master-healers-draught | 5 | 160 | 400 |

## Removed unconfirmed range metadata

These ranges were proposals, not confirmed prices; their full values are preserved here. Existing server prices take precedence pending review.

| Slug | Previous proposed_price_range_dots | Preserved server price |
|---|---|---:|
| carrot | {"minimum":6,"maximum":9} | 3 |
| potato | {"minimum":6,"maximum":9} | 4 |
| green-peas | {"minimum":6,"maximum":9} | 3 |

## Compatibility

No database changes or migrations were made. JSON changes do not update the server's SQL catalog. The pending grocery migration still needs approved potion prices, 100% buyback alignment, and backend stock configuration before deployment. Do not load these proposals into production automatically. Basic Meat and Basic Vegetables had no image field; none was invented. All pre-existing item data other than removed proposal metadata is preserved.
