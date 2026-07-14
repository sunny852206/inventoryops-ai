export type InventoryEventType =
  | "PURCHASED"
  | "CONSUMED"
  | "DISCARDED"
  | "CORRECTED";

export type RecommendationType =
  | "USE_SOON"
  | "RESTOCK_SOON"
  | "AVOID_DUPLICATE";

export type AiRequestPurpose = "EXTRACTION" | "EXPLANATION";

export type ExtractedCandidateItem = {
  type: InventoryEventType;
  name: string;
  quantity?: number;
  unit?: string;
  expiresAt?: string;
  notes?: string;
  confidence?: number;
};

export type InventoryEvent = {
  id: string;
  type: InventoryEventType;
  itemName: string;
  quantity: number;
  unit?: string;
  occurredAt: string;
  notes?: string;
  sourceText?: string;
};

export type InventoryItem = {
  itemName: string;
  quantity: number;
  unit?: string;
  lastUpdatedAt: string;
  expiresAt?: string;
};

export type ScoreFactor = {
  label: string;
  impact: number;
  explanation: string;
};

export type Recommendation = {
  id: string;
  type: RecommendationType;
  itemName: string;
  score: number;
  factors: ScoreFactor[];
  createdAt: string;
  explanation?: string;
};
