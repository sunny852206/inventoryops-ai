import { z } from "zod";

export const extractedCandidateItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const extractedCandidateItemsSchema = z.array(
  extractedCandidateItemSchema,
);
