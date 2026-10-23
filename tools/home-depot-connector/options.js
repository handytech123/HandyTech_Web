const site = document.querySelector("#site");
const key = document.querySelector("#key");
const status = document.querySelector("#status");
const automation = document.querySelector("#automation");
const minimumScore = document.querySelector("#minimum-score");
const maximumPoints = document.querySelector("#maximum-points");

chrome.storage.local.get(["handyTechSite", "connectorKey", "automationEnabled", "minimumScore", "maximumPoints"], (saved) => {
  site.value = saved.handyTechSite || "https://handytech-solutions.com";
  key.value = saved.connectorKey || "";
  automation.checked = saved.automationEnabled === true;
  minimumScore.value = String(saved.minimumScore ?? 75);
  maximumPoints.value = String(saved.maximumPoints ?? 10000);
});

document.querySelector("#save").addEventListener("click", async () => {
  const handyTechSite = site.value.trim().replace(/\/$/, "");
  const connectorKey = key.value.trim();
  const automationEnabled = automation.checked;
  const savedMinimumScore = Math.max(60, Math.min(100, Number(minimumScore.value) || 75));
  const savedMaximumPoints = Math.max(0, Math.min(10000, Number(maximumPoints.value) || 10000));
  status.textContent = "Testing connection...";
  try {
    const parsedSite = new URL(handyTechSite);
    if (parsedSite.protocol !== "https:") throw new Error("Use the secure https:// HandyTech website address.");
    if (connectorKey.length < 32) throw new Error("Paste the complete connector key from HandyTech.");
    await chrome.storage.local.set({ handyTechSite, connectorKey, automationEnabled, minimumScore: savedMinimumScore, maximumPoints: savedMaximumPoints });
    const reply = await chrome.runtime.sendMessage({ type: "handytech-request", path: "/api/connectors/home-depot/status" });
    if (!reply?.ok) throw new Error(reply?.error || "Connection test failed.");
    status.textContent = automationEnabled
      ? "Connected. Automatic retrieval is enabled. Keep the Pro Referral New Leads dashboard open."
      : "Connected. Automatic retrieval is off; you can still import the visible lead manually.";
  } catch (error) {
    status.textContent = error.message;
  }
});
