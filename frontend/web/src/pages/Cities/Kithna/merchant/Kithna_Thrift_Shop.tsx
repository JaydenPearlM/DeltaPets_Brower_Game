import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api/baseClient";
import { useAuth } from "@/app/providers/useAuth";
import { isRegularInventoryItem } from "@/lib/inventoryDisplay";
import { kennithCatalog } from "@/lib/kithna/kennithCatalog";
import { kennithItemImages } from "@/lib/kithna/kennithItemImages";
import "../../Merchant_global_styles.css";
import "./kithna_Food_Shop.css";
import "./Kithna_Thrift_Shop.css";
import kennithShopArt from "@/kith/assets/merchant/kennith_Shop.png";

type StockItem = {
  slug: string;
  category: ShopCategory;
  stock: number;
  price: number;
};

type OwnedItem = {
  slug: string;
  name: string;
  qty: number;
  availableQty?: number;
  equippedQty?: number;
};

type ShopCategory = "clothing" | "accessories" | "relics" | "petCare";

const KENNITH_CHAT = [
  "I asked Qwen for hair on my head. HAIR! Not whiskers, paws, and a tail!",
  "She tells me she doesn't know how to change me back. Wonderful. Absolutely wonderful.",
  "Do you have any idea how difficult it is to fold trousers with these tiny paws?",
  "If Qwen offers you a potion, run. Preferably on two legs while you still have them.",
  "Welcome to Kennith Thrift Store. Yes, I'm a ferret. No, I don't want to talk about it.",
  "I was going bald. Qwen said her potion would help. Now I have fur everywhere except where I wanted a respectable hairstyle!",
];

const categories: ReadonlyArray<{
  id: ShopCategory;
  label: string;
  description: string;
}> = [
  {
    id: "clothing",
    label: "Basic Clothing",
    description: "Everyday clothing for your Profile avatar.",
  },
  {
    id: "accessories",
    label: "Hats & Glasses",
    description:
      "Basic hats, glasses, and accessories for your Profile avatar.",
  },
  {
    id: "relics",
    label: "Basic Relics",
    description: "A selection of basic relics for your Kith.",
  },
  {
    id: "petCare",
    label: "Basic Pet Care",
    description: "Everyday items to help look after your Kith.",
  },
];

const tradeCatalog = categories.flatMap(({ id }) =>
  kennithCatalog[id].map((item) => ({ ...item, category: id })),
);

