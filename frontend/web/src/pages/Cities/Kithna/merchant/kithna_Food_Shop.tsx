import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/useAuth";
import { apiFetch } from "@/lib/api/baseClient";
import {
  fetchWildwoodStatus,
  type WildwoodStatus,
} from "@/lib/kithna/wildwoodApi";
import {
  type InventoryItemDefinition,
  type BackendInventoryItem,
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
const isMerchantFood = (slug: string) =>
  slug === MEAT_ITEM.slug || slug === VEGETABLE_ITEM.slug;
type InventoryWalletResponse = {
  items: BackendInventoryItem[];
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
  const [wildwoodStatus, setWildwoodStatus] = useState<WildwoodStatus | null>(
    null,
  );
  const [merchantDots, setMerchantDots] = useState(2000);
  const [busyAction, setBusyAction] = useState<"trade" | "daily" | null>(null);
  const [meatQuantity, setMeatQuantity] = useState(0);
  const [vegetableQuantity, setVegetableQuantity] = useState(0);
  const [meatStock, setMeatStock] = useState(50);
  const [vegetableStock, setVegetableStock] = useState(50);
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>(
    {},
  );
  const [merchantMessage, setMerchantMessage] = useState("");
  const [userInventory, setUserInventory] = useState<BackendInventoryItem[]>(
    [],
  );
  const tradeInFlight = useRef(false);
  const [newsLine, setNewsLine] = useState(
    "Welcome in. The meat tree was generous this morning, and the garden behaved itself for once.",
  );
  async function refreshWallet() {
    const result = await apiFetch<InventoryWalletResponse>("/api/inventory");
    setUserDots(result.wallet.dots);
    setUserInventory(result.items);
  }
  useEffect(() => {
    void refreshWallet().catch(() => setUserDots(null));
    void fetchWildwoodStatus()
      .then(setWildwoodStatus)
      .catch(() => setWildwoodStatus(null));
  }, []);
  async function completeTrade() {
    if (busyAction || tradeInFlight.current || userDots === null) return;
    const meat = Math.max(0, Math.min(50, meatStock, Math.floor(meatQuantity)));
    const vegetables = Math.max(
      0,
      Math.min(50, vegetableStock, Math.floor(vegetableQuantity)),
    );
    const soldItems = userInventory
      .filter((item) => isMerchantFood(item.slug))
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
    tradeInFlight.current = true;
    setBusyAction("trade");
    setMerchantMessage("");
    let completed = 0;
    try {
      // Each line is atomic; a later failure does not undo completed lines.
      for (const [slug, quantity] of [
        [MEAT_ITEM.slug, meat],
        [VEGETABLE_ITEM.slug, vegetables],
      ] as const) {
        if (quantity === 0) continue;
        await apiFetch("/api/merchants/kithna/food/purchase", {
          method: "POST",
          json: { slug, quantity },
        });
        completed += 1;
        setMerchantDots((current) => current + quantity * 5);
        if (slug === MEAT_ITEM.slug)
          setMeatStock((current) => current - quantity);
        else setVegetableStock((current) => current - quantity);
      }
      for (const { item, quantity } of soldItems) {
        await apiFetch("/api/merchants/kithna/food/sell", {
          method: "POST",
          json: { slug: item.slug, quantity },
        });
        completed += 1;
        setMerchantDots((current) => current - quantity * 5);
        if (item.slug === MEAT_ITEM.slug)
          setMeatStock((current) => current + quantity);
        else setVegetableStock((current) => current + quantity);
      }
      await refreshWallet();
      const balance = sellTotal - purchaseTotal;
      setMerchantMessage(
        balance > 0
          ? `Trade complete. Assanti paid you ${balance} Dots.`
          : balance < 0
            ? `Trade complete. You paid Assanti ${Math.abs(balance)} Dots.`
            : "Trade complete. Even trade.",
      );
    } catch (error) {
      await refreshWallet().catch(() => {
        setUserDots(null);
        setUserInventory([]);
      });
      const message = error instanceof Error ? error.message : "Trade failed.";
      setMerchantMessage(
        (completed > 0 ? "Earlier trade lines completed. " : "") + message,
      );
    } finally {
      // Never leave successful lines selected after a partial failure.
      setMeatQuantity(0);
      setVegetableQuantity(0);
      setSellQuantities({});
      tradeInFlight.current = false;
      setBusyAction(null);
    }
  }
  async function claimDailyFood() {
    if (busyAction) return;
    if (!wildwoodStatus?.dailyFoodUnlocked) {
      setMerchantMessage(
        "Daily Food is still locked. Help Assanti with the corrupted Kith and return to her when the job is done.",
      );
      return;
    }
    setBusyAction("daily");
    setMerchantMessage("");
    try {
      await apiFetch("/api/merchants/kithna/food/daily", { method: "POST" });
      setMerchantMessage("Assanti gave you 10 Meat and 10 Vegetables.");
      await refreshWallet();
    } catch (error) {
      await refreshWallet().catch(() => {
        setUserDots(null);
        setUserInventory([]);
      });
      setMerchantMessage(
        error instanceof Error ? error.message : "Daily Food claim failed.",
      );
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
    if (!isMerchantFood(item.slug)) {
      return total;
    }
    const quantity = Math.max(
      0,
      Math.min(item.qty, Math.floor(sellQuantities[item.slug] ?? 0)),
    );
    return total + quantity * 5;
  }, 0);
  const tradeBalance = sellTotal - purchaseTotal;
  const tradeableUserInventory = userInventory.filter((item) =>
    isMerchantFood(item.slug),
  );
  return (
    <main className="dp-merchant-page kithna-food-shop">
      <div className="dp-merchant-shell poeTayToeHost">
        <PoeTayToe locationKey="food-merchant" />
        <section className="dp-merchant-panel dp-standard-panel">
          <Link className="kithna-food-back-link" to="/cities/kithna">
            Back to Kithna
          </Link>
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
              {wildwoodStatus?.dailyFoodUnlocked ? (
                <div className="dp-merchant-daily">
                  <h3 className="dp-merchant-daily-title">Daily Food</h3>
                  <p className="dp-merchant-daily-copy">
                    The farm is clear. Collect 10 Meat + 10 Vegetables once
                    every 24 hours.
                  </p>
                  <button
                    type="button"
                    className="dp-btn btn-gold kithna-food-daily-button"
                    disabled={busyAction !== null}
                    onClick={claimDailyFood}
                  >
                    {busyAction === "daily"
                      ? "Claiming..."
                      : "Claim Daily Food"}
                  </button>
                </div>
              ) : null}
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
                        max={Math.min(50, meatStock)}
                        inputMode="numeric"
                        className="kithna-food-trade-button"
                        value={meatQuantity}
                        disabled={busyAction !== null || meatStock === 0}
                        onChange={(event) =>
                          setMeatQuantity(
                            Math.max(
                              0,
                              Math.min(
                                50,
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
                        max={Math.min(50, vegetableStock)}
                        inputMode="numeric"
                        className="kithna-food-trade-button"
                        value={vegetableQuantity}
                        disabled={busyAction !== null || vegetableStock === 0}
                        onChange={(event) =>
                          setVegetableQuantity(
                            Math.max(
                              0,
                              Math.min(
                                50,
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
                    {tradeableUserInventory.length > 0 ? (
                      tradeableUserInventory.map((item) => {
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
                              disabled={busyAction !== null}
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
                              {sellQuantity * 5}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="kithna-food-empty-inventory">
                        You have no food to sell.
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
                    userDots === null ||
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
