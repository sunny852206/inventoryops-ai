import type { InventoryEvent, InventoryItem } from "./types";
import { normalizeItemName, normalizeUnit } from "./normalization";

// Rebuilds current inventory state from confirmed inventory events.
export function projectInventory(events: InventoryEvent[]): InventoryItem[] {
  const itemsByKey = new Map<string, InventoryItem>();

  for (const event of events) {
    const itemName = normalizeItemName(event.itemName);
    const unit = normalizeUnit(event.unit);
    const key = getInventoryItemKey(itemName, unit);
    const existingItem = itemsByKey.get(key);
    const currentQuantity = existingItem?.quantity ?? 0;
    const nextQuantity = applyEventQuantity(currentQuantity, event);

    itemsByKey.set(key, {
      itemName,
      quantity: nextQuantity,
      unit,
      lastUpdatedAt: getLatestIsoDate(
        existingItem?.lastUpdatedAt,
        event.occurredAt,
      ),
    });
  }

  return Array.from(itemsByKey.values()).filter((item) => item.quantity > 0);
}

function getInventoryItemKey(itemName: string, unit?: string): string {
  return `${itemName}::${unit ?? ""}`;
}

function applyEventQuantity(
  currentQuantity: number,
  event: InventoryEvent,
): number {
  switch (event.type) {
    case "PURCHASED":
      return currentQuantity + event.quantity;
    case "CONSUMED":
    case "DISCARDED":
      return currentQuantity - event.quantity;
    case "CORRECTED":
      return event.quantity;
  }
}

function getLatestIsoDate(
  currentDate: string | undefined,
  nextDate: string,
): string {
  if (!currentDate) {
    return nextDate;
  }

  return currentDate > nextDate ? currentDate : nextDate;
}
