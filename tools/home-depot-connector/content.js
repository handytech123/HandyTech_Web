(function () {
  if (document.querySelector("#handytech-hd-connector")) return;

  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const bodyText = () => clean(document.body.innerText);
  const match = (pattern) => bodyText().match(pattern)?.[1]?.trim() || "";
  const pathId = () => location.pathname.split("/").filter(Boolean).at(-1) || "";

  function extractLead() {
    const text = bodyText();
    const headings = [...document.querySelectorAll("h1,h2,h3")].map((node) => clean(node.textContent)).filter(Boolean);
    const customerName = headings.find((heading) => !/job details|my notes|appointment|home depot/i.test(heading)) || match(/(?:NEW|POTENTIAL)\s+([A-Z][A-Za-z' -]+?)\s+(?:Received|Job status)/i);
    const service = match(/Service\s+(.+?)(?:Customer Timeframe|Customer notes|Lead cost|$)/i);
    const location = match(/Location\s+(.+?)(?:Service|Customer Timeframe|Customer notes|$)/i);
    const zip = location.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] || "";
    const state = location.match(/\b([A-Z]{2})\s+\d{5}/)?.[1] || "";
    const city = clean(location.replace(/,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?.*$/, ""));
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
    const phone = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] || null;
    const points = Number(match(/Lead cost\s*-?\s*(\d+)\s*points/i)) || null;
    const responseDueText = match(/(?:Respond|Response)\s+(?:by|due)\s+(.+?)(?:Customer Photos|Customer notes|Lead cost|$)/i);
    const parsedResponseDue = responseDueText ? new Date(responseDueText) : null;
    const photoUrls = [...document.querySelectorAll("img")]
      .map((image) => image.currentSrc || image.src)
      .filter((url) => /^https:\/\//i.test(url) && !/logo|icon|avatar|sprite/i.test(url))
      .filter((url, index, urls) => urls.indexOf(url) === index)
      .slice(0, 20);
    return {
      externalJobId: match(/Job ID\s*([A-Za-z0-9-]+)/i) || pathId(),
      customerName,
      email,
      phone,
      service,
      city: city || null,
      state: state || null,
      zip: zip || null,
      customerTimeframe: match(/Customer Timeframe\s+(.+?)(?:Received|Customer Photos|Customer notes|$)/i) || null,
      customerNotes: match(/Customer notes\s+(.+?)(?:Lead cost|Request Review|$)/i) || null,
      photoUrls,
      leadCostPoints: points,
      responseDueAt: parsedResponseDue && !Number.isNaN(parsedResponseDue.getTime()) ? parsedResponseDue.toISOString() : null,
      portalUrl: location.href,
    };
  }

  const panel = document.createElement("aside");
  panel.id = "handytech-hd-connector";
  panel.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647;width:300px;background:#fff;border:2px solid #2769be;border-radius:10px;box-shadow:0 8px 30px #0004;padding:14px;font:14px system-ui;color:#172033";
  panel.innerHTML = '<strong style="display:block;font-size:16px">HandyTech Connector</strong><p style="margin:7px 0">Observation mode: review the lead, then import what is visible.</p><button style="width:100%;border:0;border-radius:6px;background:#2769be;color:white;padding:10px;font-weight:700;cursor:pointer">Import visible lead</button><div role="status" style="margin-top:8px;overflow-wrap:anywhere"></div>';
  document.body.appendChild(panel);
  const button = panel.querySelector("button");
  const status = panel.querySelector('[role="status"]');

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "Reading this page...";
    try {
      const lead = extractLead();
      if (!lead.externalJobId || !lead.customerName || !lead.service) throw new Error("This page does not show enough lead information yet. Open the individual lead details and try again.");
      const saved = await chrome.storage.local.get(["handyTechSite", "connectorKey"]);
      if (!saved.connectorKey) throw new Error("Open this extension's Options page and connect it to HandyTech first.");
      const response = await fetch(`${saved.handyTechSite || "https://handytech-solutions.com"}/api/connectors/home-depot/leads`, { method: "POST", headers: { "content-type": "application/json", "x-home-depot-connector-key": saved.connectorKey }, body: JSON.stringify(lead) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || `Import failed (${response.status})`);
      const requestMessage = result.lead.requestId ? ` Request #${result.lead.requestId} is ready in HandyTech.` : "";
      status.textContent = `Imported: ${result.recommendation.replace("_", " ")} (${result.lead.score}% fit).${requestMessage}`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
})();
