const moneyAfter = (notes: string, label: RegExp): number | null => {
  const match = notes.match(new RegExp(`${label.source}\\s*(?::|=|-|\\bis\\b)\\s*\\$\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)`, "i"));
  if (!match) return null;
  const amount = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export function extractExplicitQuotePricing(notes: string): { labor: number | null; materials: number | null } {
  return {
    labor: moneyAfter(notes, /(?:fixed\s+)?labor(?:\s+(?:price|cost|amount))?/i),
    materials: moneyAfter(notes, /(?:estimated\s+)?materials?(?:\s+(?:allowance|price|cost|amount|budget|expenses?))?/i),
  };
}

