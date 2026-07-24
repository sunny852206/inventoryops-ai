import { NextResponse } from "next/server";
import { z } from "zod";
import { explainRecommendation } from "../../../lib/ai/explanation";

const recommendationSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["USE_SOON", "RESTOCK_SOON", "AVOID_DUPLICATE"]),
    itemName: z.string().min(1),
    score: z.number().finite(),
    factors: z.array(
      z.object({
        label: z.string().min(1),
        impact: z.number().finite(),
        explanation: z.string().min(1),
      }),
    ),
    createdAt: z.string().datetime(),
    explanation: z.string().optional(),
  })
  .strict();

const explainRequestSchema = z
  .object({
    recommendation: recommendationSchema,
  })
  .strict();

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const result = explainRequestSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid recommendation request." },
      { status: 400 },
    );
  }

  try {
    const explanation = await explainRecommendation(result.data.recommendation);

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Recommendation explanation failed:", error);
    return NextResponse.json(
      { error: "Recommendation explanation failed. Please try again." },
      { status: 500 },
    );
  }
}
