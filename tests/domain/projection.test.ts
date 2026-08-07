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

  it("groups item names and units that differ only by whitespace or casing", () => {
    const events: InventoryEvent[] = [
      {
        id: "evt_1",
        type: "PURCHASED",
        itemName: "  Egg  ",
        quantity: 12,
        unit: " Count ",
        occurredAt: "2026-06-26T10:00:00Z",
      },
      {
        id: "evt_2",
        type: "CONSUMED",
        itemName: " EGG ",
        quantity: 3,
        unit: "COUNT",
        occurredAt: "2026-06-27T10:00:00Z",
      },
      {
        id: "evt_3",
        type: "PURCHASED",
        itemName: "  chicken   thighs ",
        quantity: 2,
        unit: " Packs ",
        occurredAt: "2026-06-27T11:00:00Z",
      },
    ];

    expect(projectInventory(events)).toEqual([
      {
        itemName: "egg",
        quantity: 9,
        unit: "count",
        lastUpdatedAt: "2026-06-27T10:00:00Z",
      },
      {
        itemName: "chicken thighs",
        quantity: 2,
        unit: "packs",
        lastUpdatedAt: "2026-06-27T11:00:00Z",
      },
    ]);
  });

  it("keeps singular and plural item names as separate identities", () => {
    const events: InventoryEvent[] = [
      {
        id: "evt_1",
        type: "PURCHASED",
        itemName: "eggs",
        quantity: 12,
        occurredAt: "2026-06-26T10:00:00Z",
      },
      {
        id: "evt_2",
        type: "CONSUMED",
        itemName: "egg",
        quantity: 3,
        occurredAt: "2026-06-26T11:00:00Z",
      },
      {
        id: "evt_3",
        type: "PURCHASED",
        itemName: "apple",
        quantity: 5,
        occurredAt: "2026-06-26T12:00:00Z",
      },
      {
        id: "evt_4",
        type: "PURCHASED",
        itemName: "apples",
        quantity: 5,
        occurredAt: "2026-06-26T13:00:00Z",
      },
    ];

    expect(projectInventory(events)).toEqual([
      {
        itemName: "eggs",
        quantity: 12,
        unit: undefined,
        lastUpdatedAt: "2026-06-26T10:00:00Z",
      },
      {
        itemName: "apple",
        quantity: 5,
        unit: undefined,
        lastUpdatedAt: "2026-06-26T12:00:00Z",
      },
      {
        itemName: "apples",
        quantity: 5,
        unit: undefined,
        lastUpdatedAt: "2026-06-26T13:00:00Z",
      },
    ]);
  });

  it("keeps singular and plural units as separate records", () => {
    const events: InventoryEvent[] = [
      {
        id: "evt_1",
        type: "PURCHASED",
        itemName: "egg",
        quantity: 12,
        unit: "count",
        occurredAt: "2026-06-26T10:00:00Z",
      },
      {
        id: "evt_2",
        type: "PURCHASED",
        itemName: "egg",
        quantity: 5,
        unit: "counts",
        occurredAt: "2026-06-26T11:00:00Z",
      },
      {
        id: "evt_3",
        type: "CONSUMED",
        itemName: "egg",
        quantity: 3,
        unit: "counts",
        occurredAt: "2026-06-26T12:00:00Z",
      },
    ];

    expect(projectInventory(events)).toEqual([
      {
        itemName: "egg",
        quantity: 12,
        unit: "count",
        lastUpdatedAt: "2026-06-26T10:00:00Z",
      },
      {
        itemName: "egg",
        quantity: 2,
        unit: "counts",
        lastUpdatedAt: "2026-06-26T12:00:00Z",
      },
    ]);
  });

  it("does not infer a missing unit from existing inventory", () => {
    const events: InventoryEvent[] = [
      {
        id: "evt_1",
        type: "PURCHASED",
        itemName: "egg",
        quantity: 12,
        unit: "count",
        occurredAt: "2026-06-26T10:00:00Z",
      },
      {
        id: "evt_2",
        type: "PURCHASED",
        itemName: "egg",
        quantity: 5,
        occurredAt: "2026-06-26T11:00:00Z",
      },
      {
        id: "evt_3",
        type: "CONSUMED",
        itemName: "egg",
        quantity: 3,
        occurredAt: "2026-06-26T12:00:00Z",
      },
    ];

    expect(projectInventory(events)).toEqual([
      {
        itemName: "egg",
        quantity: 12,
        unit: "count",
        lastUpdatedAt: "2026-06-26T10:00:00Z",
      },
      {
        itemName: "egg",
        quantity: 2,
        unit: undefined,
        lastUpdatedAt: "2026-06-26T12:00:00Z",
      },
    ]);
  });
});
