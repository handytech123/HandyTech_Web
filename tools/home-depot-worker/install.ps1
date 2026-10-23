$ErrorActionPreference = "Stop"
$workerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $workerRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required. Install the current Node.js LTS release, then run this installer again."
}

npm install --omit=dev
if (-not (Test-Path -LiteralPath (Join-Path $workerRoot "config.json"))) {
  Copy-Item -LiteralPath (Join-Path $workerRoot "config.example.json") -Destination (Join-Path $workerRoot "config.json")
}

$taskName = "HandyTech Home Depot Worker"
$nodePath = (Get-Command node).Source
$workerPath = Join-Path $workerRoot "worker.mjs"
$action = New-ScheduledTaskAction -Execute $nodePath -Argument ('"{0}"' -f $workerPath) -WorkingDirectory $workerRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Runs the HandyTech Home Depot lead worker in Lou's signed-in Windows session." -Force | Out-Null

Write-Host "Installed. Edit config.json and paste the HandyTech connector key, then run start.ps1 once to sign in to Home Depot."
