import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/useAuth";
import { apiFetch } from "@/lib/api/baseClient";
import {
  addInventoryItem,
  consumeInventoryItem,
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
  const { user } = useAuth();

  const userName =
    user?.user_metadata?.username ??
    user?.user_metadata?.display_name ??
    user?.user_metadata?.nickname ??
    "Your";

  const [userDots, setUserDots] = useState<number | null>(null);

  const [merchantDots, setMerchantDots] = useState(() => {
    const rotation = Math.floor(Date.now() / MERCHANT_ROTATION_MS);
    return MERCHANT_DOT_OPTIONS[rotation % MERCHANT_DOT_OPTIONS.length];
  });

  const [busyAction, setBusyAction] = useState<"trade" | "daily" | null>(null);

  const [meatQuantity, setMeatQuantity] = useState(0);
  const [vegetableQuantity, setVegetableQuantity] = useState(0);

  const [meatStock, setMeatStock] = useState(50);
  const [vegetableStock, setVegetableStock] = useState(50);

  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>(
    {},
  );

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

  async function completeTrade() {
    if (busyAction) return;

    const meat = Math.max(0, Math.min(meatStock, Math.floor(meatQuantity)));

    const vegetables = Math.max(
      0,
      Math.min(vegetableStock, Math.floor(vegetableQuantity)),
    );

    const soldItems = userInventory
      .filter((item) => item.type === "food")
      .map((item) => ({
        item,
        quantity: Math.max(
          0,
          Math.min(item.qty, Math.floor(sellQuantities[item.slug] ?? 0)),
        ),
      }))
      .filter(({ quantity }) => quantity > 0);

    const purchaseTotal = (meat + vegetables) * 5;

    const sellQuantityTotal = soldItems.reduce(
      (total, { quantity }) => total + quantity,
      0,
    );

    const sellTotal = sellQuantityTotal * 5;

    if (purchaseTotal === 0 && sellTotal === 0) {
      setMerchantMessage("Choose something to trade first.");
      return;
    }

    if (sellTotal > merchantDots + purchaseTotal) {
      setMerchantMessage("Assanti does not have enough Dots for that trade.");
      return;
    }

    setBusyAction("trade");
    setMerchantMessage("");

    try {
      if (meat > 0) {
        await apiFetch("/api/merchants/kithna/food/purchase", {
          method: "POST",
          json: { quantity: meat },
        });

        addInventoryItem(MEAT_ITEM, meat);
      }

      if (vegetables > 0) {
        await apiFetch("/api/merchants/kithna/food/purchase", {
          method: "POST",
          json: { quantity: vegetables },
        });

        addInventoryItem(VEGETABLE_ITEM, vegetables);
      }

      if (sellQuantityTotal > 0) {
        await apiFetch("/api/merchants/kithna/food/sell", {
          method: "POST",
          json: { quantity: sellQuantityTotal },
        });

        soldItems.forEach(({ item, quantity }) => {
          consumeInventoryItem(item.slug, quantity);
        });
      }

      setMerchantDots((current) => current + purchaseTotal - sellTotal);

      setMeatStock(
        (current) =>
          current -
          meat +
          soldItems
            .filter(({ item }) => item.slug === MEAT_ITEM.slug)
            .reduce((total, { quantity }) => total + quantity, 0),
      );

      setVegetableStock(
        (current) =>
          current -
          vegetables +
          soldItems
            .filter(({ item }) => item.slug === VEGETABLE_ITEM.slug)
            .reduce((total, { quantity }) => total + quantity, 0),
      );

      await refreshWallet();

      setMeatQuantity(0);
      setVegetableQuantity(0);
      setSellQuantities({});

      const balance = sellTotal - purchaseTotal;

      if (balance > 0) {
        setMerchantMessage(`Trade complete. Assanti paid you ${balance} Dots.`);
      } else if (balance < 0) {
        setMerchantMessage(
          `Trade complete. You paid Assanti ${Math.abs(balance)} Dots.`,
        );
      } else {
        setMerchantMessage("Trade complete. Even trade.");
      }
    } catch (error) {
      await refreshWallet().catch(() => undefined);

      setMerchantMessage(
        error instanceof Error ? error.message : "Trade failed.",
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

  const purchaseTotal = (meatQuantity + vegetableQuantity) * 5;

  const sellTotal = userInventory.reduce((total, item) => {
    if (item.type !== "food") {
      return total;
    }

    const quantity = Math.max(
      0,
      Math.min(item.qty, Math.floor(sellQuantities[item.slug] ?? 0)),
    );

    return total + quantity * 5;
  }, 0);

  const tradeBalance = sellTotal - purchaseTotal;

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
              <div className="kithna-food-trade-columns">
                <section className="dp-merchant-section">
                  <h2 className="dp-merchant-section-title">Shop</h2>

                  <div className="kithna-food-trade-summary">
                    <div className="kithna-food-offer-box">
                      <span className="kithna-food-offer-label">
                        Assanti's Goods
                      </span>

                      <strong>{purchaseTotal}</strong>
                    </div>

                    <div className="kithna-food-offer-box">
                      <span className="kithna-food-offer-label">
                        {userName} Inventory
                      </span>

                      <strong>{sellTotal}</strong>
                    </div>
                  </div>

                  <div className="kithna-food-trade-balance">
                    {tradeBalance > 0
                      ? `Assanti owes ${userName}: ${tradeBalance} Dots`
                      : tradeBalance < 0
                        ? `${userName} owes Assanti: ${Math.abs(
                            tradeBalance,
                          )} Dots`
                        : "Trade Balance: 0 Dots"}
                  </div>

                  <div className="kithna-food-trade-list">
                    <div className="kithna-food-trade-row">
                      <span className="kithna-food-trade-name">Meat</span>

                      <span className="kithna-food-trade-cell">
                        {meatStock}
                      </span>

                      <input
                        type="number"
                        min="0"
                        max={meatStock}
                        inputMode="numeric"
                        className="kithna-food-trade-button"
                        value={meatQuantity}
                        disabled={busyAction !== null || meatStock === 0}
                        onChange={(event) =>
                          setMeatQuantity(
                            Math.max(
                              0,
                              Math.min(
                                meatStock,
                                Number(event.target.value) || 0,
                              ),
                            ),
                          )
                        }
                        aria-label="Meat quantity to buy"
                      />

                      <span className="kithna-food-trade-cell">
                        {meatQuantity * 5}
                      </span>
                    </div>

                    <div className="kithna-food-trade-row">
                      <span className="kithna-food-trade-name">Vegetables</span>

                      <span className="kithna-food-trade-cell">
                        {vegetableStock}
                      </span>

                      <input
                        type="number"
                        min="0"
                        max={vegetableStock}
                        inputMode="numeric"
                        className="kithna-food-trade-button"
                        value={vegetableQuantity}
                        disabled={busyAction !== null || vegetableStock === 0}
                        onChange={(event) =>
                          setVegetableQuantity(
                            Math.max(
                              0,
                              Math.min(
                                vegetableStock,
                                Number(event.target.value) || 0,
                              ),
                            ),
                          )
                        }
                        aria-label="Vegetable quantity to buy"
                      />

                      <span className="kithna-food-trade-cell">
                        {vegetableQuantity * 5}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="dp-merchant-section">
                  <h2 className="dp-merchant-section-title">
                    {userName} Inventory
                  </h2>

                  <div className="kithna-food-user-inventory">
                    {userInventory.length > 0 ? (
                      userInventory.map((item) => {
                        const isTradeable = item.type === "food";

                        const sellQuantity = Math.max(
                          0,
                          Math.min(
                            item.qty,
                            Math.floor(sellQuantities[item.slug] ?? 0),
                          ),
                        );

                        return (
                          <div
                            className="kithna-food-trade-row"
                            key={item.slug}
                          >
                            <span className="kithna-food-trade-name">
                              {item.name}
                            </span>

                            <span className="kithna-food-trade-cell">
                              {item.qty}
                            </span>

                            <input
                              type="number"
                              min="0"
                              max={item.qty}
                              inputMode="numeric"
                              className="kithna-food-trade-button"
                              value={sellQuantity}
                              disabled={!isTradeable || busyAction !== null}
                              onChange={(event) =>
                                setSellQuantities((current) => ({
                                  ...current,
                                  [item.slug]: Math.max(
                                    0,
                                    Math.min(
                                      item.qty,
                                      Number(event.target.value) || 0,
                                    ),
                                  ),
                                }))
                              }
                              aria-label={`${item.name} quantity to sell`}
                            />

                            <span className="kithna-food-trade-cell">
                              {isTradeable ? sellQuantity * 5 : 0}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="kithna-food-empty-inventory">
                        Your inventory is empty.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <div className="dp-merchant-actions">
                <button
                  type="button"
                  className="dp-btn btn-gold"
                  disabled={
                    busyAction !== null ||
                    (meatQuantity === 0 &&
                      vegetableQuantity === 0 &&
                      !Object.values(sellQuantities).some(
                        (quantity) => quantity > 0,
                      ))
                  }
                  onClick={() => void completeTrade()}
                >
                  {busyAction === "trade" ? "Trading..." : "Complete Trade"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
