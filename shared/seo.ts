export const SITE_URL = "https://handytech-solutions.com";

export function seoSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export const SERVICE_AREAS = ["St. Louis", "Hazelwood", "Florissant", "Ferguson", "Bridgeton"] as const;
