import OpenAI from "openai";
import { extractedCandidateItemsSchema } from "../domain/schemas";

const client = new OpenAI();

const extractionResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: ["PURCHASED", "CONSUMED", "DISCARDED", "CORRECTED"],
          },
          name: {
            type: "string",
          },
          quantity: {
            type: "number",
          },
          unit: {
            type: "string",
          },
          notes: {
            type: "string",
          },
          confidence: {
            type: "number",
          },
        },
        required: ["type", "name", "quantity", "unit", "notes", "confidence"],
      },
    },
  },
  required: ["candidates"],
} as const;

export async function extractCandidateEvents(input: string) {
  const response = await client.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "Extract pantry inventory events from messy user text. Return only structured candidate events. Use PURCHASED for bought/added items, CONSUMED for used/eaten items, DISCARDED for thrown away/spoiled items, and CORRECTED for explicit inventory corrections.",
      },
      {
        role: "user",
        content: input,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "inventory_candidate_extraction",
        strict: true,
        schema: extractionResponseSchema,
      },
    },
  });

  const parsedOutput = JSON.parse(response.output_text) as unknown;

  if (
    typeof parsedOutput !== "object" ||
    parsedOutput === null ||
    !("candidates" in parsedOutput)
  ) {
    throw new Error("Extraction response did not include candidates.");
  }

  const candidates = (parsedOutput as { candidates: unknown }).candidates;
  const result = extractedCandidateItemsSchema.safeParse(candidates);

  if (!result.success) {
    throw new Error("Extraction response failed validation.");
  }

  return result.data;
}
