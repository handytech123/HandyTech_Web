export type LeadAttribution = {
  leadSource: string;
  leadMedium?: string;
  leadCampaign?: string;
  landingPage?: string;
  referrer?: string;
};

const STORAGE_KEY = "handytech_first_touch";

function sourceFromReferrer(referrer: string) {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("google.")) return "google";
    if (host.includes("bing.")) return "bing";
    if (host.includes("facebook.") || host.includes("fb.")) return "facebook";
    if (host.includes("instagram.")) return "instagram";
    if (host.includes("nextdoor.")) return "nextdoor";
    return host.replace(/^www\./, "") || "referral";
  } catch { return "referral"; }
}

export function captureAttribution() {
  if (typeof window === "undefined" || localStorage.getItem(STORAGE_KEY)) return;
  const params = new URLSearchParams(window.location.search);
  const clickSource = params.get("gclid") ? "google" : params.get("fbclid") ? "facebook" : undefined;
  const data: LeadAttribution = {
    leadSource: params.get("utm_source") || clickSource || sourceFromReferrer(document.referrer),
    leadMedium: params.get("utm_medium") || (clickSource ? "paid" : document.referrer ? "referral" : "none"),
    leadCampaign: params.get("utm_campaign") || undefined,
    landingPage: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAttribution(): LeadAttribution {
  captureAttribution();
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as LeadAttribution; }
  catch { return { leadSource: "direct" }; }
}