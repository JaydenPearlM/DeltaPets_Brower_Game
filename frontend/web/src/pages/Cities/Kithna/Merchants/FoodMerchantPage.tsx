import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addCareItem,
  getCareItemCount,
  getInventoryChangeEventName,
} from "@/components/inventory/inventory";
import { apiFetch, ApiError } from "@/lib/api/baseClient";
import "./FoodMerchantPage.css";

const DAILY_FREE_FOOD_QTY = 10;
const FOOD_PRICE_DOTS = 10;
const CLAIM_STORAGE_KEY = "deltapets:food-merchant:last-claim";
const CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function readLastClaimMs(): number | null {
  try {
    const raw = window.localStorage.getItem(CLAIM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLastClaimMs(ms: number) {
  try {
    window.localStorage.setItem(CLAIM_STORAGE_KEY, String(ms));
  } catch {
    // Non-fatal, worst case the freebie is claimable again next load.
  }
}

function formatRemaining(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export default function FoodMerchantPage() {
  const navigate = useNavigate();
  const [lastClaimMs, setLastClaimMs] = useState<number | null>(() =>
    readLastClaimMs(),
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [foodCount, setFoodCount] = useState(() => getCareItemCount("food"));
  const [dots, setDots] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [shopMessage, setShopMessage] = useState<string | null>(null);

  useEffect(() => {
    const eventName = getInventoryChangeEventName();
    const onChange = () => setFoodCount(getCareItemCount("food"));
    window.addEventListener(eventName, onChange);
    return () => window.removeEventListener(eventName, onChange);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  async function refreshWallet() {
    try {
      const data = await apiFetch<{ wallet: { dots: number } }>(
        "/api/me/wallet",
      );
      setDots(data.wallet.dots);
    } catch {
      // Non-fatal, the buy button just won't show a live balance.
    }
  }

  useEffect(() => {
    void refreshWallet();
  }, []);

  const msSinceClaim = lastClaimMs == null ? Infinity : nowMs - lastClaimMs;
  const canClaim = msSinceClaim >= CLAIM_COOLDOWN_MS;
  const remainingMs = canClaim ? 0 : CLAIM_COOLDOWN_MS - msSinceClaim;

  const dialogue = useMemo(() => {
    if (canClaim) {
      return "Fresh off the meat tree! First cut's on the house today.";
    }
    return "Already got your free cut today. Meat tree only drops so much, but I've got more if you're paying.";
  }, [canClaim]);

  function handleClaim() {
    if (!canClaim) return;

    addCareItem("food", DAILY_FREE_FOOD_QTY);
    const claimedAt = Date.now();
    writeLastClaimMs(claimedAt);
    setLastClaimMs(claimedAt);
    setNowMs(claimedAt);
  }

  async function handleBuy() {
    if (buying) return;
    setBuying(true);
    setShopMessage(null);

    try {
      await apiFetch("/api/merchants/kithna/food/purchase", {
        method: "POST",
        json: { quantity: 1 },
      });
      addCareItem("food", 1);
      await refreshWallet();
      setShopMessage("Bought 1 Meat.");
    } catch (error) {
      if (error instanceof ApiError) {
        setShopMessage(error.message || "Purchase failed.");
      } else {
        setShopMessage("Purchase failed. Try again.");
      }
    } finally {
      setBuying(false);
    }
  }

  const canAfford = dots != null && dots >= FOOD_PRICE_DOTS;

  return (
    <main className="foodMerchantPage">
      <button
        type="button"
        className="foodMerchantBack"
        onClick={() => navigate("/cities/kithna")}
      >
        ← Back to Kithna City
      </button>

      <section className="foodMerchantPanel dp-standard-panel">
        <div className="foodMerchantHeader">
          <div className="foodMerchantNpcBadge" aria-hidden="true">
            ●
          </div>
          <div>
            <h1 className="foodMerchantTitle">Kithna Food Shop</h1>
            <p className="foodMerchantSubtitle">
              You currently hold {foodCount} Meat.
              {dots != null ? ` • ${dots} Dots` : ""}
            </p>
          </div>
        </div>

        <p className="foodMerchantDialogue">{dialogue}</p>

        <div className="foodMerchantClaimRow">
          <button
            type="button"
            className="dp-btn dp-btn--yellow foodMerchantClaimBtn"
            onClick={handleClaim}
            disabled={!canClaim}
          >
            {canClaim
              ? `Claim Daily Meat (+${DAILY_FREE_FOOD_QTY})`
              : `Claimed — back in ${formatRemaining(remainingMs)}`}
          </button>
        </div>

        <div className="foodMerchantShopSection">
          <h2 className="foodMerchantShopTitle">Buy Meat</h2>

          <div className="foodMerchantShopItem">
            <span>1 Meat</span>
            <span className="foodMerchantShopPrice">
              {FOOD_PRICE_DOTS} Dots
            </span>
          </div>

          <div className="foodMerchantClaimRow">
            <button
              type="button"
              className="dp-btn dp-btn--blue foodMerchantClaimBtn"
              onClick={handleBuy}
              disabled={buying || (dots != null && !canAfford)}
            >
              {buying
                ? "Buying…"
                : dots != null && !canAfford
                  ? "Not enough Dots"
                  : `Buy 1 Meat (${FOOD_PRICE_DOTS} Dots)`}
            </button>
          </div>

          {shopMessage ? (
            <p className="foodMerchantShopNote">{shopMessage}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
