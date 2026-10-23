# HandyTech Home Depot Worker

This Windows worker operates a dedicated, visible Chrome profile in Lou's signed-in Windows session. It does not store a Home Depot password. Sign in directly in the browser the first time and whenever Home Depot expires the session or requests verification.

## Install

1. Extract this folder to a permanent location on the always-on Windows PC.
2. Right-click `install.ps1` and choose **Run with PowerShell**.
3. Paste the HandyTech connector key into `config.json`.
4. Run `start.ps1`. Sign in to Home Depot in the browser window it opens.
5. Keep the Windows user signed in. The scheduled task starts the worker after future logins.

Use `stop.ps1` as the immediate kill switch.

The worker claims only server-approved leads at or below the configured point limit. Automatic first contact is restricted to painting, toilet, drywall/sheetrock, and door-lock work. Leads remain in the Home Depot inbox and do not become Requests.
