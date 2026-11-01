// Quest availability must not prevent trading. Stock and inventory are both
// required to trade, but a failure of one must not discard the other.
export async function loadMerchantResources<S, I, Q>(
  stock: Promise<S>, inventory: Promise<I>, quests: Promise<Q>,
) {
  const [shopResult, inventoryResult, questResult] = await Promise.allSettled([
    stock, inventory, quests,
  ]);
  return {
    shop: shopResult.status === 'fulfilled' ? shopResult.value : null,
    inventory: inventoryResult.status === 'fulfilled' ? inventoryResult.value : null,
    quests: questResult.status === 'fulfilled' ? questResult.value : null,
    error: shopResult.status === 'rejected' ? shopResult.reason as unknown
      : inventoryResult.status === 'rejected' ? inventoryResult.reason as unknown : null,
  };
}
