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
    const response = await fetch(`${handyTechSite}/api/connectors/home-depot/status`, { headers: { "x-home-depot-connector-key": connectorKey } });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || `Connection failed (${response.status})`);
    await chrome.storage.local.set({ handyTechSite, connectorKey });
    status.textContent = "Connected. Open a Pro Referral lead and use the HandyTech panel.";
  } catch (error) {
    status.textContent = error.message;
  }
});
