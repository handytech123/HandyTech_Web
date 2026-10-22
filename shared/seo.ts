export const SITE_URL = "https://handytech-solutions.com";

export const BUSINESS_ID = `${SITE_URL}/#business`;
export const BUSINESS_NAME = "HandyTech Solutions LLC";
export const BUSINESS_PHONE = "+1-314-325-4575";
export const BUSINESS_EMAIL = "contact@handytech-solutions.com";

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

export function isIndexableProjectTitle(value?: string | null): value is string {
  const title = value?.trim();
  if (!title) return false;
  const slug = seoSlug(title);
  return Boolean(slug) && !["other", "project", "untitled", "unknown"].includes(slug);
}
