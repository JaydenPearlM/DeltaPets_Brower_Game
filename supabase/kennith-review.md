# Kennith implementation review — not a rollout authorization

The proposed `20261029221654_kennith_daily_wallet_proposal.sql` creates only
Kennith's daily wallet table and its service-role-only RPC. Each server-computed
Aliune day gets one persistent starting balance from 1,000 through 2,000 Dots.
Concurrent initialization uses the day primary key and ON CONFLICT DO NOTHING.
Existing days are never rerolled. The UI refreshes on focus, every 30 seconds, and at Aliune midnight.
Kennith uses the visible clock midnight (285 minutes into the six-hour cycle),
not the world phase-cycle boundary at 05:00.
This is lazy initialization at the next request after midnight, not a scheduled job.

No SQL was executed. Review/apply this file alone after explicit approval; do not
push unrelated pending migrations. No existing tables or functions are replaced.
The route returns 503 until the proposal is applied. No temporary balance is shown.

## Catalog blockers

- 8 basic clothing entries: no prices, stack limits or authoritative item types.
- 8 hats/glasses entries: no prices, stack limits or authoritative item types.
- 8 relic entries: no prices, stack limits, authoritative item types or effects.
- 10 pet-care references: all resolve to existing care_items.json definitions;
  their existing effects and stack limits are preserved. None has a price.
- Sell/buyback prices and daily stock quantities, merchant stock caps require confirmation for Kennith. No defaults were invented.

The frontend shows the 34 catalog descriptions as previews, not stocked inventory.
Purchasing, selling, buyback and combined checkout remain disabled. No cosmetic
equipping or relic effects are implemented. Existing item JSON files are unchanged.

## Next database proposal after catalog approval

Use existing item_defs/inventory identities; resolve pet-care slugs to existing
item IDs rather than reseeding them. Only new approved items need registration.
Kennith stock must be keyed by Aliune day and item identity and kept separate
from Assanti. One authenticated server endpoint should submit the whole basket
to one transaction: lock player wallet, Kennith day wallet and ordered inventory/
stock rows; validate server prices, owned quantities, stock and integer capacities;
then update both wallets and inventories together. Reject every line on any error.
Do not use sequential HTTP purchases to simulate an atomic basket.

Runtime database/concurrency checks and authenticated browser verification remain
required after approval. Current router tests use an isolated RPC double only.

## Five-item rotation update
Each category now previews five deterministic selections from its existing JSON.
The authenticated rotation endpoint supplies the server-owned midnight day and
next boundary independently of the wallet RPC. No stock quantities are invented.
The daily wallet proposal remains unapplied; actual balances require its approval.
Frontend build and rotation tests pass. Backend build is blocked by existing
TS7006 at kithnaMerchants.ts:65. Live authenticated testing remains outstanding.
