import { describe, expect, it } from "vitest";
import { extractedCandidateItemSchema } from "../../lib/domain/schemas";

describe("extractedCandidateItemSchema", () => {
  it("allows a corrected event to set quantity to zero", () => {
    const result = extractedCandidateItemSchema.safeParse({
      type: "CORRECTED",
      name: "bananas",
      quantity: 0,
      unit: "count",
    });

    expect(result.success).toBe(true);
  });

  it("rejects zero quantity for subtractive events", () => {
    const result = extractedCandidateItemSchema.safeParse({
      type: "CONSUMED",
      name: "bananas",
      quantity: 0,
      unit: "count",
    });

    expect(result.success).toBe(false);
  });
});
