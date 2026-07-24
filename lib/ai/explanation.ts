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

export async function explainRecommendation(
  recommendation: Recommendation,
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
          "Explain the provided deterministic inventory recommendation in one or two short, factual sentences. Use only the provided recommendation data. Do not invent inventory facts. Do not change, rank, or return the recommendation type, score, item name, or factors.",
      },
      {
        role: "user",
        content: JSON.stringify({
          type: recommendation.type,
          itemName: recommendation.itemName,
          score: recommendation.score,
          factors: recommendation.factors,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "recommendation_explanation",
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
