export const GA_MEASUREMENT_ID = "G-059MTBJBY2";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPageView(path: string) {
  window.gtag?.("config", GA_MEASUREMENT_ID, {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackEvent(name: string, parameters: Record<string, unknown> = {}) {
  window.gtag?.("event", name, parameters);
}
