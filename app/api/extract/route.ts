import { NextResponse } from "next/server";
import { extractedCandidateItemsSchema } from "../../../lib/domain/schemas";

type ExtractRequestBody = {
  input?: unknown;
};

export async function POST(request: Request) {
  let body: ExtractRequestBody;

  // Read the JSON body sent by the client.
  try {
    body = (await request.json()) as ExtractRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  if (typeof body.input !== "string" || body.input.trim().length === 0) {
    return NextResponse.json({ error: "Input is required." }, { status: 400 });
  }

  const mockOutput: unknown = [
    {
      type: "PURCHASED",
      name: "eggs",
      quantity: 12,
      unit: "count",
      notes: "Extracted from operational input.",
      confidence: 0.94,
      source: "AI",
    },
    {
      type: "PURCHASED",
      name: "milk",
      quantity: 1,
      unit: "bottle",
      notes: "Extracted from operational input.",
      confidence: 0.91,
      source: "AI",
    },
    {
      type: "CONSUMED",
      name: "eggs",
      quantity: 3,
      unit: "count",
      notes: "Extracted from operational input.",
      confidence: 0.88,
      source: "AI",
    },
  ];

  // Validate output before sending candidate data back to the client.
  const result = extractedCandidateItemsSchema.safeParse(mockOutput);

  if (!result.success) {
    return NextResponse.json(
      { error: "Extraction output failed validation." },
      { status: 422 },
    );
  }

  return NextResponse.json({ candidates: result.data });
}
