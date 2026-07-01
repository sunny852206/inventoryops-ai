import { describe, expect, it } from "vitest";
import { scoreInventory } from "../../lib/domain/scoring";
import type { InventoryItem } from "../../lib/domain/types";

describe("scoreInventory", () => {
  it("creates restock and duplicate recommendations from quantity thresholds", () => {
    const items: InventoryItem[] = [
      {
        itemName: "eggs",
        quantity: 12,
        unit: "count",
        lastUpdatedAt: "2026-06-27T10:00:00Z",
      },
      {
        itemName: "milk",
        quantity: 1,
        unit: "bottle",
        lastUpdatedAt: "2026-06-27T12:00:00Z",
      },
    ];

    const result = scoreInventory(items, "2026-06-28T00:00:00Z");

    expect(result.map((recommendation) => recommendation.type)).toEqual([
      "AVOID_DUPLICATE",
      "RESTOCK_SOON",
    ]);
  });

  it("creates use-soon recommendations for items expiring within seven days", () => {
    const items: InventoryItem[] = [
      {
        itemName: "spinach",
        quantity: 2,
        unit: "bag",
        lastUpdatedAt: "2026-06-27T10:00:00Z",
        expiresAt: "2026-07-02T00:00:00Z",
      },
    ];

    const result = scoreInventory(items, "2026-06-28T00:00:00Z");

    expect(result.map((recommendation) => recommendation.type)).toEqual([
      "USE_SOON",
    ]);
  });
});
