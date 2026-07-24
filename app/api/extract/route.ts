import { NextResponse } from "next/server";
import { extractCandidateEvents } from "../../../lib/ai/extraction";

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

  try {
    const candidates = await extractCandidateEvents(body.input.trim());

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Extraction failed:", error);
    return NextResponse.json(
      { error: "Extraction failed. Please try again." },
      { status: 500 },
    );
  }
}
