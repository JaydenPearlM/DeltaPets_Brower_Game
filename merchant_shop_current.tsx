import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/useAuth";
import { apiFetch } from "@/lib/api/baseClient";
import { loadMerchantResources } from "@/lib/kithna/merchantLoad";
import { merchantBuyLimit } from "@/lib/kithna/merchantTrade";
import {
  fetchWildwoodStatus,
  acceptAssantiFoodQuest,
  turnInAssantiFoodQuest,
  type WildwoodStatus,
} from "@/lib/kithna/wildwoodApi";
import { type BackendInventoryItem } from "@/components/inventory/inventory";
import "../../Merchant_global_styles.css";
import "./kithna_Food_Shop.css";
import PoeTayToe from "../../../../components/PoeTayToe/PoeTayToe";
import assantiShopArt from "@/kith/assets/merchant/Assantis_shop.png";
import foodDefinitions from '../../../../../../pet_items/food.json';
import potionDefinitions from '../../../../../../pet_items/Potions.json';
const foodSlugs = new Set(foodDefinitions.map(item => item.slug));
const potionSlugs = new Set(potionDefinitions.map(item => item.slug));
type ShopFood = {
  slug: string;
  name: string;
  description: string;
  price: number | null;
  buybackPrice: number | null;
  category: "food" | "potion";
  hp?: number;
  tradeable?: boolean;
  hunger: number;
  stackLimit: number;
  permanent: boolean;
  available: boolean;
  stock?: number | null;
  stockMode?: "unlimited";
  purchaseLimit?: number;
};
type FoodShop = {
  potionTrading?: "unconfigured";
  tradeMode?: "purchases-first";
  deltaDay: number;
  nextRotationAt: string;
  rotationInMs: number;
  merchantDots: number;
  catalog: ShopFood[];
  dailyFood: {
    status: "locked" | "available" | "claimed";
    nextClaimAt: string | null;
  };
};
const quantityWithin = (value: number, limit: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(limit, Math.floor(value))) : 0;
const QWEN_CHAT = [
  "I might be making potions now, but once you unlock the farm, I'll also have fresh meat and vegetables available for purchase!",
  "Assanti is away on business, so I'm keeping the shop going. I'd rather make potions, though. They don't always turn out quite right though!",
  "Oh, have you noticed that strange purple mist rising from that island in the distance? Nobody in Kithna knows what it is. It's been there for a while now, and people are starting to talk. I just hope it stays over there. I've got enough trouble keeping my potions from exploding!",
  "Have you heard? Alec over at the breeding station got an egg where nothing came out. That's crazy!",
  "I like to work alone, but this makes going to the bathroom hard and awkward.",
  "I was taking a little stroll through town the other day when I saw the most beautiful Kith I've ever seen. Absolutely stunning. Then it spotted me and took off so fast I started wondering if I'd imagined the whole thing. Honestly...rude.",
];
type InventoryWalletResponse = {
  items: BackendInventoryItem[];
  wallet: {
    dots: number;
    crystals: number;
  };
};
type QuantityControlProps = {
  name: string;
  quantity: number;
  limit: number;
  disabled: boolean;
  onChange: (quantity: number) => void;
};

function QuantityControl({
  name,
  quantity,
  limit,
  disabled,
  onChange,
}: QuantityControlProps) {
  const currentQuantity = quantityWithin(quantity, limit);
  return (
    <div className="kithna-food-qty-control">
      <button
        type="button"
        className="kithna-food-qty-arrow"
        aria-label={`Decrease ${name} quantity`}
        disabled={disabled || currentQuantity === 0}
        onClick={() => onChange(currentQuantity - 1)}
      >
        ◀
      </button>
      <input
        type="number"
        className="kithna-food-trade-button"
        min={0}
        max={limit}
        step={1}
        inputMode="numeric"
        value={currentQuantity}
        disabled={disabled || limit === 0}
        onChange={(event) =>
          onChange(quantityWithin(Number(event.target.value), limit))
        }
        aria-label={`${name} quantity to buy`}
      />
      <button
        type="button"
        className="kithna-food-qty-arrow"
        aria-label={`Increase ${name} quantity`}
        disabled={disabled || currentQuantity >= limit}
        onClick={() => onChange(currentQuantity + 1)}
      >
        ▶
      </button>
    </div>
  );
}

