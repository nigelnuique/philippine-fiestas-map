param(
  [int]$SleepSeconds = 900,
  [int]$MaxPages = 50,
  [string]$Source = "all",
  [switch]$Backfill,
  [switch]$Once
)

$ErrorActionPreference = "Continue"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $Root "data\processed\festivals\harvest-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Host.UI.RawUI.WindowTitle = "Philippine Fiestas - Barangay Date Enrichment Loop"

function Write-LoopLog {
  param([string]$Message)
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "$stamp $Message" | Tee-Object -FilePath (Join-Path $LogDir "barangay-date-enrichment-loop.log") -Append
}

do {
  Push-Location $Root
  try {
    Write-LoopLog "repo $Root"
    Write-LoopLog "harvest source=$Source maxPages=$MaxPages"
    npm run data:harvest-official-barangay-dates -- --source=$Source --max-pages=$MaxPages --fetch-timeout-ms=15000 2>&1 |
      Tee-Object -FilePath (Join-Path $LogDir "barangay-date-enrichment-loop.log") -Append

    if ($Backfill) {
      Write-LoopLog "backfill"
      npm run data:backfill-barangay-dates 2>&1 |
        Tee-Object -FilePath (Join-Path $LogDir "barangay-date-enrichment-loop.log") -Append
    }
  } catch {
    Write-LoopLog "error $($_.Exception.Message)"
  } finally {
    Pop-Location
  }

  if ($Once) { break }
  Write-LoopLog "sleep ${SleepSeconds}s"
  Start-Sleep -Seconds $SleepSeconds
} while ($true)
