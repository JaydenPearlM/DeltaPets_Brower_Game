# Retired Closed Alpha Care Package

Archived from the inventory UI and backend route on 2026-09-29. These original snippets are documentation, not imported or executable. The popup also used getPlayerName(user) and reset its visibility on user changes and load failures; those package-only hookups have been removed. Package-specific CSS remains inert.

Historical migrations, RPC definitions, generated database types, and existing player rows are preserved. The recorded migrations restrict the opening RPC to service_role; no live database permissions or rows were changed. No active startup/login grant was found. Historical package rows remain in storage but are excluded from the inventory UI.

## Frontend response type

```tsx
type ClosedAlphaCarePackageResponse = {
  opened: true;
  wallet: {
    dots: number;
  };
};
```

## Popup player name

```tsx
function getPlayerName(user: any) {
  const meta = user?.user_metadata ?? {};
  const fromMeta =
    meta.username || meta.display_name || meta.displayName || meta.name;

  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();

  const email = user?.email;
  if (typeof email === "string" && email.includes("@")) {
    return email.split("@")[0];
  }

  return "Traveler";
}
```

## Popup state

```tsx
const [openingCarePackage, setOpeningCarePackage] = useState(false);
  const [showCarePackageNotice, setShowCarePackageNotice] = useState(false);
  const [carePackageMessage, setCarePackageMessage] = useState("");
```

## Popup inventory trigger

```tsx
setShowCarePackageNotice(
            nextBackendItems.some(
              (item) => item.slug === "closed-alpha-care-package",
            ),
          );
```

## Package opening action

```tsx
async function openClosedAlphaCarePackage() {
    if (openingCarePackage) return;

    setOpeningCarePackage(true);
    setCarePackageMessage("");

    try {
      const result = await apiFetch<ClosedAlphaCarePackageResponse>(
        "/api/inventory/open-closed-alpha-care-package",
        { method: "POST" },
      );

      setShowCarePackageNotice(false);
      dispatchInventoryChange();

      setCarePackageMessage(
        `Care Package opened! You received 50 Meat, 50 Vegetables, 50 Clean, 50 Mood, 50 Comfort, and 1,000 Dots. Balance: ${result.wallet.dots.toLocaleString()} Dots.`,
      );
    } catch (err) {
      dispatchInventoryChange();
      setCarePackageMessage(
        err instanceof Error ? err.message : "Failed to open care package.",
      );
    } finally {
      setOpeningCarePackage(false);
    }
  }
```

## Package popup

```tsx
{showCarePackageNotice ? (
        <div
          className="inventoryCarePackageNotice"
          role="alertdialog"
          aria-modal="true"
          aria-label="Closed Alpha Care Package"
        >
          <div className="inventoryCarePackageNoticeCard">
            <p className="inventoryCarePackageStillHere">
              This is for all of you who are actively testing.
            </p>

            <h2 className="inventoryCarePackageThankYou">
              Thank you for joining this journey with me, {playerName}!
            </h2>

            <p className="inventoryCarePackageJourney">
              Can not wait to see what lies ahead.
            </p>

            <button
              type="button"
              className="dp-btn--close"
              disabled={openingCarePackage}
              onClick={() => void openClosedAlphaCarePackage()}
            >
              {openingCarePackage ? "Opening..." : "Get Gift"}
            </button>
          </div>
        </div>
      ) : null}
```

## Package result message

```tsx
{carePackageMessage ? (
          <p className="inventoryCarePackageMessage" role="status">
            {carePackageMessage}
          </p>
        ) : null}
```

## Backend opening route

```ts
inventoryRouter.post(
  "/open-closed-alpha-care-package",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin.rpc(
        "open_closed_alpha_care_package",
        { p_user_id: userId },
      );

      if (error) {
        if (error.code === "P0001" && error.message === "Not enough room for the full care package.") {
          return res.status(409).json({ error: error.message });
        }
        throw error;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.opened) {
        return res.status(409).json({
          error: "This Closed Alpha Care Package has already been opened.",
        });
      }

      return res.json({
        opened: true,
        wallet: {
          dots: result.dots,
        },

      });
    } catch (err: any) {
      logger.error("[inventory] failed to open Closed Alpha Care Package", err);

      return res
        .status(500)
        .json({ error: err?.message ?? "Failed to open care package." });
    }
  },
);
```
