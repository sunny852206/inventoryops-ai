import { describe, expect, it } from "vitest";
import { projectInventory } from "../../lib/domain/projection";
import { scoreInventory } from "../../lib/domain/scoring";
import type { InventoryEvent } from "../../lib/domain/types";

describe("inventory decision workflow", () => {
  it("projects confirmed events into inventory and scores recommendations", () => {
    const events: InventoryEvent[] = [
      {
        id: "evt_1",
        type: "PURCHASED",
        itemName: "eggs",
        quantity: 12,
        unit: "count",
        occurredAt: "2026-06-27T10:00:00Z",
      },
      {
        id: "evt_2",
        type: "PURCHASED",
        itemName: "milk",
        quantity: 1,
        unit: "bottle",
        occurredAt: "2026-06-27T11:00:00Z",
      },
    ];

    const projectedInventory = projectInventory(events);
    const recommendations = scoreInventory(
      projectedInventory,
      "2026-06-28T00:00:00Z",
    );

    expect(projectedInventory).toEqual([
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
        lastUpdatedAt: "2026-06-27T11:00:00Z",
      },
    ]);

    expect(
      recommendations.map((recommendation) => ({
        type: recommendation.type,
        itemName: recommendation.itemName,
      })),
    ).toEqual([
      {
        type: "AVOID_DUPLICATE",
        itemName: "eggs",
      },
      {
        type: "RESTOCK_SOON",
        itemName: "milk",
      },
    ]);
  });
});
