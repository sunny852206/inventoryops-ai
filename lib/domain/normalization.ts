export function normalizeItemName(itemName: string): string {
  return normalizeText(itemName);
}

export function normalizeUnit(unit?: string): string | undefined {
  const normalizedUnit = unit ? normalizeText(unit) : "";

  return normalizedUnit || undefined;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
}
