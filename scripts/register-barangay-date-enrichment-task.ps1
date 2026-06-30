param(
  [string]$TaskName = "PhilippineFiestasBarangayDateEnrichment",
  [int]$SleepSeconds = 900,
  [int]$MaxPages = 50,
  [string]$Source = "all"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Runner = Join-Path $Root "scripts\run-barangay-date-enrichment-loop.ps1"
$Args = "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`" -SleepSeconds $SleepSeconds -MaxPages $MaxPages -Source `"$Source`""

try {
  $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $Args -WorkingDirectory $Root
  $Trigger = New-ScheduledTaskTrigger -AtLogOn
  $Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Resumable barangay fiesta date enrichment loop for philippine-fiestas-map." `
    -Force | Out-Null

  Write-Host "Registered scheduled task: $TaskName"
  Write-Host "Runner: $Runner"
} catch {
  $Startup = [Environment]::GetFolderPath("Startup")
  $ShortcutPath = Join-Path $Startup "$TaskName.lnk"
  $Shell = New-Object -ComObject WScript.Shell
  $Shortcut = $Shell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = "powershell.exe"
  $Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`" -SleepSeconds $SleepSeconds -MaxPages $MaxPages -Source `"$Source`""
  $Shortcut.WorkingDirectory = $Root
  $Shortcut.Description = "Resumable barangay fiesta date enrichment loop for philippine-fiestas-map."
  $Shortcut.Save()

  Write-Host "Scheduled task registration failed: $($_.Exception.Message)"
  Write-Host "Installed Startup shortcut fallback: $ShortcutPath"
  Write-Host "Runner: $Runner"
}
