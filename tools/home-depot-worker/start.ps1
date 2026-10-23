$ErrorActionPreference = "Stop"
$workerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $workerRoot
node worker.mjs
