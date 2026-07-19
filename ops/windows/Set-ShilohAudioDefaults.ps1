$ErrorActionPreference = "Stop"

$playbackName = "32S327 (NVIDIA High Definition Audio)"
$recordingName = "Microphone (2- AT2020USB+)"
$logPath = Join-Path $env:LOCALAPPDATA "ShilohAudioDefaults.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logPath -Value "$timestamp $Message"
}

try {
    Import-Module AudioDeviceCmdlets -ErrorAction Stop

    # Give VoiceMeeter and USB audio endpoints time to enumerate after login.
    Start-Sleep -Seconds 20

    $devices = Get-AudioDevice -List
    $playback = $devices | Where-Object { $_.Type -eq "Playback" -and $_.Name -eq $playbackName } | Select-Object -First 1
    $recording = $devices | Where-Object { $_.Type -eq "Recording" -and $_.Name -eq $recordingName } | Select-Object -First 1

    if (-not $playback) {
        throw "Playback device not found: $playbackName"
    }
    if (-not $recording) {
        throw "Recording device not found: $recordingName"
    }

    Set-AudioDevice -ID $playback.ID -DefaultOnly | Out-Null
    Set-AudioDevice -ID $playback.ID -CommunicationOnly | Out-Null
    Set-AudioDevice -ID $recording.ID -DefaultOnly | Out-Null
    Set-AudioDevice -ID $recording.ID -CommunicationOnly | Out-Null
    Set-AudioDevice -RecordingMute $false | Out-Null

    Write-Log "Set playback='$playbackName' recording='$recordingName'"
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    throw
}
