import type {
  InventoryItem,
  Recommendation,
  RecommendationType,
  ScoreFactor,
} from "./types";

const RESTOCK_SOON_SCORE = 70;
const AVOID_DUPLICATE_SCORE = 60;
const USE_SOON_SCORE = 80;
const USE_SOON_WINDOW_DAYS = 7;

export function scoreInventory(
  items: InventoryItem[],
  nowIso = new Date().toISOString(),
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const item of items) {
    if (item.quantity <= 1) {
      recommendations.push(
        buildRecommendation({
          type: "RESTOCK_SOON",
          itemName: item.itemName,
          score: RESTOCK_SOON_SCORE,
          createdAt: nowIso,
          factors: [
            {
              label: "Low quantity",
              impact: RESTOCK_SOON_SCORE,
              explanation: "Quantity is at or below the restock threshold.",
            },
          ],
        }),
      );
    }

    if (item.quantity >= 5) {
      recommendations.push(
        buildRecommendation({
          type: "AVOID_DUPLICATE",
          itemName: item.itemName,
          score: AVOID_DUPLICATE_SCORE,
          createdAt: nowIso,
          factors: [
            {
              label: "High quantity",
              impact: AVOID_DUPLICATE_SCORE,
              explanation: "Quantity is at or above the duplicate-risk threshold.",
            },
          ],
        }),
      );
    }

    if (item.expiresAt && isWithinDays(item.expiresAt, nowIso, USE_SOON_WINDOW_DAYS)) {
      recommendations.push(
        buildRecommendation({
          type: "USE_SOON",
          itemName: item.itemName,
          score: USE_SOON_SCORE,
          createdAt: nowIso,
          factors: [
            {
              label: "Expiration risk",
              impact: USE_SOON_SCORE,
              explanation: "Item expires within the use-soon window.",
            },
          ],
        }),
      );
    }
  }

  return recommendations;
}

function buildRecommendation(input: {
  type: RecommendationType;
  itemName: string;
  score: number;
  factors: ScoreFactor[];
  createdAt: string;
}): Recommendation {
  return {
    id: getRecommendationId(input.type, input.itemName),
    type: input.type,
    itemName: input.itemName,
    score: input.score,
    factors: input.factors,
    createdAt: input.createdAt,
  };
}

function getRecommendationId(type: RecommendationType, itemName: string): string {
  return `${type}:${itemName.trim().toLowerCase().replaceAll(" ", "-")}`;
}

function isWithinDays(targetIso: string, nowIso: string, days: number): boolean {
  const targetTime = new Date(targetIso).getTime();
  const nowTime = new Date(nowIso).getTime();

  if (Number.isNaN(targetTime) || Number.isNaN(nowTime)) {
    return false;
  }

  const windowMs = days * 24 * 60 * 60 * 1000;
  const timeUntilTarget = targetTime - nowTime;

  return timeUntilTarget >= 0 && timeUntilTarget <= windowMs;
}
