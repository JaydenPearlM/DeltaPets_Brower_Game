import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/useAuth";
import { apiFetch } from "@/lib/api/baseClient";
import {
  fetchWildwoodStatus,
  acceptAssantiFoodQuest,
  turnInAssantiFoodQuest,
  type WildwoodStatus,
} from "@/lib/kithna/wildwoodApi";
import {
  type BackendInventoryItem,
} from "@/components/inventory/inventory";
import "../../Merchant_global_styles.css";
import "./kithna_Food_Shop.css";
import PoeTayToe from "../../../../components/PoeTayToe/PoeTayToe";
type ShopFood = {
  slug: string;
  name: string;
  description: string;
  price: number;
  hunger: number;
  stackLimit: number;
  permanent: boolean;
  available: boolean;
};
type FoodShop = {
  deltaDay: number;
  nextRotationAt: string;
  merchantDots: number;
  catalog: ShopFood[];
  dailyFood: { status: "locked" | "available" | "claimed"; nextClaimAt: string | null };
};
const quantityWithin = (value: number, limit: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(limit, Math.floor(value))) : 0;
const ALIUNE_NEWS = [
  "Ever since that purple mist popped up, everyone's been on edge.",
  "Have you heard? Alec over at the breeding station got an egg where nothing came out. That's crazy!",
  "I like to work alone, but this makes going to the bathroom hard and awkward.",
  "I was taking a little stroll through town the other day when I saw the most beautiful Kith I've ever seen. Absolutely stunning. Then it spotted me and took off so fast I started wondering if I'd imagined the whole thing. Rude, honestly.",
];
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
  const [wildwoodStatus, setWildwoodStatus] = useState<WildwoodStatus | null>(null);
  const [shop, setShop] = useState<FoodShop | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [busyAction, setBusyAction] = useState<"trade" | "daily" | "quest" | null>(null);
  const [purchaseQuantities, setPurchaseQuantities] = useState<Record<string, number>>({});
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>({});
  const [merchantMessage, setMerchantMessage] = useState("");
  const [userInventory, setUserInventory] = useState<BackendInventoryItem[]>([]);
  const actionInFlight = useRef(false);
  const greetedUser = useRef<string | null>(null);
  const refreshVersion = useRef(0);
  const displayedDay = useRef<number | null>(null);
  const [newsLine, setNewsLine] = useState(
    "Welcome in. The meat tree was generous this morning, and the garden behaved itself for once.",
  );
  const refreshShop = useCallback(async () => {
    const version = ++refreshVersion.current;
    setLoadState("loading");
    try {
      const [currentShop, inventory, quests] = await Promise.all([
        apiFetch<FoodShop>("/api/merchants/kithna/food"),
        apiFetch<InventoryWalletResponse>("/api/inventory"),
        fetchWildwoodStatus(),
      ]);
      if (version === refreshVersion.current) {
        if (displayedDay.current !== null && displayedDay.current !== currentShop.deltaDay) {
          setPurchaseQuantities({});
          if (!actionInFlight.current) setMerchantMessage("A new DeltaPets day! I've refreshed the selection. Please choose your purchases again.");
        }
        displayedDay.current = currentShop.deltaDay;
        setShop(currentShop);
        setUserDots(inventory.wallet.dots);
        setUserInventory(inventory.items);
        setWildwoodStatus(quests);
        setLoadState("ready");
      }
      return currentShop;
    } catch (error) {
      if (version === refreshVersion.current) {
        setShop(null);
        setUserDots(null);
        setUserInventory([]);
        setWildwoodStatus(null);
        setLoadState("error");
      }
      throw error;
    }
  }, []);
  useEffect(() => {
    try {
      if (user?.id && greetedUser.current !== user.id) {
        greetedUser.current = user.id;
        const key = "assanti-visited:" + user.id;
        if (sessionStorage.getItem(key)) setNewsLine("Welcome back, Keeper. Let's keep your Kith fed.");
        sessionStorage.setItem(key, "yes");
      }
    } catch { /* Visiting and trading also work when storage is unavailable. */ }
    const refresh = () => {
      if (actionInFlight.current) return;
      void refreshShop().catch((error: unknown) => setMerchantMessage(
        error instanceof Error ? error.message : "Could not refresh the shop. Please try again.",
      ));
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      refreshVersion.current += 1;
    };
  }, [refreshShop, user?.id]);
  useEffect(() => {
    if (!shop) return;
    // This only refreshes the display; the server determines the Delta day.
    const timer = window.setTimeout(() => {
      if (!actionInFlight.current) void refreshShop().catch(() =>
        setMerchantMessage("The day changed. Please refresh the shop before trading."));
    }, Math.max(250, Date.parse(shop.nextRotationAt) - Date.now() + 100));
    return () => window.clearTimeout(timer);
  }, [shop?.nextRotationAt, refreshShop]);
  const catalog = shop?.catalog ?? [];
  const availableFoods = catalog.filter((food) => food.available);
  const ownedQuantity = (slug: string) => userInventory.find((item) => item.slug === slug)?.qty ?? 0;
  const buyLimit = (food: ShopFood) => Math.max(0, Math.min(50, food.stackLimit - ownedQuantity(food.slug)));
  const tradeableUserInventory = userInventory.filter((item) => item.qty > 0 && catalog.some((food) => food.slug === item.slug));
  const priceOf = (slug: string) => catalog.find((food) => food.slug === slug)?.price ?? 0;
  const purchaseTotal = availableFoods.reduce((total, food) =>
    total + quantityWithin(purchaseQuantities[food.slug] ?? 0, buyLimit(food)) * food.price, 0);
  const sellTotal = tradeableUserInventory.reduce((total, item) =>
    total + quantityWithin(sellQuantities[item.slug] ?? 0, item.qty) * priceOf(item.slug), 0);
  const tradeBalance = sellTotal - purchaseTotal;
  const quest = wildwoodStatus?.foodQuest;
  const questLabel = !quest ? "Quest status unavailable" : quest.status === "available" ? "Quest available"
    : quest.status === "completed" ? "Quest completed — Daily Food unlocked"
    : quest.status === "ready_to_turn_in" ? "Ready to complete"
    : quest.progress === 0 ? "Quest accepted" : "Quest in progress";
  async function completeTrade() {
    if (actionInFlight.current || !shop || userDots === null) return;
    const purchases = availableFoods.map((food) => ({ slug: food.slug,
      quantity: quantityWithin(purchaseQuantities[food.slug] ?? 0, buyLimit(food)),
    })).filter((line) => line.quantity > 0);
    const sales = tradeableUserInventory.map((item) => ({ slug: item.slug,
      quantity: quantityWithin(sellQuantities[item.slug] ?? 0, item.qty),
    })).filter((line) => line.quantity > 0);
    if (!purchases.length && !sales.length) return;
    actionInFlight.current = true;
    setBusyAction("trade");
    setMerchantMessage("");
    let completed = 0;
    let spent = 0;
    let received = 0;
    try {
      const current = await refreshShop();
      if (current.deltaDay !== shop.deltaDay) throw new Error("Today's selection has changed. Review your quantities and trade again.");
      // Preserve safe line-by-line transactions. Purchases are processed first.
      for (const [direction, lines] of [["purchase", purchases], ["sell", sales]] as const) {
        for (const line of lines) {
          const result = await apiFetch<{ cost: number; value: number }>(
            "/api/merchants/kithna/food/" + direction, { method: "POST", json: line },
          );
          completed += 1;
          spent += result.cost;
          received += result.value;
        }
      }
      await refreshShop();
      setMerchantMessage((sales.length && purchases.length ? "Trade complete. Thank you, Keeper!"
        : purchases.length ? "All bought. A good meal makes a happy Kith!" : "All sold. Thanks for helping stock the farm shop!")
        + ` Spent ${spent} Dots; received ${received} Dots.`);
    } catch (error) {
      let refreshed = true;
      await refreshShop().catch(() => { refreshed = false; });
      const errorMessage = error instanceof Error ? error.message : "Trade failed.";
      const dialogue = errorMessage === "Not enough Dots."
        ? "You're short on Dots, Keeper. Try buying a little less."
        : errorMessage === "Assanti does not have enough Dots."
          ? "My purse won't stretch that far, Keeper. Try selling a little less."
          : errorMessage;
      setMerchantMessage((completed ? `${completed} of ${purchases.length + sales.length} trade lines completed; they were not undone. Spent ${spent} Dots; received ${received} Dots on those lines. ` : "")
        + dialogue
        + (refreshed ? "" : " Balances could not be refreshed. Trading is disabled until the shop reconnects."));
    } finally {
      setPurchaseQuantities({});
      setSellQuantities({});
      actionInFlight.current = false;
      setBusyAction(null);
    }
  }
  async function claimDailyFood() {
    if (actionInFlight.current || shop?.dailyFood.status !== "available") return;
    actionInFlight.current = true;
    setBusyAction("daily");
    let message = "";
    try {
      await apiFetch("/api/merchants/kithna/food/daily", { method: "POST" });
      message = "Assanti gave you 5 Basic Meat and 5 Basic Vegetables. Keep those Kith well fed!";
    } catch (error) {
      message = error instanceof Error ? error.message : "Daily Food claim failed.";
    } finally {
      await refreshShop().catch(() => { message += " Could not refresh balances. Please reconnect."; });
      setMerchantMessage(message);
      actionInFlight.current = false;
      setBusyAction(null);
    }
  }
  async function interactWithQuest() {
    if (actionInFlight.current || !quest || !["available", "ready_to_turn_in"].includes(quest.status)) return;
    actionInFlight.current = true;
    setBusyAction("quest");
    let message = "";
    try {
      if (quest.status === "available") {
        await acceptAssantiFoodQuest();
        message = "Thank you, Keeper. Help with the corrupted Kith, then come back to me.";
      } else {
        await turnInAssantiFoodQuest();
        message = "The farm is safe again. Thank you! Your Daily Food is now unlocked.";
      }
    } catch (error) {
      message = error instanceof Error ? error.message : "Could not update the quest.";
    } finally {
      await refreshShop().catch(() => { message += " Could not refresh the shop. Please reconnect."; });
      setMerchantMessage(message);
      actionInFlight.current = false;
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
                    {shop ? shop.merchantDots.toLocaleString() : "—"}
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
              <p className="dp-merchant-daily-copy">
                My farm is just to the right of the shop. Meat grows on the trees, and vegetables in the soil.
                The basics are always here; the other foods change each DeltaPets day.
              </p>
              <div className="dp-merchant-daily">
                <h3 className="dp-merchant-daily-title">Help Assanti</h3>
                <p>{questLabel}</p>
                {quest?.status === "available" && <p>Could you help with the strange Kith troubling my farm, Keeper?</p>}
                {quest?.status === "ready_to_turn_in" && <p>You're back! Tell me how things went at the farm.</p>}
                {quest?.status === "active" && <p>Corrupted Kith: {quest.progress} / {quest.target}. Keep going, Keeper!</p>}
                {quest?.status === "available" || quest?.status === "ready_to_turn_in" ? (
                  <button type="button" className="btn-pearl" disabled={busyAction !== null || !shop}
                    onClick={() => void interactWithQuest()}>
                    {busyAction === "quest" ? "Updating..." : quest.status === "available" ? "Accept quest" : "Complete quest"}
                  </button>
                ) : null}
                {quest?.status === "active" && <Link to="/cities/kithna">Return to Kithna</Link>}
              </div>
              <div className="dp-merchant-daily">
                <h3 className="dp-merchant-daily-title">Daily Food</h3>
                <p className="dp-merchant-daily-copy">5 Basic Meat + 5 Basic Vegetables, once every 24 hours.</p>
                <p>{!shop ? (loadState === "error" ? "Daily Food status unavailable. Retry the shop." : "Checking availability...") : shop.dailyFood.status === "locked"
                  ? "Locked — complete Assanti's quest." : shop.dailyFood.status === "claimed"
                    ? "Already claimed. Your next meal is growing!" : "Available — your food is ready, Keeper."}</p>
                {shop?.dailyFood.status === "claimed" && shop.dailyFood.nextClaimAt && <p>
                  Available again: {new Date(shop.dailyFood.nextClaimAt).toLocaleString()}
                </p>}
                <button type="button" className="dp-btn btn-gold kithna-food-daily-button"
                  disabled={busyAction !== null || shop?.dailyFood.status !== "available"}
                  onClick={() => void claimDailyFood()}>
                  {busyAction === "daily" ? "Claiming..." : "Claim Daily Food"}
                </button>
              </div>
              {!shop && <button type="button" className="btn-pearl" disabled={busyAction !== null || loadState === "loading"}
                onClick={() => void refreshShop().then(() => setMerchantMessage("Shop refreshed.")).catch((error: unknown) =>
                  setMerchantMessage(error instanceof Error ? error.message : "Could not refresh the shop."))}>Retry shop</button>}
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
                  <p className="kithna-food-trade-help">Prices and totals are in Dots. Purchases happen before sales; each item trades separately.</p>
                  <div className="kithna-food-trade-list">
                    {!shop && <p role="status">{loadState === "error" ? "Shop unavailable. Retry to load today's food." : "Loading today's food..."}</p>}
                    <div className="kithna-food-trade-row kithna-food-column-labels" aria-hidden="true">
                      <span className="kithna-food-trade-name">Food</span><span>Price</span><span>Qty</span><span>Total</span>
                    </div>
                    {availableFoods.map((food) => {
                      const quantity = quantityWithin(purchaseQuantities[food.slug] ?? 0, buyLimit(food));
                      return <div className="kithna-food-trade-row" key={food.slug}>
                        <span className="kithna-food-trade-name">{food.name}
                          <small>{food.description}</small>
                          <small>+{food.hunger} hunger{food.permanent ? " · Always available" : " · Today"}</small>
                        </span>
                        <span className="kithna-food-trade-cell">{food.price}</span>
                        <input type="number" min="0" max={buyLimit(food)} step="1" inputMode="numeric"
                          className="kithna-food-trade-button" value={quantity}
                          disabled={busyAction !== null || buyLimit(food) === 0}
                          onChange={(event) => setPurchaseQuantities((current) => ({ ...current,
                            [food.slug]: quantityWithin(Number(event.target.value), buyLimit(food)),
                          }))} aria-label={food.name + " quantity to buy"} />
                        <span className="kithna-food-trade-cell">{quantity * food.price}</span>
                      </div>;
                    })}
                  </div>
                </section>
                <section className="dp-merchant-section">
                  <h2 className="dp-merchant-section-title">
                    {userName} Inventory
                  </h2>
                  <div className="kithna-food-user-inventory">
                    <div className="kithna-food-trade-row kithna-food-column-labels" aria-hidden="true">
                      <span className="kithna-food-trade-name">Food / price</span><span>Owned</span><span>Qty</span><span>Total</span>
                    </div>
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
                              {catalog.find((food) => food.slug === item.slug)?.name ?? item.name}
                              <small>{priceOf(item.slug)} Dots each</small>
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
                              disabled={busyAction !== null || !shop}
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
                              {sellQuantity * priceOf(item.slug)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="kithna-food-empty-inventory">
                        {!shop ? (loadState === "error" ? "Inventory unavailable until the shop reconnects." : "Loading your inventory...") : "You have no food to sell."}
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
                    (!shop || (purchaseTotal === 0 && sellTotal === 0))
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
