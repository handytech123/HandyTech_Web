$taskName = "HandyTech Home Depot Worker"
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*home-depot-worker*worker.mjs*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Write-Host "HandyTech Home Depot Worker stopped."
