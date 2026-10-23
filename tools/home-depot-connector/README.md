# HandyTech Home Depot Connector

This unpacked Chrome/Edge extension retrieves eligible leads from the signed-in Pro Referral dashboard into the HandyTech Home Depot Leads inbox. Automatic mode may click Show Number/Contact Now and spend the displayed points. Optional first-contact messaging is limited to painting, toilet, drywall/sheetrock, and door-lock work. It never creates a Request automatically.

1. In HandyTech, open **Business → Referral Integrations** and download the connector.
2. Unzip it to a permanent folder on the main PC.
3. Open `chrome://extensions` or `edge://extensions` and turn on **Developer mode**.
4. Choose **Load unpacked** and select the unzipped `handytech-home-depot-connector` folder.
5. Open the extension details, choose **Extension options**, and enter the HandyTech site URL and connector key shown in the admin.
6. Choose whether automatic retrieval and approved first-contact messaging are enabled, then keep the signed-in Pro Referral **New** leads dashboard open.

The connector imports each visible lead before claiming it. It claims only leads the HandyTech server identifies as an eligible core service without a specialist-work warning, then imports the revealed contact information. When messaging is enabled, it sends one Home Depot introduction per Job ID only for the four approved categories and records that activity in HandyTech. The same Home Depot Job ID updates the existing inbox item instead of creating a duplicate.

The extension panel includes a stop control. Turning automation off stops new point spending immediately. Leads remain in the Home Depot Leads inbox until Lou performs the next workflow step.

Do not add Home Depot credentials to this extension or the HandyTech server.
