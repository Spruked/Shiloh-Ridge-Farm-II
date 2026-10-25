$ErrorActionPreference = "Stop"

$taskName = "ShilohAudioDefaultsAtLogon"
$sourceScript = Join-Path $PSScriptRoot "Set-ShilohAudioDefaults.ps1"
$targetDir = Join-Path $env:LOCALAPPDATA "ShilohRidge"
$targetScript = Join-Path $targetDir "Set-ShilohAudioDefaults.ps1"

if (-not (Test-Path $sourceScript)) {
    throw "Source script not found: $sourceScript"
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item -Force $sourceScript $targetScript

$installedVia = "Task Scheduler"

try {
    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$targetScript`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable

    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description "Set Shiloh Ridge preferred NVIDIA playback and AT2020 recording defaults after login." `
        -Force | Out-Null

    Start-ScheduledTask -TaskName $taskName
}
catch {
    $installedVia = "Startup folder"
    $startupDir = [Environment]::GetFolderPath("Startup")
    $startupCmd = Join-Path $startupDir "ShilohAudioDefaultsAtLogon.cmd"
    $cmd = "@echo off`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$targetScript`"`r`n"
    Set-Content -Path $startupCmd -Value $cmd -Encoding ASCII
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$targetScript`""
}

Start-Sleep -Seconds 25

Write-Host "Installed via: $installedVia"
if ($installedVia -eq "Task Scheduler") {
    Write-Host "Scheduled task:"
    Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State | Format-Table -AutoSize
}

Import-Module AudioDeviceCmdlets -ErrorAction Stop
Write-Host "Current defaults:"
Get-AudioDevice -List |
    Where-Object { $_.Default -eq $true } |
    Select-Object Type, Name, Default |
    Format-Table -AutoSize
