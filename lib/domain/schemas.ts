import { z } from "zod";

export const extractedCandidateItemSchema = z
  .object({
    type: z.enum(["PURCHASED", "CONSUMED", "DISCARDED", "CORRECTED"]),
    name: z.string().min(1),
    quantity: z.number().nonnegative().optional(),
    unit: z.string().optional(),
    expiresAt: z.string().optional(),
    notes: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .superRefine((candidate, context) => {
    if (
      candidate.quantity !== undefined &&
      candidate.type !== "CORRECTED" &&
      candidate.quantity <= 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Quantity must be greater than zero for this event type.",
        path: ["quantity"],
      });
    }
  });

export const extractedCandidateItemsSchema = z.array(
  extractedCandidateItemSchema,
);
