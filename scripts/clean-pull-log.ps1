param (
    [string]$logPath
)

# Exit if file does not exist
if (-not (Test-Path $logPath)) { return }

$cutoff = (Get-Date).AddDays(-7)
$pattern = '^\[(\d{2}/\d{2}/\d{4}) ([^\]]+)\]'

$lines = Get-Content $logPath | Where-Object {
    if ($_ -match $pattern) {
        $logDate = Get-Date $matches[1]
        return $logDate -ge $cutoff
    }
    # Keep lines that don't match pattern (headers, errors, etc.)
    return $true
}

$lines | Set-Content $logPath