export default function KithnaFoodShop() {
  const { user } = useAuth();
  const userName =
    user?.user_metadata?.username ??
    user?.user_metadata?.display_name ??
    user?.user_metadata?.nickname ??
    "Your";
  const [activeShopTab, setActiveShopTab] = useState<
    "food" | "potions" | "equipment" | "seeds"
  >("food");
  const [priceOrder, setPriceOrder] = useState<"asc" | "desc">("asc");
  const [potionOrder, setPotionOrder] = useState<"asc" | "desc">("asc");
  const [userDots, setUserDots] = useState<number | null>(null);
  const [wildwoodStatus, setWildwoodStatus] = useState<WildwoodStatus | null>(
    null,
  );
  const [shop, setShop] = useState<FoodShop | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [busyAction, setBusyAction] = useState<
    "trade" | "daily" | "quest" | null
  >(null);
  const [purchaseQuantities, setPurchaseQuantities] = useState<
    Record<string, number>
  >({});

  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>(
    {},
  );
  const [merchantMessage, setMerchantMessage] = useState("");
  const [userInventory, setUserInventory] = useState<BackendInventoryItem[]>(
    [],
  );
  const actionInFlight = useRef(false);
  const greetedUser = useRef<string | null>(null);
  const refreshVersion = useRef(0);
  const displayedDay = useRef<number | null>(null);
  const [newsLine, setNewsLine] = useState("Hello there!");
  const refreshShop = useCallback(async () => {
    const version = ++refreshVersion.current;
    setLoadState("loading");
    try {
      const { shop: currentShop, inventory, quests, error } = await loadMerchantResources(
        apiFetch<FoodShop>("/api/merchants/kithna/food"),
        apiFetch<InventoryWalletResponse>("/api/inventory"),
        fetchWildwoodStatus(),
      );
      if (version === refreshVersion.current) {
        if (
          currentShop && displayedDay.current !== null &&
          displayedDay.current !== currentShop.deltaDay
        ) {
          setPurchaseQuantities({});
          if (!actionInFlight.current)
            setMerchantMessage(
              "A new DeltaPets day! I've refreshed the selection. Please choose your purchases again.",
            );
        }
        if (currentShop) displayedDay.current = currentShop.deltaDay;
        setShop(currentShop);
        setUserDots(inventory?.wallet.dots ?? null);
        setUserInventory(inventory?.items ?? []);
        setWildwoodStatus(quests);
        setLoadState(currentShop && inventory ? "ready" : "error");
      }
      if (!currentShop || !inventory) throw error ?? new Error("Could not refresh the shop. Please try again.");
      return currentShop;
    } catch (error) {
      if (version === refreshVersion.current) {
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
        if (sessionStorage.getItem(key))
          setNewsLine("Hello there! Welcome back!");
        sessionStorage.setItem(key, "yes");
      }
    } catch {
      /* Visiting and trading also work when storage is unavailable. */
    }
    const refresh = () => {
      if (actionInFlight.current) return;
      void refreshShop().catch((error: unknown) =>
        setMerchantMessage(
          error instanceof Error
            ? error.message
            : "Could not refresh the shop. Please try again.",
        ),
      );
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
    const timer = window.setTimeout(
      () => {
        if (!actionInFlight.current)
          void refreshShop().catch(() =>
            setMerchantMessage(
              "The day changed. Please refresh the shop before trading.",
            ),
          );
      },
      Math.max(250, shop.rotationInMs + 100),
    );
    return () => window.clearTimeout(timer);
  }, [shop, refreshShop]);
  const catalog = shop?.catalog ?? [];
  const dailyFoods = catalog.filter(item => item.category === 'food' && item.available && foodSlugs.has(item.slug));
  const dailyPotionPreviews = catalog.filter(item => item.category === 'potion' && item.available && potionSlugs.has(item.slug));
  const sortedAvailableFoods = [...dailyFoods].sort((a,b) => priceOrder === 'asc' ? (a.price ?? Infinity)-(b.price ?? Infinity) : (b.price ?? 0)-(a.price ?? 0));
  const sortedPotionPreviews = [...dailyPotionPreviews].sort((a,b) => potionOrder === 'asc' ? (a.price ?? Infinity)-(b.price ?? Infinity) : (b.price ?? 0)-(a.price ?? 0));
  const dailyGoods = [...dailyFoods,...dailyPotionPreviews];
  const ownedQuantity = (slug: string) =>
    userInventory.find((item) => item.slug === slug)?.qty ?? 0;
  const buyLimit = (food: ShopFood) =>
    merchantBuyLimit(food, ownedQuantity(food.slug));
  const tradeableUserInventory = userInventory.filter(
    (item) => item.qty > 0 && catalog.some((food) => food.slug === item.slug && food.tradeable !== false && food.buybackPrice !== null),
  );
  const priceOf = (slug: string) =>
    catalog.find((food) => food.slug === slug)?.buybackPrice ?? 0;
  const purchaseTotal = dailyGoods.reduce(
    (total, food) =>
      total +
      quantityWithin(purchaseQuantities[food.slug] ?? 0, buyLimit(food)) *
        (food.price ?? 0),
    0,
  );
  const sellTotal = tradeableUserInventory.reduce(
    (total, item) =>
      total +
      quantityWithin(sellQuantities[item.slug] ?? 0, item.qty) *
        priceOf(item.slug),
    0,
  );
  const displayedPurchaseTotal = purchaseTotal;
  const displayedSellTotal = sellTotal;
  const canCompleteFoodTrade = busyAction === null && loadState === 'ready' && userDots !== null && !!shop &&
    (dailyGoods.some(item => quantityWithin(purchaseQuantities[item.slug] ?? 0, buyLimit(item)) > 0) ||
      tradeableUserInventory.some(item => quantityWithin(sellQuantities[item.slug] ?? 0, item.qty) > 0)) &&
    (shop.tradeMode === "purchases-first" ? purchaseTotal : purchaseTotal - sellTotal) <= userDots &&
    sellTotal - purchaseTotal <= shop.merchantDots;
  const clearGoods = () => setPurchaseQuantities({});
  const quest = wildwoodStatus?.foodQuest;
  const questLabel = !quest
    ? "Quest status unavailable"
    : quest.status === "available"
      ? "Quest available"
      : quest.status === "completed"
        ? "Quest completed — Daily Food unlocked"
        : quest.status === "ready_to_turn_in"
          ? "Ready to complete"
          : quest.progress === 0
            ? "Quest accepted"
            : "Quest in progress";
  async function completeTrade() {
    if (actionInFlight.current || !shop || userDots === null) return;
    const purchases = dailyGoods
      .map((food) => ({
        slug: food.slug,
        quantity: quantityWithin(
          purchaseQuantities[food.slug] ?? 0,
          buyLimit(food),
        ),
      }))
      .filter((line) => line.quantity > 0);
    const sales = tradeableUserInventory
      .map((item) => ({
        slug: item.slug,
        quantity: quantityWithin(sellQuantities[item.slug] ?? 0, item.qty),
      }))
      .filter((line) => line.quantity > 0);
    if (!purchases.length && !sales.length) return;
    actionInFlight.current = true;
    setBusyAction("trade");
    setMerchantMessage("");
    let tradeConfirmed = false;
    try {
      const current = await refreshShop();
      if (current.deltaDay !== shop.deltaDay)
        throw new Error(
          "Today's selection has changed. Review your quantities and trade again.",
        );
      const slugs = new Set([...purchases.map(line => line.slug), ...sales.map(line => line.slug)]);
      await apiFetch('/api/merchants/kithna/food/trade', {
        method: 'POST', json: {deltaDay: shop.deltaDay, lines: [...slugs].map(slug => ({
          slug, buy: purchases.find(line => line.slug === slug)?.quantity ?? 0,
          sell: sales.find(line => line.slug === slug)?.quantity ?? 0,
        }))},
      });
      tradeConfirmed = true;
      await refreshShop();
      setMerchantMessage("Trade complete.");
    } catch (error) {
      let refreshed = true;
      await refreshShop().catch(() => {
        refreshed = false;
      });
      const errorMessage =
        error instanceof Error ? error.message : "Trade failed.";
      const dialogue =
        errorMessage === "Not enough Dots."
          ? "You're short on Dots, Keeper. Try buying a little less."
          : errorMessage === "Assanti does not have enough Dots."
            ? "My purse won't stretch that far, Keeper. Try selling a little less."
            : errorMessage;
      setMerchantMessage(
          (tradeConfirmed ? "Trade completed, but the display could not refresh. " : dialogue) +
          (refreshed
            ? ""
            : " Balances could not be refreshed. Trading is disabled until the shop reconnects."),
      );
    } finally {
      setPurchaseQuantities({});
      setSellQuantities({});
      actionInFlight.current = false;
      setBusyAction(null);
    }
  }
  async function claimDailyFood() {
    if (actionInFlight.current || shop?.dailyFood.status !== "available")
      return;
    actionInFlight.current = true;
    setBusyAction("daily");
    let message = "";
    try {
      await apiFetch("/api/merchants/kithna/food/daily", { method: "POST" });
      message =
        "Assanti gave you 5 Basic Meat and 5 Basic Vegetables. Keep those Kith well fed!";
    } catch (error) {
      message =
        error instanceof Error ? error.message : "Daily Food claim failed.";
    } finally {
      await refreshShop().catch(() => {
        message += " Could not refresh balances. Please reconnect.";
      });
      setMerchantMessage(message);
      actionInFlight.current = false;
      setBusyAction(null);
    }
  }
  async function interactWithQuest() {
    if (
      actionInFlight.current ||
      !quest ||
      !["available", "ready_to_turn_in"].includes(quest.status)
    )
      return;
    actionInFlight.current = true;
    setBusyAction("quest");
    let message = "";
    try {
      if (quest.status === "available") {
        await acceptAssantiFoodQuest();
        message =
          "Thank you, Keeper. Help with the corrupted Kith, then come back to me.";
      } else {
        await turnInAssantiFoodQuest();
        message =
          "The farm is safe again. Thank you! Your Daily Food is now unlocked.";
      }
    } catch (error) {
      message =
        error instanceof Error ? error.message : "Could not update the quest.";
    } finally {
      await refreshShop().catch(() => {
        message += " Could not refresh the shop. Please reconnect.";
      });
      setMerchantMessage(message);
      actionInFlight.current = false;
      setBusyAction(null);
    }
  }
  function showAliuneNews() {
    setNewsLine(QWEN_CHAT[Math.floor(Math.random() * QWEN_CHAT.length)]);
  }
  return (
    <main className="dp-merchant-page kithna-food-shop">
      <div className="dp-merchant-shell poeTayToeHost">
        <PoeTayToe locationKey="food-merchant" />
        <section className="dp-merchant-panel dp-standard-panel">
          <Link className="kithna-food-back-link" to="/cities/kithna">
            ← Back to Kithna
          </Link>
          <header className="dp-merchant-header kithna-food-header">
            <div className="dp-merchant-foreground kithna-food-merchant-art">
              <img
                src={assantiShopArt}
                alt="Qwen tending her older sister Assanti's shop, surrounded by food, herbs, and potions."
                className="kithna-food-merchant-image"
              />
            </div>

            <div className="kithna-food-merchant-info-slot">
              <div className="kithna-food-merchant-summary">
                <h1 className="dp-merchant-name">Assanti Shop</h1>
                <div className="kithna-food-merchant-introduction">
                  <p>“Hello there! I'm Qwen, Assanti's little sister!</p>
                  <p>
                    I'm looking after the shop while she's off on some kind
                    of... spiritual journey? I don't know what she's doing, but
                    I'm keeping things running.
                  </p>
                  <p>
                    I know how to tend to the Meat Trees and vegetable bushes,
                    but I'd much rather brew potions!
                  </p>
                  <p>
                    Every once in a while I come up with new potions and test
                    them on willing helpers. Some turn out great... and some
                    don't. If you're feeling brave, feel free to give them a
                    try!”
                  </p>
                </div>
                <div className="kithna-food-chat-panel">
                  <p className="dp-merchant-dialogue" aria-live="polite">
                    {newsLine}
                  </p>
                  <div className="kithna-food-info-actions">
                    <button
                      type="button"
                      className="btn-pearl kithna-food-info-button"
                      onClick={showAliuneNews}
                    >
                      Chat with Qwen
                    </button>
                    <button
                      type="button"
                      className="dp-btn btn-gold kithna-food-farm-button"
                      disabled={quest?.status !== "completed"}
                      onClick={() => setActiveShopTab("food")}
                      title={
                        quest?.status === "completed"
                          ? "View meat and vegetables"
                          : "Complete the food quest to unlock"
                      }
                    >
                      {quest?.status !== "completed" && (
                        <span aria-hidden="true">🔒 </span>
                      )}
                      Meat &amp; Veggies
                    </button>
                  </div>
                </div>
                {shop?.dailyFood.status !== "locked" && shop && (
                  <div className="dp-merchant-daily kithna-food-header-daily">
                    <h3 className="dp-merchant-daily-title">Free Daily Food</h3>
                    <p className="dp-merchant-daily-copy">
                      5 Basic Meat + 5 Basic Vegetables, once every 24 hours.
                    </p>
                    <p>
                      {shop.dailyFood.status === "claimed"
                        ? "Already claimed. Your next meal is growing!"
                        : "Your food is ready, Keeper."}
                    </p>
                    {shop.dailyFood.status === "claimed" &&
                      shop.dailyFood.nextClaimAt && (
                        <p>
                          Available again:{" "}
                          {new Date(
                            shop.dailyFood.nextClaimAt,
                          ).toLocaleString()}
                        </p>
                      )}
                    <button
                      type="button"
                      className="dp-btn btn-gold kithna-food-daily-button"
                      disabled={
                        busyAction !== null ||
                        shop.dailyFood.status !== "available"
                      }
                      onClick={() => void claimDailyFood()}
                    >
                      {busyAction === "daily"
                        ? "Claiming..."
                        : "Claim Daily Food"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="kithna-food-main-layout">
            <div className="kithna-food-shop-utilities">
              <div hidden>
                <h3 className="dp-merchant-daily-title">Help Assanti</h3>
                <p>{questLabel}</p>
                {quest?.status === "available" && (
                  <p>
                    Could you help with the strange Kith troubling my farm,
                    Keeper?
                  </p>
                )}
                {quest?.status === "ready_to_turn_in" && (
                  <p>You're back! Tell me how things went at the farm.</p>
                )}
                {quest?.status === "active" && (
                  <p>
                    Corrupted Kith: {quest.progress} / {quest.target}. Keep
                    going, Keeper!
                  </p>
                )}
                {quest?.status === "available" ||
                quest?.status === "ready_to_turn_in" ? (
                  <button
                    type="button"
                    className="btn-pearl"
                    disabled={busyAction !== null || !shop}
                    onClick={() => void interactWithQuest()}
                  >
                    {busyAction === "quest"
                      ? "Updating..."
                      : quest.status === "available"
                        ? "Accept quest"
                        : "Complete quest"}
                  </button>
                ) : null}
                {quest?.status === "active" && (
                  <Link to="/cities/kithna">Return to Kithna</Link>
                )}
              </div>
              {!shop && (
                <button
                  type="button"
                  className="btn-pearl"
                  disabled={busyAction !== null || loadState === "loading"}
                  onClick={() =>
                    void refreshShop()
                      .then(() => setMerchantMessage("Shop refreshed."))
                      .catch((error: unknown) =>
                        setMerchantMessage(
                          error instanceof Error
                            ? error.message
                            : "Could not refresh the shop.",
                        ),
                      )
                  }
                >
                  Retry shop
                </button>
              )}
              {merchantMessage ? (
                <p className="kithna-food-message" role="status">
                  {merchantMessage}
                </p>
              ) : null}
            </div>
            <div className="kithna-food-trade-area">
              <div className="kithna-food-checkout-bar">
                <div
                  className="kithna-food-checkout-summary"
                  aria-live="polite"
                >
                  <span className="kithna-food-goods-dots-label">
                    Trade Total
                  </span>
                  <strong className="kithna-food-goods-dots-value">
                    {displayedPurchaseTotal - displayedSellTotal >= 0
                      ? "+"
                      : "−"}
                    {Math.abs(
                      displayedPurchaseTotal - displayedSellTotal,
                    ).toLocaleString()}{" "}
                    Dots
                  </strong>
                  <small>
                    Buy: {displayedPurchaseTotal.toLocaleString()} · Sell:{" "}
                    {displayedSellTotal.toLocaleString()}
                  </small>
                </div>
                <button
                  type="button"
                  className="dp-btn btn-gold"
                  disabled={!canCompleteFoodTrade}
                  onClick={() => void completeTrade()}
                >
                  {busyAction === "trade" ? "Trading..." : "Complete Trade"}
                </button>
                <small className="kithna-food-checkout-note">Positive totals cost Dots; negative totals pay you.</small>
              </div>
              <div className="kithna-food-trade-columns">
                <section className="dp-merchant-section">
                  <div className="kithna-food-goods-heading">
                    <h2 className="dp-merchant-section-title">
                      Assanti's Groceries
                    </h2>
                    <div className="kithna-food-goods-dots-panel">
                      <span className="kithna-food-goods-dots-label">
                        Merchant Dots
                      </span>
                      <strong className="kithna-food-goods-dots-value">
                        {shop ? shop.merchantDots.toLocaleString() : "—"}
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="kithna-food-clear-button"
                    onClick={clearGoods}
                    disabled={busyAction !== null}
                  >
                    Clear Goods
                  </button>
                  <div
                    className="kithna-food-shop-tabs"
                    role="tablist"
                    aria-label="Merchant goods categories"
                  >
                    <button
                      type="button"
                      role="tab"
                      id="qwen-tab-food"
                      aria-controls="qwen-panel-food"
                      aria-selected={activeShopTab === "food"}
                      className="kithna-food-shop-tab"
                      onClick={() => setActiveShopTab("food")}
                    >
                      Food
                    </button>
                    <button
                      type="button"
                      role="tab"
                      id="qwen-tab-potions"
                      aria-controls="qwen-panel-potions"
                      aria-selected={activeShopTab === "potions"}
                      className="kithna-food-shop-tab"
                      onClick={() => setActiveShopTab("potions")}
                    >
                      Potions
                    </button>
                    <button
                      type="button"
                      role="tab"
                      id="qwen-tab-equipment"
                      aria-controls="qwen-panel-equipment"
                      aria-selected={activeShopTab === "equipment"}
                      aria-disabled="true"
                      className="kithna-food-shop-tab kithna-food-shop-tab--locked"
                      onClick={() => setActiveShopTab("equipment")}
                    >
                      Farming Equipment <span aria-hidden="true">🔒</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      id="qwen-tab-seeds"
                      aria-controls="qwen-panel-seeds"
                      aria-selected={activeShopTab === "seeds"}
                      aria-disabled="true"
                      className="kithna-food-shop-tab kithna-food-shop-tab--locked"
                      onClick={() => setActiveShopTab("seeds")}
                    >
                      Farming Seeds <span aria-hidden="true">🔒</span>
                    </button>
                  </div>
                  {activeShopTab === "food" && (
                    <div
                      id="qwen-panel-food"
                      role="tabpanel"
                      aria-labelledby="qwen-tab-food"
                    >
                      <div className="kithna-food-category-toolbar">
                        <p>
                          Assanti's shop offers fresh meat and vegetables grown
                          on the family farm, along with a changing selection of
                          everyday food for your Kith.
                        </p>
                        <label className="kithna-food-price-sort">
                          Price
                          <select
                            value={priceOrder}
                            onChange={(event) =>
                              setPriceOrder(
                                event.target.value === "desc" ? "desc" : "asc",
                              )
                            }
                          >
                            <option value="asc">Low to high</option>
                            <option value="desc">High to low</option>
                          </select>
                        </label>
                      </div>
                      <div className="kithna-food-trade-list">
                        {!shop && (
                          <p role="status">
                            {loadState === "error"
                              ? "Shop unavailable. Retry to load today's food."
                              : "Loading today's food..."}
                          </p>
                        )}
                        <div
                          className="kithna-food-trade-row kithna-food-buy-row kithna-food-column-labels"
                          aria-hidden="true"
                        >
                          <span className="kithna-food-trade-name">Items</span>
                          <span>In Stock</span>
                          <span>Price</span>
                          <span>QTY</span>
                          <span>Total Dots</span>
                        </div>
                        {sortedAvailableFoods.map((food) => {
                          const quantity = quantityWithin(
                            purchaseQuantities[food.slug] ?? 0,
                            buyLimit(food),
                          );
                          const allowedQuantity = buyLimit(food);
                          return (
                            <div
                              className="kithna-food-trade-row kithna-food-buy-row"
                              key={food.slug}
                            >
                              <span className="kithna-food-trade-name">
                                {food.name}{" "}
                                <span className="kithna-food-inline-stat">
                                  +{food.hunger} Hunger
                                </span>
                                <small>
                                  {food.slug === "egg"
                                    ? "A simple egg for a quick snack."
                                    : food.description}
                                </small>
                              </span>
                              <span
                                className="kithna-food-trade-cell kithna-food-stock-cell"
                                title={
                                  food.stockMode === "unlimited" ? "Unlimited supply; up to 50 per purchase"
                                  : food.stock == null
                                    ? "Merchant stock quantity is not yet included in the API"
                                    : undefined
                                }
                              >
                                {food.stockMode === "unlimited" ? "∞" : food.stock == null ? "—" : food.stock}
                              </span>
                              <span className="kithna-food-trade-cell">
                                {food.price}
                              </span>
                              <QuantityControl
                                name={food.name}
                                quantity={quantity}
                                limit={allowedQuantity}
                                disabled={busyAction !== null}
                                onChange={(nextQuantity) =>
                                  setPurchaseQuantities((current) => ({
                                    ...current,
                                    [food.slug]: nextQuantity,
                                  }))
                                }
                              />
                              <output
                                className="kithna-food-trade-cell kithna-food-row-total"
                                aria-label={`${food.name} total Dots to spend`}
                              >
                                {quantity > 0
                                  ? (
                                      Math.min(quantity, allowedQuantity) * (food.price ?? 0)).toLocaleString()
                                  : "0"}
                              </output>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {activeShopTab === "potions" && (
                    <div
                      id="qwen-panel-potions"
                      role="tabpanel"
                      aria-labelledby="qwen-tab-potions"
                      className="kithna-food-tab-coming-soon"
                    >
                      <div className="kithna-food-category-toolbar">
                        <p>
                          Basic healing Potions from Qwen's own handmade potion
                          store.
                        </p>
                        <label className="kithna-food-price-sort">
                          Prices
                          <select
                            value={potionOrder}
                            onChange={(event) =>
                              setPotionOrder(
                                event.target.value === "desc" ? "desc" : "asc",
                              )
                            }
                          >
                            <option value="asc">Low to high</option>
                            <option value="desc">High to low</option>
                          </select>
                        </label>
                      </div>
                      <div
                        className="kithna-food-trade-list"
                        aria-label="Qwen potion prices and stock"
                      >
                        <div
                          className="kithna-food-trade-row kithna-food-buy-row kithna-food-column-labels"
                          aria-hidden="true"
                        >
                          <span className="kithna-food-trade-name">
                            Potions
                          </span>
                          <span>In Stock</span>
                          <span>Price</span>
                          <span>QTY</span>
                          <span>Total Dots</span>
                        </div>
                        {shop?.potionTrading === "unconfigured" && (
                          <p className="kithna-food-empty-inventory">Potion trading is not available yet.</p>
                        )}
                        {sortedPotionPreviews.map((potion) => (
                          <div
                            className="kithna-food-trade-row kithna-food-buy-row"
                            key={potion.slug}
                          >
                            <span className="kithna-food-trade-name">
                              {potion.name}
                              <small>Restores {potion.hp} HP</small>
                            </span>
                            <span
                              className="kithna-food-trade-cell kithna-food-stock-cell"
                              title={potion.stock == null ? "Potion trading is not configured" : undefined}
                            >
                              {potion.stock ?? "—"}
                            </span>
                            <span className="kithna-food-trade-cell">
                              {potion.price?.toLocaleString() ?? "Not configured"}
                            </span>
                            <QuantityControl
                              name={potion.name}
                              quantity={purchaseQuantities[potion.slug] ?? 0}
                              limit={buyLimit(potion)}
                              disabled={busyAction !== null}
                              onChange={(nextQuantity) =>
                                setPurchaseQuantities((current) => ({
                                  ...current,
                                  [potion.slug]: nextQuantity,
                                }))
                              }
                            />
                            <output className="kithna-food-trade-cell kithna-food-row-total">
                              {(
                                quantityWithin(
                                  purchaseQuantities[potion.slug] ?? 0,
                                  buyLimit(potion),
                                ) * (potion.price ?? 0)
                              ).toLocaleString()}
                            </output>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeShopTab === "equipment" && (
                    <div
                      id="qwen-panel-equipment"
                      role="tabpanel"
                      aria-labelledby="qwen-tab-equipment"
                      className="kithna-food-tab-coming-soon kithna-food-locked-panel"
                    >
                      <p className="kithna-food-locked-notice">
                        Farming Equipment — Locked until the farm is ready.
                      </p>
                      <div
                        className="kithna-food-trade-list"
                        aria-label="Farming Equipment preview"
                      >
                        <div
                          className="kithna-food-trade-row kithna-food-buy-row kithna-food-column-labels"
                          aria-hidden="true"
                        >
                          <span className="kithna-food-trade-name">
                            Farming Equipment
                          </span>
                          <span>In Stock</span>
                          <span>Price</span>
                          <span>QTY</span>
                          <span>Total Dots</span>
                        </div>
                        {(["Hoe", "Watering Can", "Shovel"] as const).map(
                          (tool) => (
                            <div
                              className="kithna-food-trade-row kithna-food-buy-row"
                              key={tool}
                            >
                              <span className="kithna-food-trade-name">
                                {tool}
                                <small>Locked until the farm is ready</small>
                              </span>
                              <span className="kithna-food-trade-cell kithna-food-stock-cell">
                                —
                              </span>
                              <span className="kithna-food-trade-cell">—</span>
                              <input
                                type="number"
                                className="kithna-food-trade-button"
                                value={0}
                                min={0}
                                disabled
                                readOnly
                                aria-label={`${tool} quantity, locked`}
                              />
                              <output className="kithna-food-trade-cell kithna-food-row-total">
                                0
                              </output>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                  {activeShopTab === "seeds" && (
                    <div
                      id="qwen-panel-seeds"
                      role="tabpanel"
                      aria-labelledby="qwen-tab-seeds"
                      className="kithna-food-tab-coming-soon kithna-food-locked-panel"
                    >
                      <p className="kithna-food-locked-notice">
                        Farming Seeds — Locked until the farm is ready.
                      </p>
                      <div
                        className="kithna-food-trade-list"
                        aria-label="Farming Seeds preview"
                      >
                        <div
                          className="kithna-food-trade-row kithna-food-buy-row kithna-food-column-labels"
                          aria-hidden="true"
                        >
                          <span className="kithna-food-trade-name">
                            Farming Seeds
                          </span>
                          <span>In Stock</span>
                          <span>Price</span>
                          <span>QTY</span>
                          <span>Total Dots</span>
                        </div>
                        {(
                          [
                            "Carrot Seeds",
                            "Potato Seeds",
                            "Tomato Seeds",
                            "Corn Seeds",
                            "Lettuce Seeds",
                          ] as const
                        ).map((seed) => (
                          <div
                            className="kithna-food-trade-row kithna-food-buy-row"
                            key={seed}
                          >
                            <span className="kithna-food-trade-name">
                              {seed}
                              <small>Locked until the farm is ready</small>
                            </span>
                            <span className="kithna-food-trade-cell kithna-food-stock-cell">
                              —
                            </span>
                            <span className="kithna-food-trade-cell">—</span>
                            <input
                              type="number"
                              className="kithna-food-trade-button"
                              value={0}
                              min={0}
                              disabled
                              readOnly
                              aria-label={`${seed} quantity, locked`}
                            />
                            <output className="kithna-food-trade-cell kithna-food-row-total">
                              0
                            </output>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
                <section className="dp-merchant-section">
                  <div className="kithna-food-goods-heading">
                    <h2 className="dp-merchant-section-title">
                      {userName} Inventory
                    </h2>
                    <div className="kithna-food-goods-dots-panel">
                      <span className="kithna-food-goods-dots-label">
                        User Dots
                      </span>
                      <strong className="kithna-food-goods-dots-value">
                        {userDots === null ? "—" : userDots.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="kithna-food-clear-button"
                    onClick={() => setSellQuantities({})}
                    disabled={busyAction !== null}
                  >
                    Clear Inventory Selection
                  </button>
                  <div className="kithna-food-user-inventory">
                    <div
                      className="kithna-food-trade-row kithna-food-column-labels"
                      aria-hidden="true"
                    >
                      <span className="kithna-food-trade-name">Food</span>
                      <span>Owned</span>
                      <span>Price</span>
                      <span>QTY</span>
                      <span>Total Dots</span>
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
                              {catalog.find((food) => food.slug === item.slug)
                                ?.name ?? item.name}
                            </span>
                            <span className="kithna-food-trade-cell">
                              {item.qty}
                            </span>
                            <span className="kithna-food-trade-cell">
                              {priceOf(item.slug).toLocaleString()}
                            </span>
                            <div className="kithna-food-qty-control">
                              <button
                                type="button"
                                className="kithna-food-qty-arrow"
                                aria-label={`Decrease ${item.name} quantity to sell`}
                                disabled={
                                  busyAction !== null ||
                                  !shop ||
                                  sellQuantity <= 0
                                }
                                onClick={() =>
                                  setSellQuantities((current) => ({
                                    ...current,
                                    [item.slug]: quantityWithin(
                                      (current[item.slug] ?? 0) - 1,
                                      item.qty,
                                    ),
                                  }))
                                }
                              >
                                ◀
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={item.qty}
                                step={1}
                                inputMode="numeric"
                                className="kithna-food-trade-button"
                                value={sellQuantity}
                                disabled={busyAction !== null || !shop}
                                onChange={(event) =>
                                  setSellQuantities((current) => ({
                                    ...current,
                                    [item.slug]: quantityWithin(
                                      Number(event.target.value),
                                      item.qty,
                                    ),
                                  }))
                                }
                                aria-label={`${item.name} quantity to sell`}
                              />
                              <button
                                type="button"
                                className="kithna-food-qty-arrow"
                                aria-label={`Increase ${item.name} quantity to sell`}
                                disabled={
                                  busyAction !== null ||
                                  !shop ||
                                  sellQuantity >= item.qty
                                }
                                onClick={() =>
                                  setSellQuantities((current) => ({
                                    ...current,
                                    [item.slug]: quantityWithin(
                                      (current[item.slug] ?? 0) + 1,
                                      item.qty,
                                    ),
                                  }))
                                }
                              >
                                ▶
                              </button>
                            </div>
                            <output
                              className="kithna-food-trade-cell kithna-food-row-total"
                              aria-label={`${item.name} total Dots to receive`}
                            >
                              {(
                                sellQuantity * priceOf(item.slug)
                              ).toLocaleString()}
                            </output>
                          </div>
                        );
                      })
                    ) : (
                      <p className="kithna-food-empty-inventory">
                        {userDots === null
                          ? loadState === "error"
                            ? "Inventory unavailable. Retry to load your items."
                            : "Loading your inventory..."
                          : !shop ? "Inventory loaded. Shop prices are unavailable; trading is disabled."
                          : "You have no food to sell."}
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
