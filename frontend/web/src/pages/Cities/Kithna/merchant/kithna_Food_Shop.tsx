import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/baseClient";
import {
  addInventoryItem,
  getInventoryChangeEventName,
  getInventoryItems,
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
  "I was taking a little stroll through town the other day when I saw the most beautiful Kith I've ever seen. Absolutely stunning. Then it spotted me and took off so fast I started wondering if I'd imagined the whole thing. Rude, honestly.",
];
const DAILY_FOOD_STORAGE_KEY = "deltapets:kithna-food-shop:daily-food";
const DAILY_FOOD_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const MERCHANT_ROTATION_MS = 4 * 60 * 60 * 1000;
const MERCHANT_DOT_OPTIONS = [400, 2000, 5000, 10000];

type InventoryWalletResponse = {
  wallet: {
    dots: number;
    crystals: number;
  };
};

export default function KithnaFoodShop() {
  const [userDots, setUserDots] = useState<number | null>(null);
  const [merchantDots] = useState(() => {
    const rotation = Math.floor(Date.now() / MERCHANT_ROTATION_MS);
    return MERCHANT_DOT_OPTIONS[rotation % MERCHANT_DOT_OPTIONS.length];
  });
  const [busyAction, setBusyAction] = useState<
    "meat" | "vegetables" | "daily" | null
  >(null);
  const [merchantMessage, setMerchantMessage] = useState("");
  const [userInventory, setUserInventory] = useState(() => getInventoryItems());
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

  useEffect(() => {
    const inventoryChangeEvent = getInventoryChangeEventName();

    function refreshInventory() {
      setUserInventory(getInventoryItems());
    }

    window.addEventListener(inventoryChangeEvent, refreshInventory);

    return () => {
      window.removeEventListener(inventoryChangeEvent, refreshInventory);
    };
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

  function showAboutKithna() {
    setNewsLine(
      "Kithna is a small, peaceful city and one of the safest places for new Keepers to begin exploring. Most wild Kith around town are lower level, and the old water fountain in the center of Kithna is a popular meeting place for residents, travelers, and Kith alike. Shops and homes have grown around it over the years, giving the city its quiet, close-knit feel. Most days are calm. Most days. Lately, strange Kith sightings, corrupted creatures, and rumors from around Aliune have started making their way into town.",
    );
  }

  return (
    <main className="dp-merchant-page kithna-food-shop">
      <div className="dp-merchant-shell poeTayToeHost">
        <PoeTayToe locationKey="food-merchant" />
        <section className="dp-merchant-panel dp-standard-panel">
          <header className="dp-merchant-header kithna-food-header">
            <div
              className="dp-merchant-foreground kithna-food-merchant-art"
              aria-label="Large merchant art placeholder"
            >
              Large Human Merchant
              <br />
              Art Placeholder
            </div>

            <div className="kithna-food-merchant-summary">
              <div className="dp-merchant-heading">
                <h1 className="dp-merchant-name">Assanti</h1>
                <p className="dp-merchant-shop-name">Kithna Food Shop</p>
              </div>

              <div className="dp-merchant-wallets">
                <div className="dp-merchant-wallet">
                  <span className="dp-merchant-wallet-label">
                    Merchant Dots
                  </span>
                  <span className="dp-merchant-wallet-value">
                    {merchantDots.toLocaleString()}
                  </span>
                </div>

                <div className="dp-merchant-wallet">
                  <span className="dp-merchant-wallet-label">User Dots</span>
                  <span className="dp-merchant-wallet-value">
                    {userDots === null ? "—" : userDots.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="kithna-food-main-layout">
            <aside className="dp-merchant-section dp-merchant-info">
              <p className="dp-merchant-dialogue">{newsLine}</p>

              <div className="kithna-food-info-actions">
                <button
                  type="button"
                  className="btn-pearl kithna-food-info-button"
                  onClick={showAliuneNews}
                >
                  Aliune News
                </button>
                <button
                  type="button"
                  className="btn-pearl kithna-food-info-button"
                  onClick={showAboutKithna}
                >
                  About Kithna
                </button>
              </div>

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

              {merchantMessage ? (
                <p className="kithna-food-message" role="status">
                  {merchantMessage}
                </p>
              ) : null}
            </aside>

            <div className="kithna-food-trade-area">
              <div className="kithna-food-trade-summary">
                <div className="kithna-food-offer-box">
                  <span className="kithna-food-offer-label">
                    Merchant Offer
                  </span>
                  <strong>Assanti pays you: 0 Dots</strong>
                </div>

                <div className="kithna-food-offer-box">
                  <span className="kithna-food-offer-label">Your Offer</span>
                  <strong>You pay Assanti: 0 Dots</strong>
                </div>
              </div>

              <div className="kithna-food-trade-columns">
                <section className="dp-merchant-section">
                  <h2 className="dp-merchant-section-title">Shop</h2>

                  <div className="kithna-food-trade-list">
                    <div className="kithna-food-trade-row">
                      <span className="kithna-food-trade-name">Meat</span>
                      <span className="kithna-food-trade-value">5 Dots</span>

                      <div className="kithna-food-trade-controls">
                        <button
                          type="button"
                          className="kithna-food-trade-button"
                          disabled={busyAction !== null}
                          onClick={() => void buyFood("meat", MEAT_ITEM, 1)}
                        >
                          +1
                        </button>

                        <button
                          type="button"
                          className="kithna-food-trade-button"
                          disabled={busyAction !== null}
                          onClick={() => void buyFood("meat", MEAT_ITEM, 50)}
                        >
                          +50
                        </button>
                      </div>
                    </div>

                    <div className="kithna-food-trade-row">
                      <span className="kithna-food-trade-name">Vegetables</span>
                      <span className="kithna-food-trade-value">5 Dots</span>

                      <div className="kithna-food-trade-controls">
                        <button
                          type="button"
                          className="kithna-food-trade-button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            void buyFood("vegetables", VEGETABLE_ITEM, 1)
                          }
                        >
                          +1
                        </button>

                        <button
                          type="button"
                          className="kithna-food-trade-button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            void buyFood("vegetables", VEGETABLE_ITEM, 50)
                          }
                        >
                          +50
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="dp-merchant-section">
                  <h2 className="dp-merchant-section-title">Your Inventory</h2>

                  <div className="kithna-food-user-inventory">
                    {userInventory.length > 0 ? (
                      userInventory.map((item) => (
                        <div className="kithna-food-trade-row" key={item.slug}>
                          <span className="kithna-food-trade-name">
                            {item.name}
                          </span>
                          <span className="kithna-food-trade-value">
                            Owned: {item.qty}
                          </span>

                          <div className="kithna-food-trade-controls">
                            <button
                              type="button"
                              className="kithna-food-trade-button"
                              disabled
                            >
                              -1
                            </button>

                            <button
                              type="button"
                              className="kithna-food-trade-button"
                              disabled
                            >
                              -50
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="kithna-food-empty-inventory">
                        Your inventory is empty.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
