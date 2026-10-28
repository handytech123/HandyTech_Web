(function () {
  if (document.querySelector("#handytech-hd-connector")) return;

  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const bodyText = () => clean(document.body.innerText);
  const match = (pattern) => bodyText().match(pattern)?.[1]?.trim() || "";
  const pathId = () => location.pathname.split("/").filter(Boolean).at(-1) || "";
  const provided = (value) => /^(?:not provided|none|n\/a)$/i.test(clean(value)) ? "" : clean(value);
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const visible = (element) => {
    const rect = element?.getBoundingClientRect?.();
    return Boolean(rect && rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden");
  };
  const settings = () => new Promise((resolve) => chrome.storage.local.get({ automationEnabled: false, automaticMessagingEnabled: false, minimumScore: 75, maximumPoints: 10000, messagedLeadIds: [] }, resolve));

  function receivedAgeHours(label) {
    const value = clean(label).toLowerCase();
    if (!value) return null;
    if (value === "today" || value === "just now") return 0;
    if (value === "yesterday") return 24;
    const relative = value.match(/(\d+)\s*(minute|min|m|hour|hr|h|day|d)s?\s+ago/);
    if (relative) {
      const amount = Number(relative[1]);
      if (/^(?:minute|min|m)$/.test(relative[2])) return amount / 60;
      if (/^(?:day|d)$/.test(relative[2])) return amount * 24;
      return amount;
    }
    return null;
  }

  function extractLead() {
    const text = bodyText();
    const headings = [...document.querySelectorAll("h1,h2,h3")].map((node) => clean(node.textContent)).filter(Boolean);
    const rawCustomerName = match(/([A-Z][A-Za-z' -]{1,100}?)\s+Received\s+(?:Yesterday|Today|(?:\d+\s*)?(?:minutes?|hours?|days?|mins?|hrs?|[mhd])\s+ago).*?Job status/i)
      || headings.find((heading) => !/job details|my notes|appointment|home depot|get ready|next job|request review|message\b/i.test(heading));
    const customerName = clean(rawCustomerName).replace(/^(?:(?:selected show number|ready to hire|reached out(?: email or msg)?|contact info was incorrect|new|potential|hired|complete|archive)\s*)+/i, "");
    const service = match(/Service\s+(.+?)(?:Customer Timeframe|Customer notes|Lead cost|$)/i);
    const locationText = match(/Location\s+(.+?)(?:Service|Customer Timeframe|Customer notes|$)/i);
    const zip = locationText.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] || "";
    const state = locationText.match(/\b([A-Z]{2})\s+\d{5}/)?.[1] || "";
    const city = clean(locationText.replace(/,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?.*$/, ""));
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
    const phone = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] || null;
    const pointsText = match(/Lead cost\s*-?\s*(\d+)\s*points/i);
    const points = pointsText ? Number(pointsText) : null;
    const responseDueText = match(/(?:Respond|Response)\s+(?:by|due)\s+(.+?)(?:Customer Photos|Customer notes|Lead cost|$)/i);
    const parsedResponseDue = responseDueText ? new Date(responseDueText) : null;
    const photoUrls = [...document.querySelectorAll("img")]
      .map((image) => image.currentSrc || image.src)
      .filter((url) => /^https:\/\//i.test(url) && !/logo|icon|avatar|sprite/i.test(url))
      .filter((url, index, urls) => urls.indexOf(url) === index)
      .slice(0, 20);
    const receivedLabel = match(/Received\s+(.+?)(?:\s+\d+\s+hours?\s+till\s+overdue|\s+Job status|$)/i);
    return {
      externalJobId: match(/Job ID\s*([A-Za-z0-9-]+)/i) || pathId(), customerName, email, phone, service,
      city: city || null, state: state || null, zip: zip || null,
      customerTimeframe: match(/Customer Timeframe\s+(.+?)(?:Received|Customer Photos|Customer notes|$)/i) || null,
      customerNotes: provided(match(/Customer notes\s+(.+?)(?:Customer Photos|Lead cost|Request Review|$)/i)) || null,
      photoUrls, leadCostPoints: points,
      responseDueAt: parsedResponseDue && !Number.isNaN(parsedResponseDue.getTime()) ? parsedResponseDue.toISOString() : null,
      portalUrl: location.href, receivedLabel,
    };
  }

  async function importLead(lead) {
    const reply = await chrome.runtime.sendMessage({ type: "handytech-request", path: "/api/connectors/home-depot/leads", method: "POST", body: lead });
    if (!reply?.ok) throw new Error(reply?.error || "The connector could not retrieve this lead.");
    return reply.data;
  }

  const approvedMessageCategory = (service) => {
    const value = clean(service).toLowerCase();
    if (/\b(?:interior|exterior)?\s*paint(?:ing)?\b/.test(value)) return "painting";
    if (/\btoilet(?:s)?\b/.test(value)) return "toilet";
    if (/\b(?:drywall|sheetrock)\b/.test(value)) return "drywall";
    if (/\b(?:door\s+lock|deadbolt|lockset|door\s+hardware)\b/.test(value)) return "door lock";
    return null;
  };

  const firstName = (name) => clean(name).split(/\s+/)[0] || "there";
  const firstContactMessage = (lead, category) => `Hi ${firstName(lead.customerName)}, this is Lou with HandyTech Solutions. I received your Home Depot request for ${category} work in ${lead.city || "your area"}. I would be glad to help. Could you send a few details or photos of the project and let me know what days or times work best for you?`;

  async function sendFirstContact(lead, leadId, saved) {
    const category = approvedMessageCategory(lead.service);
    if (!saved.automaticMessagingEnabled || !category || saved.messagedLeadIds.includes(lead.externalJobId)) return false;
    const openMessage = findAction(/^message(?:\s+.+)?$/i);
    if (!openMessage) throw new Error(`Contact was retrieved, but Home Depot did not show a Message control for ${lead.customerName}.`);
    openMessage.click();
    let editor = null;
    for (let attempt = 0; attempt < 20 && !editor; attempt += 1) {
      await wait(300);
      editor = [...document.querySelectorAll("textarea,[contenteditable=true]")].find((element) => visible(element) && !element.closest("#handytech-hd-connector"));
    }
    if (!editor) throw new Error(`Home Depot's message box did not open for ${lead.customerName}.`);
    const message = firstContactMessage(lead, category);
    editor.focus();
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) editor.value = message;
    else editor.textContent = message;
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: message }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(350);
    const container = editor.closest("form,[role=dialog]") || document;
    const send = [...container.querySelectorAll("button,[role=button]")].find((element) => visible(element) && /^(?:send|send message)$/i.test(clean(element.textContent)));
    if (!send || send.disabled) throw new Error(`The message is prepared for ${lead.customerName}, but Home Depot did not enable its Send button.`);
    send.click();
    const messagedLeadIds = [...new Set([...saved.messagedLeadIds, lead.externalJobId])].slice(-1000);
    await chrome.storage.local.set({ messagedLeadIds });
    const logged = await chrome.runtime.sendMessage({ type: "handytech-request", path: `/api/connectors/home-depot/leads/${leadId}/contact-events`, method: "POST", body: { channel: "home_depot_message", message } });
    if (!logged?.ok) throw new Error(`Message sent to ${lead.customerName}, but the activity log failed: ${logged?.error || "unknown error"}`);
    return true;
  }

  function findAction(pattern, excluded) {
    return [...document.querySelectorAll("button,a,[role=button]")].find((element) => element !== excluded && visible(element) && pattern.test(clean(element.textContent)));
  }

  async function revealContact(lead) {
    const trigger = findAction(/^(?:show number|contact now)$/i);
    if (!trigger) throw new Error("Home Depot did not show a Contact Now or Show Number control.");
    trigger.click();
    await wait(800);
    const confirmation = findAction(/^(?:confirm|yes,? continue|get contact info(?:rmation)?|claim lead|show number|contact now)$/i, trigger);
    if (confirmation) confirmation.click();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await wait(600);
      const updated = extractLead();
      if (updated.email || updated.phone) return updated;
    }
    throw new Error(`Home Depot did not reveal contact information for ${lead.customerName}. The lead was saved for review.`);
  }

  const processedKey = "handytechProcessedLeadIds";
  const readProcessed = () => { try { return new Set(JSON.parse(sessionStorage.getItem(processedKey) || "[]")); } catch { return new Set(); } };
  const rememberProcessed = (id) => {
    const values = readProcessed(); values.add(id);
    sessionStorage.setItem(processedKey, JSON.stringify([...values].slice(-250)));
  };
  const panel = document.createElement("aside");
  panel.id = "handytech-hd-connector";
  panel.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647;width:320px;background:#fff;border:2px solid #2769be;border-radius:10px;box-shadow:0 8px 30px #0004;padding:14px;font:14px system-ui;color:#172033";
  panel.innerHTML = '<strong style="display:block;font-size:16px">HandyTech Lead Assistant</strong><p data-mode style="margin:7px 0">Checking retrieval mode…</p><div style="display:flex;gap:8px"><button data-import style="flex:1;border:0;border-radius:6px;background:#2769be;color:white;padding:10px;font-weight:700;cursor:pointer">Retrieve visible lead</button><button data-toggle style="border:1px solid #94a3b8;border-radius:6px;background:white;padding:10px;font-weight:700;cursor:pointer">Enable assist</button></div><div role="status" style="margin-top:8px;overflow-wrap:anywhere"></div>';
  document.body.appendChild(panel);
  const importButton = panel.querySelector("[data-import]");
  const toggleButton = panel.querySelector("[data-toggle]");
  const mode = panel.querySelector("[data-mode]");
  const status = panel.querySelector('[role="status"]');
  let busy = false;

  async function refreshMode() {
    const saved = await settings();
    mode.textContent = saved.automationEnabled
      ? `Assisted retrieval is ON. Open a lead normally and eligible leads may use points.${saved.automaticMessagingEnabled ? " Approved categories receive one first-contact message." : " Customer messaging is off."} The connector never changes pages by itself.`
      : "Automatic retrieval is OFF. Manual retrieval does not spend points.";
    toggleButton.textContent = saved.automationEnabled ? "Disable assist" : "Enable assist";
    toggleButton.style.color = saved.automationEnabled ? "#b91c1c" : "#172033";
    return saved;
  }

  async function retrieveVisible({ allowClaim }) {
    const lead = extractLead();
    if (!lead.externalJobId || !lead.customerName || !lead.service) throw new Error("Open an individual lead detail first; this page does not show enough information yet.");
    status.textContent = `Checking ${lead.customerName}…`;
    const result = await importLead(lead);
    if (!allowClaim || lead.email || lead.phone) {
      rememberProcessed(lead.externalJobId);
      status.textContent = `Retrieved ${lead.customerName} into the Home Depot inbox.`;
      return;
    }
    const saved = await settings();
    const withinPointLimit = lead.leadCostPoints != null && lead.leadCostPoints <= Number(saved.maximumPoints);
    const category = approvedMessageCategory(lead.service);
    const ageHours = receivedAgeHours(lead.receivedLabel);
    const recent = ageHours != null && ageHours <= 48;
    const eligible = Boolean(category) && recent && result.autoClaimEligible === true && result.lead.score >= Number(saved.minimumScore);
    if (!withinPointLimit || !eligible) {
      rememberProcessed(lead.externalJobId);
      const reason = lead.leadCostPoints == null ? "point cost was not visible"
        : !withinPointLimit ? `cost is ${lead.leadCostPoints} points`
        : !category ? "service is outside the four approved automatic categories"
        : !recent ? "lead age is over 48 hours or could not be verified"
        : "service or safety checks require review";
      status.textContent = `Saved ${lead.customerName} without claiming: ${reason}.`;
      return;
    }
    status.textContent = `Eligible ${result.lead.score}% match. Retrieving contact information for ${lead.leadCostPoints} points…`;
    const revealed = await revealContact(lead);
    const updated = await importLead(revealed);
    const messaged = updated.alreadyContacted ? false : await sendFirstContact(revealed, updated.lead.id, saved);
    rememberProcessed(lead.externalJobId);
    status.textContent = messaged
      ? `Contact retrieved and first message sent to ${revealed.customerName}. Waiting in the Home Depot inbox.`
      : `Contact retrieved for ${revealed.customerName}. Waiting in the Home Depot inbox.`;
  }

  async function automationTick() {
    const saved = await refreshMode();
    if (!saved.automationEnabled || busy) return;
    busy = true;
    try {
      const lead = extractLead();
      let checkedNow = false;
      if (lead.externalJobId && lead.customerName && lead.service && !readProcessed().has(lead.externalJobId)) {
        await retrieveVisible({ allowClaim: true });
        checkedNow = true;
        await wait(1000);
      }
      if (!checkedNow) status.textContent = "This visible lead was already checked during this browser session. Open another New lead normally when you are ready.";
    } catch (error) {
      const lead = extractLead();
      if (lead.externalJobId) rememberProcessed(lead.externalJobId);
      status.textContent = error instanceof Error ? error.message : "Automatic retrieval paused on this lead.";
    } finally { busy = false; }
  }

  importButton.addEventListener("click", async () => {
    if (busy) return; busy = true; importButton.disabled = true;
    try { await retrieveVisible({ allowClaim: false }); }
    catch (error) { status.textContent = error instanceof Error ? error.message : "The lead could not be retrieved."; }
    finally { busy = false; importButton.disabled = false; }
  });
  toggleButton.addEventListener("click", async () => {
    const saved = await settings();
    await chrome.storage.local.set({ automationEnabled: !saved.automationEnabled });
    await refreshMode();
    if (!saved.automationEnabled) automationTick();
  });
  refreshMode();
  window.setInterval(automationTick, 8000);
  window.setTimeout(automationTick, 1500);
})();