export default function KithnaThriftShop() {
  const { user } = useAuth();
  const userName =
    user?.user_metadata?.username ??
    user?.user_metadata?.display_name ??
    user?.user_metadata?.nickname ??
    "Your";
  const [wallet, setWallet] = useState<{ userId: string; dots: number } | null>(
    null,
  );
  const [walletError, setWalletError] = useState(false);
  const [walletRetry, setWalletRetry] = useState(0);
  const [inventory, setInventory] = useState<{
    userId: string;
    items: OwnedItem[];
  } | null>(null);
  const [inventoryError, setInventoryError] = useState(false);
  const [inventoryRetry, setInventoryRetry] = useState(0);
  const ownedItems =
    inventory?.userId === user?.id
      ? (inventory?.items
          .map((item) => ({ ...item, qty: item.availableQty ?? item.qty }))
          .filter(
            (item) =>
              item.qty > 0 &&
              isRegularInventoryItem(item) &&
              tradeCatalog.some((def) => def.slug === item.slug),
          ) ?? null)
      : null;
  const [stock, setStock] = useState<StockItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>(
    {},
  );
  const [trading, setTrading] = useState(false);
  const tradeLock = useRef(false);
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const [tradeMessage, setTradeMessage] = useState("");
  const [rotationDay, setRotationDay] = useState<number | null>(null);
  const [rotationError, setRotationError] = useState(false);
  const [rotationRetry, setRotationRetry] = useState(0);
  const [chatIndex, setChatIndex] = useState(-1);
  const [merchantWallet, setMerchantWallet] = useState<{
    userId: string;
    dots: number;
  } | null>(null);
  const [merchantError, setMerchantError] = useState(false);
  const [merchantRetry, setMerchantRetry] = useState(0);
  const merchantDots =
    merchantWallet?.userId === user?.id ? (merchantWallet?.dots ?? null) : null;
  const userDots = wallet?.userId === user?.id ? (wallet?.dots ?? null) : null;

  useEffect(() => {
    let active = true;
    let requestVersion = 0;
    setWallet(null);
    setWalletError(false);
    if (!user?.id) return;
    const userId = user.id;
    const refreshWallet = async () => {
      const version = ++requestVersion;
      try {
        const response = await apiFetch<{ wallet: { dots: number } }>(
          "/api/me/wallet",
        );
        const dots = response?.wallet?.dots;
        if (!Number.isSafeInteger(dots) || dots < 0)
          throw new Error("Invalid wallet response");
        if (active && version === requestVersion) {
          setWallet({ userId, dots });
          setWalletError(false);
        }
      } catch {
        if (active && version === requestVersion) {
          setWallet(null);
          setWalletError(true);
        }
      }
    };
    void refreshWallet();
    window.addEventListener("focus", refreshWallet);
    const timer = window.setInterval(refreshWallet, 30_000);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshWallet);
      window.clearInterval(timer);
    };
  }, [user?.id, walletRetry]);
  useEffect(() => {
    let active = true;
    let version = 0;
    setMerchantWallet(null);
    setMerchantError(false);
    if (!user?.id) return;
    const userId = user.id;
    const refresh = async () => {
      const current = ++version;
      try {
        const data = await apiFetch<{ merchantDots: number }>(
          "/api/merchants/kithna/kennith/wallet",
        );
        if (!Number.isSafeInteger(data?.merchantDots) || data.merchantDots < 0)
          throw new Error("Invalid merchant wallet");
        if (active && current === version) {
          setMerchantWallet({ userId, dots: data.merchantDots });
          setMerchantError(false);
        }
      } catch {
        if (active && current === version) {
          setMerchantWallet(null);
          setMerchantError(true);
        }
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [user?.id, merchantRetry]);
  useEffect(() => {
    let active = true;
    let version = 0;
    setInventory(null);
    setInventoryError(false);
    if (!user?.id) return;
    const userId = user.id;
    const refresh = async () => {
      const current = ++version;
      try {
        const data = await apiFetch<{ items: OwnedItem[] }>("/api/inventory");
        if (!Array.isArray(data?.items)) {
          throw new Error("Invalid inventory response");
        }
        const validItems = data.items.filter(
          (item): item is OwnedItem =>
            item !== null &&
            typeof item === "object" &&
            typeof item.slug === "string" &&
            item.slug.length > 0 &&
            typeof item.name === "string" &&
            item.name.length > 0 &&
            Number.isSafeInteger(item.qty) &&
            item.qty > 0 &&
            (item.availableQty === undefined ||
              (Number.isSafeInteger(item.availableQty) &&
                item.availableQty >= 0 &&
                item.availableQty <= item.qty)),
        );
        if (active && current === version) {
          if (validItems.length !== data.items.length)
            throw new Error("Invalid inventory response");
          setInventory({ userId, items: validItems });
          setInventoryError(false);
        }
      } catch {
        if (active && current === version) {
          setInventory(null);
          setInventoryError(true);
        }
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("deltapets:care-inventory-change", refresh);
    return () => {
      active = false;
      window.removeEventListener("deltapets:care-inventory-change", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [user?.id, inventoryRetry]);
  useEffect(() => {
    let active = true;
    let version = 0;
    let midnightTimer: number | undefined;
    let loadedDay: number | null = null;
    setRotationDay(null);
    setStock([]);
    setQuantities({});
    setSellQuantities({});
    setRotationError(false);
    if (!user?.id) return;
    const refresh = async () => {
      const current = ++version;
      try {
        const data = await apiFetch<{
          items: StockItem[];
          deltaDay: number;
          serverNow: number;
          nextRotationAt: string;
        }>("/api/merchants/kithna/kennith/stock");
        if (
          !Array.isArray(data.items) ||
          data.items.length < 20 ||
          data.items.length > tradeCatalog.length ||
          new Set(data.items.map((item) => item.slug)).size !==
            data.items.length ||
          categories.some(
            (entry) =>
              data.items.filter((item) => item.category === entry.id).length <
              5,
          ) ||
          data.items.some(
            (item) =>
              !kennithCatalog[item.category]?.some(
                (def) => def.slug === item.slug,
              ) ||
              !Number.isSafeInteger(item.stock) ||
              item.stock < 0 ||
              item.stock > 199 ||
              item.price !==
                kennithCatalog[item.category]?.find(
                  (def) => def.slug === item.slug,
                )?.price,
          )
        )
          throw new Error("Invalid stock response");
        const delay = Date.parse(data.nextRotationAt) - data.serverNow;
        if (
          !Number.isSafeInteger(data.deltaDay) ||
          data.deltaDay < 0 ||
          !Number.isFinite(delay) ||
          delay <= 0 ||
          delay > 21_600_000
        )
          throw new Error("Invalid rotation");
        if (active && current === version) {
          if (loadedDay !== data.deltaDay) {
            setQuantities({});
            setSellQuantities({});
          }
          loadedDay = data.deltaDay;
          setStock(data.items);
          setRotationDay(data.deltaDay);
          setRotationError(false);
          window.clearTimeout(midnightTimer);
          midnightTimer = window.setTimeout(() => {
            setQuantities({});
            setSellQuantities({});
            setRotationDay(null);
            setMerchantWallet(null);
            setMerchantRetry((value) => value + 1);
            void refresh();
          }, delay + 50);
        }
      } catch {
        if (active && current === version) {
          setRotationDay(null);
          setRotationError(true);
        }
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    const stockTimer = window.setInterval(refresh, 30_000);
    return () => {
      active = false;
      window.clearInterval(stockTimer);
      window.clearTimeout(midnightTimer);
      window.removeEventListener("focus", refresh);
    };
  }, [user?.id, rotationRetry]);
  const [activeCategory, setActiveCategory] =
    useState<ShopCategory>("clothing");
  const [priceOrder, setPriceOrder] = useState<"asc" | "desc">("asc");

  const category =
    categories.find((entry) => entry.id === activeCategory) ?? categories[0];

  const purchaseTotal = stock.reduce(
    (sum, item) => sum + (quantities[item.slug] ?? 0) * item.price,
    0,
  );
  const sellPrice = (slug: string) =>
    tradeCatalog.find((item) => item.slug === slug)?.price ?? 0;
  const sellTotal = (ownedItems ?? []).reduce(
    (sum, item) =>
      sum + (sellQuantities[item.slug] ?? 0) * sellPrice(item.slug),
    0,
  );
  const total = purchaseTotal - sellTotal;
  const validSelection =
    Object.entries(quantities).every(
      ([slug, quantity]) =>
        Number.isSafeInteger(quantity) &&
        quantity >= 0 &&
        stock.some(
          (item) => item.slug === slug && quantity <= Math.min(20, item.stock),
        ),
    ) &&
    Object.entries(sellQuantities).every(
      ([slug, quantity]) =>
        quantity === 0 ||
        (Number.isSafeInteger(quantity) &&
          quantity > 0 &&
          (ownedItems ?? []).some(
            (item) => item.slug === slug && quantity <= item.qty,
          ) &&
          (stock.find((item) => item.slug === slug)?.stock ?? 0) -
            (quantities[slug] ?? 0) +
            quantity <=
            199),
    );
  const canTrade =
    !!user &&
    rotationDay !== null &&
    !rotationError &&
    !trading &&
    ownedItems !== null &&
    userDots !== null &&
    merchantDots !== null &&
    validSelection &&
    purchaseTotal + sellTotal > 0 &&
    total <= userDots &&
    -total <= merchantDots;
  const setQuantity = (item: StockItem, value: number) => {
    if (trading) return;
    setQuantities((current) => ({
      ...current,
      [item.slug]: Number.isFinite(value)
        ? Math.max(0, Math.min(20, item.stock, Math.floor(value)))
        : 0,
    }));
  };
  const sellLimit = (item: OwnedItem) =>
    Math.max(
      0,
      Math.min(
        199,
        item.qty,
        199 -
          (stock.find((stockItem) => stockItem.slug === item.slug)?.stock ??
            0) +
          (quantities[item.slug] ?? 0),
      ),
    );
  const setSellQuantity = (item: OwnedItem, value: number) => {
    if (trading) return;
    setSellQuantities((current) => ({
      ...current,
      [item.slug]: Number.isFinite(value)
        ? Math.max(0, Math.min(sellLimit(item), Math.floor(value)))
        : 0,
    }));
  };
  const completeTrade = async () => {
    if (!canTrade || tradeLock.current) return;
    tradeLock.current = true;
    setTrading(true);
    setTradeMessage("");
    const userId = user?.id;
    try {
      const result = await apiFetch<{ ok: boolean }>(
        "/api/merchants/kithna/kennith/trade",
        {
          method: "POST",
          json: {
            deltaDay: rotationDay,
            lines: tradeCatalog
              .filter(
                (item) =>
                  (quantities[item.slug] ?? 0) > 0 ||
                  (sellQuantities[item.slug] ?? 0) > 0,
              )
              .map((item) => ({
                slug: item.slug,
                category: item.category,
                buy: quantities[item.slug] ?? 0,
                sell: sellQuantities[item.slug] ?? 0,
              })),
          },
        },
      );
      if (result?.ok !== true)
        throw new Error(
          "Trade result could not be confirmed. Check your inventory before trying again.",
        );
      if (currentUser.current === userId) setTradeMessage("Trade complete.");
    } catch (error) {
      if (currentUser.current === userId)
        setTradeMessage(
          error instanceof Error
            ? error.message
            : "Trade could not be confirmed. Check your inventory before retrying.",
        );
    } finally {
      tradeLock.current = false;
      setTrading(false);
      setQuantities({});
      setSellQuantities({});
      setRotationDay(null);
      setWalletRetry((value) => value + 1);
      setMerchantRetry((value) => value + 1);
      setInventoryRetry((value) => value + 1);
      setRotationRetry((value) => value + 1);
    }
  };

  return (
    <main className="dp-merchant-page kithna-food-shop kithna-thrift-shop">
      <div className="dp-merchant-shell">
        <section className="dp-merchant-panel dp-standard-panel">
          <Link className="kithna-food-back-link" to="/cities/kithna">
            ← Back to Kithna
          </Link>

          <header className="dp-merchant-header kithna-food-header">
            <div className="dp-merchant-foreground kithna-food-merchant-art">
              <img
                src={kennithShopArt}
                alt="Kennith, a mustached merchant wearing a top hat and purple vest, inside his clothing and pet supplies thrift shop."
                className="kithna-food-merchant-image"
              />
            </div>

            <div className="kithna-food-merchant-info-slot">
              <div className="kithna-food-merchant-summary">
                <h1 className="dp-merchant-name">Kennith Thrift Store</h1>
                <p className="kithna-food-shop-subtitle">
                  Clothing, curios, and everyday Kith care
                </p>

                <div className="kithna-food-merchant-introduction">
                  <p>
                    Welcome to my thrift shop! Looking for something to wear?
                    I've got clothes, hats, glasses, and a few useful things for
                    your Kith.
                  </p>
                </div>

                <div className="kithna-food-chat-panel">
                  <p className="dp-merchant-dialogue" aria-live="polite">
                    {chatIndex < 0
                      ? "Take a look around. Just keep the shelves tidy, please!"
                      : KENNITH_CHAT[chatIndex]}
                  </p>
                  <div className="kithna-food-info-actions">
                    <button
                      type="button"
                      className="btn-pearl kithna-food-info-button"
                      onClick={() =>
                        setChatIndex(
                          (current) => (current + 1) % KENNITH_CHAT.length,
                        )
                      }
                    >
                      Chat with Kennith
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="kithna-food-main-layout">
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
                    {total >= 0 ? "+" : "−"}
                    {Math.abs(total).toLocaleString()} Dots
                  </strong>
                </div>

                <button
                  className="dp-btn btn-gold"
                  type="button"
                  disabled={!canTrade}
                  onClick={() => void completeTrade()}
                >
                  {trading ? "Trading..." : "Complete Trade"}
                </button>
                {(tradeMessage ||
                  !validSelection ||
                  (userDots !== null && total > userDots) ||
                  (merchantDots !== null && -total > merchantDots)) && (
                  <p
                    className="kithna-food-message kithna-food-checkout-note"
                    role="status"
                  >
                    {tradeMessage && <span role="status"> {tradeMessage}</span>}
                    {!validSelection && (
                      <span>
                        {" "}
                        Stock changed. Reduce quantities or clear your
                        selection.
                      </span>
                    )}
                    {userDots !== null && total > userDots && (
                      <span> You do not have enough Dots.</span>
                    )}
                    {merchantDots !== null && -total > merchantDots && (
                      <span> Kennith does not have enough Dots.</span>
                    )}
                  </p>
                )}
              </div>

              <div className="kithna-food-trade-columns">
                <section className="dp-merchant-section">
                  <div className="kithna-food-goods-heading">
                    <div>
                      <h2 className="dp-merchant-section-title">
                        Kennith Thrift Store
                      </h2>
                      <p>
                        Browse everyday clothing, hats and glasses, basic
                        relics, and familiar pet-care supplies. Five items in
                        each category rotate at midnight, Aliune time.
                      </p>
                    </div>
                    <div className="kithna-food-goods-dots-panel">
                      <span className="kithna-food-goods-dots-label">
                        Merchant Dots
                      </span>
                      <strong
                        className="kithna-food-goods-dots-value"
                        aria-live="polite"
                        aria-label={
                          merchantDots === null
                            ? "Merchant Dots unavailable"
                            : undefined
                        }
                      >
                        {merchantDots === null
                          ? "—"
                          : merchantDots.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                  {merchantError && (
                    <p className="kithna-food-message" role="status">
                      Kennith's balance is unavailable.{" "}
                      <button
                        type="button"
                        className="btn-pearl"
                        onClick={() => setMerchantRetry((value) => value + 1)}
                      >
                        Retry merchant balance
                      </button>
                    </p>
                  )}
                  <button
                    type="button"
                    className="kithna-food-clear-button"
                    disabled={trading}
                    onClick={() => setQuantities({})}
                  >
                    Clear Goods
                  </button>

                  <div
                    className="kithna-food-shop-tabs"
                    role="tablist"
                    aria-label="Kennith's goods categories"
                  >
                    {categories.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        role="tab"
                        id={`kennith-tab-${entry.id}`}
                        aria-controls={`kennith-panel-${entry.id}`}
                        aria-selected={activeCategory === entry.id}
                        title={entry.description}
                        tabIndex={activeCategory === entry.id ? 0 : -1}
                        className="kithna-food-shop-tab"
                        onClick={() => setActiveCategory(entry.id)}
                        onKeyDown={(event) => {
                          const index = categories.findIndex(
                            (item) => item.id === entry.id,
                          );
                          const nextIndex =
                            event.key === "ArrowRight"
                              ? (index + 1) % categories.length
                              : event.key === "ArrowLeft"
                                ? (index + categories.length - 1) %
                                  categories.length
                                : event.key === "Home"
                                  ? 0
                                  : event.key === "End"
                                    ? categories.length - 1
                                    : null;
                          if (nextIndex === null) return;
                          event.preventDefault();
                          const next = categories[nextIndex];
                          setActiveCategory(next.id);
                          document
                            .getElementById(`kennith-tab-${next.id}`)
                            ?.focus();
                        }}
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>

                  <div
                    role="tabpanel"
                    id={`kennith-panel-${category.id}`}
                    aria-labelledby={`kennith-tab-${category.id}`}
                    aria-description={category.description}
                    tabIndex={0}
                  >
                    <div className="kithna-food-category-toolbar">
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
                      <div className="kithna-food-trade-row kithna-food-buy-row kithna-food-column-labels">
                        <span className="kithna-food-trade-name">Items</span>
                        <span>In Stock</span>
                        <span>Price</span>
                        <span>QTY</span>
                        <span>Total Dots</span>
                      </div>

                      {rotationDay === null && (
                        <p role="status">
                          {!user
                            ? "Sign in to view today's selection."
                            : rotationError
                              ? "Today's selection is unavailable."
                              : "Loading today's selection…"}
                          {user && rotationError && (
                            <button
                              type="button"
                              className="btn-pearl"
                              onClick={() =>
                                setRotationRetry((value) => value + 1)
                              }
                            >
                              Retry selection
                            </button>
                          )}
                        </p>
                      )}
                      {(rotationDay === null
                        ? []
                        : stock
                            .filter((item) => item.category === activeCategory)
                            .sort((a, b) =>
                              priceOrder === "asc"
                                ? a.price - b.price
                                : b.price - a.price,
                            )
                            .map((item) => ({
                              ...kennithCatalog[item.category].find(
                                (def) => def.slug === item.slug,
                              )!,
                              ...item,
                            }))
                      ).map((item) => (
                        <div
                          className="kithna-food-trade-row kithna-food-buy-row"
                          key={item.slug}
                        >
                          <span className="kithna-food-trade-name">
                            {kennithItemImages[item.slug] ? (
                              <img
                                src={kennithItemImages[item.slug]}
                                alt=""
                                width={20}
                                height={20}
                                className="kithna-thrift-item-icon"
                              />
                            ) : null}
                            {item.name}
                            <small>{item.description}</small>
                          </span>
                          <span
                            className="kithna-food-trade-cell kithna-food-stock-cell"
                            aria-label={`${item.name} in stock`}
                          >
                            {item.stock}
                          </span>
                          <span
                            className="kithna-food-trade-cell"
                            aria-label={`${item.name} price`}
                          >
                            {item.price}
                          </span>
                          <div className="kithna-food-qty-control">
                            <button
                              className="kithna-food-qty-arrow"
                              type="button"
                              disabled={
                                trading || (quantities[item.slug] ?? 0) <= 0
                              }
                              onClick={() =>
                                setQuantity(
                                  item,
                                  (quantities[item.slug] ?? 0) - 1,
                                )
                              }
                              aria-label={`Decrease ${item.name} quantity`}
                            >
                              ◀
                            </button>
                            <input
                              className="kithna-food-trade-button"
                              type="number"
                              min={0}
                              max={Math.min(20, item.stock)}
                              step={1}
                              inputMode="numeric"
                              value={quantities[item.slug] ?? 0}
                              disabled={trading || item.stock === 0}
                              onChange={(event) =>
                                setQuantity(
                                  item,
                                  event.currentTarget.valueAsNumber,
                                )
                              }
                              aria-label={`${item.name} quantity`}
                            />
                            <button
                              className="kithna-food-qty-arrow"
                              type="button"
                              disabled={
                                trading ||
                                (quantities[item.slug] ?? 0) >=
                                  Math.min(20, item.stock)
                              }
                              onClick={() =>
                                setQuantity(
                                  item,
                                  (quantities[item.slug] ?? 0) + 1,
                                )
                              }
                              aria-label={`Increase ${item.name} quantity`}
                            >
                              ▶
                            </button>
                          </div>
                          <output className="kithna-food-trade-cell kithna-food-row-total">
                            {(
                              (quantities[item.slug] ?? 0) * item.price
                            ).toLocaleString()}
                          </output>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="dp-merchant-section">
                  <div className="kithna-food-goods-heading">
                    <h2 className="dp-merchant-section-title">
                      {userName} Inventory
                    </h2>
                    <div className="kithna-food-goods-dots-panel">
                      <span className="kithna-food-goods-dots-label">
                        Your Dots
                      </span>
                      <strong
                        className="kithna-food-goods-dots-value"
                        aria-live="polite"
                        aria-label={
                          userDots === null
                            ? "User Dots unavailable"
                            : undefined
                        }
                      >
                        {userDots === null ? "—" : userDots.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                  {walletError && (
                    <p className="kithna-food-message" role="status">
                      Could not load your Dots.{" "}
                      <button
                        type="button"
                        className="btn-pearl"
                        onClick={() => setWalletRetry((value) => value + 1)}
                      >
                        Retry wallet
                      </button>
                    </p>
                  )}
                  <button
                    type="button"
                    className="kithna-food-clear-button"
                    disabled={trading}
                    onClick={() => setSellQuantities({})}
                  >
                    Clear Inventory Selection
                  </button>
                  <div className="kithna-food-user-inventory">
                    <div className="kithna-food-trade-row kithna-food-column-labels">
                      <span className="kithna-food-trade-name">Items</span>
                      <span>Owned</span>
                      <span>Price</span>
                      <span>QTY</span>
                      <span>Total Dots</span>
                    </div>
                    {ownedItems === null ? (
                      <p className="kithna-thrift-empty" role="status">
                        {!user
                          ? "Sign in to view your inventory."
                          : inventoryError
                            ? "Your inventory is unavailable."
                            : "Loading your inventory…"}
                        {user && inventoryError && (
                          <button
                            type="button"
                            className="btn-pearl"
                            onClick={() =>
                              setInventoryRetry((value) => value + 1)
                            }
                          >
                            Retry inventory
                          </button>
                        )}
                      </p>
                    ) : ownedItems.length === 0 ? (
                      <p className="kithna-thrift-empty">
                        You have no unequipped items that Kennith buys.
                      </p>
                    ) : (
                      ownedItems.map((item) => (
                        <div className="kithna-food-trade-row" key={item.slug}>
                          <span className="kithna-food-trade-name">
                            {item.name}
                          </span>
                          <span className="kithna-food-trade-cell">
                            {item.qty}
                          </span>
                          <span
                            className="kithna-food-trade-cell"
                            aria-label={`${item.name} selling price`}
                          >
                            {sellPrice(item.slug).toLocaleString()}
                          </span>
                          <div className="kithna-food-qty-control">
                            <button
                              type="button"
                              className="kithna-food-qty-arrow"
                              disabled={
                                trading || !(sellQuantities[item.slug] > 0)
                              }
                              onClick={() =>
                                setSellQuantity(
                                  item,
                                  (sellQuantities[item.slug] ?? 0) - 1,
                                )
                              }
                              aria-label={`Decrease ${item.name} quantity to sell`}
                            >
                              ◀
                            </button>
                            <input
                              className="kithna-food-trade-button"
                              type="number"
                              min={0}
                              max={sellLimit(item)}
                              step={1}
                              inputMode="numeric"
                              value={sellQuantities[item.slug] ?? 0}
                              disabled={trading || rotationDay === null}
                              onChange={(event) =>
                                setSellQuantity(
                                  item,
                                  event.currentTarget.valueAsNumber,
                                )
                              }
                              aria-label={`Sell ${item.name} quantity`}
                            />
                            <button
                              type="button"
                              className="kithna-food-qty-arrow"
                              disabled={
                                trading ||
                                rotationDay === null ||
                                (sellQuantities[item.slug] ?? 0) >=
                                  sellLimit(item)
                              }
                              onClick={() =>
                                setSellQuantity(
                                  item,
                                  (sellQuantities[item.slug] ?? 0) + 1,
                                )
                              }
                              aria-label={`Increase ${item.name} quantity to sell`}
                            >
                              ▶
                            </button>
                          </div>
                          <output className="kithna-food-trade-cell kithna-food-row-total">
                            {(sellQuantities[item.slug] ?? 0) > 0 ? "−" : ""}
                            {(
                              (sellQuantities[item.slug] ?? 0) *
                              sellPrice(item.slug)
                            ).toLocaleString()}
                          </output>
                        </div>
                      ))
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
