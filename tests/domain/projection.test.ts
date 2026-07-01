import { describe, expect, it } from "vitest";
import { projectInventory } from "../../lib/domain/projection";
import type { InventoryEvent } from "../../lib/domain/types";

describe("projectInventory", () => {
  it("projects purchased and consumed events into current inventory", () => {
    const events: InventoryEvent[] = [
      {
        id: "evt_1",
        type: "PURCHASED",
        itemName: "eggs",
        quantity: 12,
        unit: "count",
        occurredAt: "2026-06-26T10:00:00Z",
      },
      {
        id: "evt_2",
        type: "CONSUMED",
        itemName: "eggs",
        quantity: 2,
        unit: "count",
        occurredAt: "2026-06-27T10:00:00Z",
      },
      {
        id: "evt_3",
        type: "PURCHASED",
        itemName: "milk",
        quantity: 1,
        unit: "bottle",
        occurredAt: "2026-06-27T12:00:00Z",
      },
    ];

    const result = projectInventory(events);

    expect(result).toEqual([
      {
        itemName: "eggs",
        quantity: 10,
        unit: "count",
        lastUpdatedAt: "2026-06-27T10:00:00Z",
      },
      {
        itemName: "milk",
        quantity: 1,
        unit: "bottle",
        lastUpdatedAt: "2026-06-27T12:00:00Z",
      },
    ]);
  });

  it("uses corrected events to set the current quantity", () => {
    const events: InventoryEvent[] = [
      {
        id: "evt_1",
        type: "PURCHASED",
        itemName: "eggs",
        quantity: 12,
        unit: "count",
        occurredAt: "2026-06-26T10:00:00Z",
      },
      {
        id: "evt_2",
        type: "CORRECTED",
        itemName: "eggs",
        quantity: 5,
        unit: "count",
        occurredAt: "2026-06-27T10:00:00Z",
      },
    ];

    const result = projectInventory(events);

    expect(result).toEqual([
      {
        itemName: "eggs",
        quantity: 5,
        unit: "count",
        lastUpdatedAt: "2026-06-27T10:00:00Z",
      },
    ]);
  });
});
