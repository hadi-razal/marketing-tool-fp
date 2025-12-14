# PowerShell script to fix npm installation errors
# This script addresses EPERM and ECONNRESET errors

Write-Host "=== Fixing npm installation errors ===" -ForegroundColor Cyan

# Step 1: Stop any Node.js processes that might be locking files
Write-Host "`n[1/5] Stopping Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es), stopping them..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Node.js processes stopped." -ForegroundColor Green
} else {
    Write-Host "No Node.js processes found." -ForegroundColor Green
}

# Step 2: Clear npm cache
Write-Host "`n[2/5] Clearing npm cache..." -ForegroundColor Yellow
try {
    npm cache clean --force
    Write-Host "npm cache cleared." -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not clear npm cache completely." -ForegroundColor Yellow
}

# Step 3: Remove node_modules and package-lock.json
Write-Host "`n[3/5] Removing node_modules and package-lock.json..." -ForegroundColor Yellow

# Remove package-lock.json
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
    Write-Host "package-lock.json removed." -ForegroundColor Green
}

# Remove node_modules with retry logic
if (Test-Path "node_modules") {
    Write-Host "Removing node_modules (this may take a moment)..." -ForegroundColor Yellow
    $maxRetries = 3
    $retryCount = 0
    $removed = $false
    
    while ($retryCount -lt $maxRetries -and -not $removed) {
        try {
            # Try to remove with force
            Remove-Item "node_modules" -Recurse -Force -ErrorAction Stop
            $removed = $true
            Write-Host "node_modules removed successfully." -ForegroundColor Green
        } catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host "Attempt $retryCount failed. Waiting 3 seconds before retry..." -ForegroundColor Yellow
                Start-Sleep -Seconds 3
                
                # Try to stop processes again
                Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            } else {
                Write-Host "Warning: Could not fully remove node_modules. Some files may be locked." -ForegroundColor Yellow
                Write-Host "You may need to close your IDE/editor and try again, or restart your computer." -ForegroundColor Yellow
            }
        }
    }
}

# Step 4: Configure npm for better network reliability
Write-Host "`n[4/5] Configuring npm for better network reliability..." -ForegroundColor Yellow
npm config set fetch-retries 5
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set fetch-timeout 300000
Write-Host "npm network settings configured." -ForegroundColor Green

# Step 5: Install dependencies with retry
Write-Host "`n[5/5] Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take several minutes. Please be patient..." -ForegroundColor Cyan

$installSuccess = $false
$maxInstallRetries = 3
$installRetryCount = 0

while ($installRetryCount -lt $maxInstallRetries -and -not $installSuccess) {
    try {
        npm install --legacy-peer-deps
        if ($LASTEXITCODE -eq 0) {
            $installSuccess = $true
            Write-Host "`n=== Installation completed successfully! ===" -ForegroundColor Green
        } else {
            throw "npm install returned non-zero exit code"
        }
    } catch {
        $installRetryCount++
        if ($installRetryCount -lt $maxInstallRetries) {
            Write-Host "`nInstallation attempt $installRetryCount failed." -ForegroundColor Yellow
            Write-Host "Retrying in 5 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        } else {
            Write-Host "`n=== Installation failed after $maxInstallRetries attempts ===" -ForegroundColor Red
            Write-Host "`nPossible solutions:" -ForegroundColor Yellow
            Write-Host "1. Check your internet connection" -ForegroundColor White
            Write-Host "2. Try running: npm install --legacy-peer-deps --verbose" -ForegroundColor White
            Write-Host "3. If behind a proxy, configure npm proxy settings" -ForegroundColor White
            Write-Host "4. Try using a different network or VPN" -ForegroundColor White
            exit 1
        }
    }
}

Write-Host "`n=== All done! ===" -ForegroundColor Green

