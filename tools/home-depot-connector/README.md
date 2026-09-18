# HandyTech Home Depot Connector

This unpacked Chrome/Edge extension imports the lead currently visible in Pro Referral into the HandyTech admin system. Version 1.0 is deliberately observation-only: it never clicks Contact Now, spends points, or sends a customer message.

1. In HandyTech, open **Business → Referral Integrations** and download the connector.
2. Unzip it to a permanent folder on the main PC.
3. Open `chrome://extensions` or `edge://extensions` and turn on **Developer mode**.
4. Choose **Load unpacked** and select the unzipped `handytech-home-depot-connector` folder.
5. Open the extension details, choose **Extension options**, and enter the HandyTech site URL and connector key shown in the admin.
6. Sign into Pro Referral normally, open an individual lead, and click **Import visible lead**.

Import the lead again after claiming it if Home Depot reveals additional contact information. HandyTech updates the existing record by Home Depot Job ID rather than creating a duplicate.

Do not add Home Depot credentials to this extension or the HandyTech server.
