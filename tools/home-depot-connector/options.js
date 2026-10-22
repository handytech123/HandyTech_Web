const site = document.querySelector("#site");
const key = document.querySelector("#key");
const status = document.querySelector("#status");

chrome.storage.local.get(["handyTechSite", "connectorKey"], (saved) => {
  site.value = saved.handyTechSite || "https://handytech-solutions.com";
  key.value = saved.connectorKey || "";
});

document.querySelector("#save").addEventListener("click", async () => {
  const handyTechSite = site.value.trim().replace(/\/$/, "");
  const connectorKey = key.value.trim();
  status.textContent = "Testing connection...";
  try {
    const parsedSite = new URL(handyTechSite);
    if (parsedSite.protocol !== "https:") throw new Error("Use the secure https:// HandyTech website address.");
    if (connectorKey.length < 32) throw new Error("Paste the complete connector key from HandyTech.");
    await chrome.storage.local.set({ handyTechSite, connectorKey });
    const reply = await chrome.runtime.sendMessage({ type: "handytech-request", path: "/api/connectors/home-depot/status" });
    if (!reply?.ok) throw new Error(reply?.error || "Connection test failed.");
    status.textContent = "Connected. Open a Pro Referral lead and use the HandyTech panel.";
  } catch (error) {
    status.textContent = error.message;
  }
});
