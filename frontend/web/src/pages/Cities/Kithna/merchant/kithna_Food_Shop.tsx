import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/baseClient";
import {
  addInventoryItem,
  type InventoryItemDefinition,
} from "@/components/inventory/inventory";
import "../../Merchant_global_styles.css";
import "./kithna_Food_Shop.css";
import PoeTayToe from "../../../../components/PoeTayToe/PoeTayToe";

const MEAT_ITEM: InventoryItemDefinition = {
  slug: "alpha-meat",
  name: "Meat",
  type: "food",
  description: "Fresh cuts harvested from Kithna's meat tree.",
  rarity: "common",
  stackLimit: 99,
  careCategory: "food",
};

const VEGETABLE_ITEM: InventoryItemDefinition = {
  slug: "alpha-vegetables",
  name: "Vegetables",
  type: "food",
  description: "Simple vegetables grown in Kithna's garden.",
  rarity: "common",
  stackLimit: 99,
  careCategory: "food",
};

const ALIUNE_NEWS = [
  "Ever since that purple mist popped up, everyone's been on edge.",
  "Have you heard? Alec over at the breeding station got an egg where nothing came out. That's crazy!",
  "I like to work alone, but this makes going to the bathroom hard and awkward.",
];

const DAILY_FOOD_STORAGE_KEY = "deltapets:kithna-food-shop:daily-food";
const DAILY_FOOD_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type InventoryWalletResponse = {
  wallet: {
    dots: number;
    crystals: number;
  };
};

