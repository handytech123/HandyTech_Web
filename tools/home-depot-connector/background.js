async function handyTechRequest({ path, method = "GET", body }) {
  const saved = await chrome.storage.local.get(["handyTechSite", "connectorKey"]);
  const site = (saved.handyTechSite || "https://handytech-solutions.com").replace(/\/$/, "");
  if (!saved.connectorKey) throw new Error("Open the extension Options page and connect it to HandyTech first.");

  let response;
  try {
    response = await fetch(`${site}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-home-depot-connector-key": saved.connectorKey,
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach HandyTech. Check your internet connection and the HandyTech site address, then try again.");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `HandyTech rejected the request (${response.status}).`);
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "handytech-request") return false;
  handyTechRequest(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "The request failed." }));
  return true;
});
