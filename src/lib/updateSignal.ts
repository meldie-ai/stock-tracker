// Lets ProductRow (many instances, no shared parent state) notify NavBar
// (a sibling in the layout) that a sell/adjust just succeeded, without
// wiring up a context provider just for a timestamp.
const STOCK_UPDATED_EVENT = "stock-tracker:stock-updated";

export function notifyStockUpdated(): void {
  window.dispatchEvent(new Event(STOCK_UPDATED_EVENT));
}

/** Returns an unsubscribe function. */
export function onStockUpdated(handler: () => void): () => void {
  window.addEventListener(STOCK_UPDATED_EVENT, handler);
  return () => window.removeEventListener(STOCK_UPDATED_EVENT, handler);
}
