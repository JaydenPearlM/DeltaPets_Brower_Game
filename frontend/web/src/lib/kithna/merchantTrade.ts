type MerchantItem = {
  available: boolean;
  tradeable?: boolean;
  price: number | null;
  stackLimit: number;
  stock?: number | null;
  stockMode?: "unlimited";
  purchaseLimit?: number;
};

export function merchantBuyLimit(item: MerchantItem, owned: number): number {
  if (!item.available || item.tradeable === false || item.price === null) return 0;
  return Math.max(0, Math.min(
    item.purchaseLimit ?? 50,
    item.stackLimit - owned,
    item.stockMode === "unlimited" ? Infinity : item.stock ?? 0,
  ));
}
