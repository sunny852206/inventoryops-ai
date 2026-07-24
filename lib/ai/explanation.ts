import OpenAI from "openai";
import type { Recommendation } from "../domain/types";

const explanationResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    explanation: {
      type: "string",
    },
  },
  required: ["explanation"],
} as const;

const ACTION_PLAN_DETAILS: Record<
  Recommendation["type"],
  { reason: string; suggestedAction: string }
> = {
  RESTOCK_SOON: {
    reason: "This item is running low.",
    suggestedAction: "Add this item to the next shopping list.",
  },
  AVOID_DUPLICATE: {
    reason: "There is already plenty of this item.",
    suggestedAction: "Use the current supply before buying more.",
  },
  USE_SOON: {
    reason: "This item should be used soon.",
    suggestedAction: "Use this item soon.",
  },
};

export async function explainRecommendations(
  recommendations: Recommendation[],
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "Write a concise, user-facing action plan from the provided items. Return one short numbered line per item, with no introduction or conclusion. Use the item name and suggested action to write natural, practical language. Keep the suggested action's meaning unchanged. Do not use technical, rule-based, or inventory-system wording. Do not invent pantry facts or add lifestyle suggestions. Do not suggest sharing, donating, meal planning, recipes, or actions beyond the provided suggestion. The provided items represent fixed deterministic decisions; only rewrite them for the user.",
      },
      {
        role: "user",
        content: JSON.stringify(
          recommendations.map((recommendation) => ({
            itemName: recommendation.itemName,
            ...ACTION_PLAN_DETAILS[recommendation.type],
          })),
        ),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "recommendation_action_plan",
        strict: true,
        schema: explanationResponseSchema,
      },
    },
  });

  const parsedOutput: unknown = JSON.parse(response.output_text);

  if (
    !parsedOutput ||
    typeof parsedOutput !== "object" ||
    !("explanation" in parsedOutput) ||
    typeof parsedOutput.explanation !== "string" ||
    parsedOutput.explanation.trim().length === 0
  ) {
    throw new Error("Explanation response failed validation.");
  }

  return parsedOutput.explanation.trim();
}
