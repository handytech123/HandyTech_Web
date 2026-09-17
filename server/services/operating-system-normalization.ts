export function normalizePhone(value?: string | null): string {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeAddress(input: { street?: string | null; city?: string | null; state?: string | null; zip?: string | null }): string {
  return [input.street, input.city, input.state, input.zip].map((value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ")).join("|");
}