export default function KithnaFoodShop() {
  const [userDots, setUserDots] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<
    "meat" | "vegetables" | "daily" | null
  >(null);
  const [merchantMessage, setMerchantMessage] = useState("");
  const [newsLine, setNewsLine] = useState(
    "Welcome in. The meat tree was generous this morning, and the garden behaved itself for once.",
  );

  async function refreshWallet() {
    const result = await apiFetch<InventoryWalletResponse>("/api/inventory");

    setUserDots(result.wallet.dots);
  }

  useEffect(() => {
    void refreshWallet().catch(() => setUserDots(null));
  }, []);

  async function buyFood(
    key: "meat" | "vegetables",
    item: InventoryItemDefinition,
    quantity: 1 | 50,
  ) {
    if (busyAction) return;

    setBusyAction(key);
    setMerchantMessage("");

    try {
      await apiFetch("/api/merchants/kithna/food/purchase", {
        method: "POST",
        json: { quantity },
      });

      addInventoryItem(item, quantity);
      await refreshWallet();
      setMerchantMessage(
        `Bought ${quantity} ${item.name} for ${quantity * 5} Dots.`,
      );
    } catch (error) {
      setMerchantMessage(
        error instanceof Error ? error.message : "Purchase failed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  function claimDailyFood() {
    if (busyAction) return;

    setBusyAction("daily");
    setMerchantMessage("");

    try {
      const lastClaim = Number(
        window.localStorage.getItem(DAILY_FOOD_STORAGE_KEY) ?? 0,
      );
      const now = Date.now();
      const nextEligibleAt = lastClaim + DAILY_FOOD_COOLDOWN_MS;

      if (lastClaim > 0 && now < nextEligibleAt) {
        setMerchantMessage(
          `Daily Food is already claimed. Come back after ${new Date(
            nextEligibleAt,
          ).toLocaleString()}.`,
        );
        return;
      }

      addInventoryItem(MEAT_ITEM, 10);
      addInventoryItem(VEGETABLE_ITEM, 10);
      window.localStorage.setItem(DAILY_FOOD_STORAGE_KEY, String(now));
      setMerchantMessage("Assanti gave you 10 Meat and 10 Vegetables.");
    } finally {
      setBusyAction(null);
    }
  }

  function showAliuneNews() {
    setNewsLine(ALIUNE_NEWS[Math.floor(Math.random() * ALIUNE_NEWS.length)]);
  }

  return (
    <main className="dp-merchant-page kithna-food-shop">
      <div className="dp-merchant-shell poeTayToeHost">
        <PoeTayToe locationKey="food-merchant" />
        <section className="dp-merchant-panel dp-standard-panel">
          <header className="dp-merchant-header">
            <div
              className="dp-merchant-avatar"
              aria-label="Merchant art placeholder"
            >
              Human
              <br />
              Placeholder
            </div>

            <div className="dp-merchant-heading">
              <h1 className="dp-merchant-name">Assanti</h1>
              <p className="dp-merchant-shop-name">Kithna Food Shop</p>
            </div>

            <div className="dp-merchant-wallets">
              <div className="dp-merchant-wallet">
                <span className="dp-merchant-wallet-label">Merchant Dots</span>
                <span className="dp-merchant-wallet-value">—</span>
              </div>

              <div className="dp-merchant-wallet">
                <span className="dp-merchant-wallet-label">User Dots</span>
                <span className="dp-merchant-wallet-value">
                  {userDots === null ? "—" : userDots.toLocaleString()}
                </span>
              </div>
            </div>
          </header>

          <div className="dp-merchant-content">
            <section className="dp-merchant-section">
              <h2 className="dp-merchant-section-title">Shop Inventory</h2>

              <div className="dp-merchant-item-grid">
                <article className="dp-merchant-item">
                  <h3 className="dp-merchant-item-name">Meat</h3>
                  <p className="dp-merchant-item-copy">
                    Fresh cuts harvested from Kithna's meat tree.
                  </p>
                  <p className="dp-merchant-item-price">5 Dots</p>

                  <button
                    type="button"
                    className="dp-btn btn-gold kithna-food-buy-button"
                    disabled={busyAction !== null}
                    onClick={() => void buyFood("meat", MEAT_ITEM, 1)}
                  >
                    {busyAction === "meat" ? "Buying..." : "Buy 1"}
                  </button>

                  <button
                    type="button"
                    className="dp-btn btn-gold kithna-food-buy-button"
                    disabled={busyAction !== null}
                    onClick={() => void buyFood("meat", MEAT_ITEM, 50)}
                  >
                    {busyAction === "meat" ? "Buying..." : "Buy 50"}
                  </button>
                </article>

                <article className="dp-merchant-item">
                  <h3 className="dp-merchant-item-name">Vegetables</h3>
                  <p className="dp-merchant-item-copy">
                    Simple vegetables grown in Kithna's garden.
                  </p>
                  <p className="dp-merchant-item-price">5 Dots</p>

                  <button
                    type="button"
                    className="dp-btn btn-gold kithna-food-buy-button"
                    disabled={busyAction !== null}
                    onClick={() =>
                      void buyFood("vegetables", VEGETABLE_ITEM, 1)
                    }
                  >
                    {busyAction === "vegetables" ? "Buying..." : "Buy 1"}
                  </button>

                  <button
                    type="button"
                    className="dp-btn btn-gold kithna-food-buy-button"
                    disabled={busyAction !== null}
                    onClick={() =>
                      void buyFood("vegetables", VEGETABLE_ITEM, 50)
                    }
                  >
                    {busyAction === "vegetables" ? "Buying..." : "Buy 50"}
                  </button>
                </article>
              </div>
            </section>

            <aside className="dp-merchant-section dp-merchant-info">
              <h2 className="dp-merchant-section-title">Merchant Info</h2>

              <div
                className="dp-merchant-foreground"
                aria-label="Large merchant art placeholder"
              >
                Large Human Merchant
                <br />
                Art Placeholder
              </div>

              <p className="dp-merchant-dialogue">{newsLine}</p>

              <div className="dp-merchant-daily">
                <h3 className="dp-merchant-daily-title">Daily Food</h3>
                <p className="dp-merchant-daily-copy">
                  10 Meat + 10 Vegetables once every 24 hours.
                </p>

                <button
                  type="button"
                  className="dp-btn btn-gold kithna-food-daily-button"
                  disabled={busyAction !== null}
                  onClick={claimDailyFood}
                >
                  {busyAction === "daily" ? "Claiming..." : "Claim Daily Food"}
                </button>
              </div>

              <button
                type="button"
                className="dp-btn dp-btn-purple"
                onClick={showAliuneNews}
              >
                Aliune News
              </button>

              {merchantMessage ? (
                <p className="kithna-food-message" role="status">
                  {merchantMessage}
                </p>
              ) : null}
            </aside>
          </div>

          <div className="dp-merchant-actions">
            <button type="button" className="dp-btn dp-btn-blue">
              Sell
            </button>
            <button type="button" className="dp-btn dp-btn-purple">
              About Kithna
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
