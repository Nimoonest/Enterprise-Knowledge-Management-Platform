param(
  [switch]$InfrastructureOnly
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
if (Test-Path -LiteralPath $envFile) {
  Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
      $separator = $line.IndexOf("=")
      $key = $line.Substring(0, $separator).Trim()
      $value = $line.Substring($separator + 1).Trim()
      if (-not [Environment]::GetEnvironmentVariable($key, "Process")) {
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
      }
    }
  }
}
$node = "C:\Users\$env:USERNAME\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if (-not (Test-Path -LiteralPath $node)) {
  $node = (Get-Command node -ErrorAction Stop).Source
}

$mysqlBinary = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
$mysqlConfig = Join-Path $root "infra\windows\mysql-ekmp.ini"
$mysqlData = Join-Path $root "runtime\mysql\data"
$mysqlPort = 3307

if (-not (Test-Path -LiteralPath $mysqlBinary)) {
  throw "MySQL Server 8.0 is not installed at $mysqlBinary"
}

New-Item -ItemType Directory -Force -Path $mysqlData | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $mysqlData "auto.cnf"))) {
  & $mysqlBinary --defaults-file=$mysqlConfig --initialize-insecure
  if ($LASTEXITCODE -ne 0) { throw "MySQL data directory initialization failed" }
}

$mysqlListener = Get-NetTCPConnection -LocalPort $mysqlPort -State Listen -ErrorAction SilentlyContinue
if (-not $mysqlListener) {
  Start-Process -FilePath $mysqlBinary -ArgumentList "--defaults-file=$mysqlConfig" -WorkingDirectory (Join-Path $root "runtime\mysql") -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    Start-Sleep -Milliseconds 250
    if (Get-NetTCPConnection -LocalPort $mysqlPort -State Listen -ErrorAction SilentlyContinue) { break }
  }
}

& $node (Join-Path $PSScriptRoot "bootstrap_document_mysql.js")
if ($LASTEXITCODE -ne 0) { throw "MySQL database bootstrap failed" }

$keepalive = & wsl.exe -d Ubuntu-22.04 -u root -- pgrep -f "^sleep infinity$" 2>$null
if (-not $keepalive) {
  Start-Process -FilePath "$env:WINDIR\System32\wsl.exe" -ArgumentList @("-d", "Ubuntu-22.04", "-u", "root", "--", "sleep", "infinity") -WindowStyle Hidden
}

$minioContainer = (& wsl.exe -d Ubuntu-22.04 -u root -- docker ps -aq --filter "name=^/ekmp-minio$").Trim()
if (-not $minioContainer) {
  if (-not $env:EKMP_MINIO_ROOT_USER -or -not $env:EKMP_MINIO_ROOT_PASSWORD) {
    throw "EKMP_MINIO_ROOT_USER and EKMP_MINIO_ROOT_PASSWORD are required in .env"
  }
  & wsl.exe -d Ubuntu-22.04 -u root -- docker run -d --name ekmp-minio --restart unless-stopped `
    -e "MINIO_ROOT_USER=$($env:EKMP_MINIO_ROOT_USER)" -e "MINIO_ROOT_PASSWORD=$($env:EKMP_MINIO_ROOT_PASSWORD)" `
    -p 9000:9000 -p 9001:9001 -v ekmp_minio_data:/data `
    quay.io/minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e `
    server /data --console-address :9001
} else {
  & wsl.exe -d Ubuntu-22.04 -u root -- docker start ekmp-minio | Out-Null
}

$minioReady = $false
for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
  Start-Sleep -Milliseconds 250
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:9000/minio/health/live" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) { $minioReady = $true; break }
  } catch {}
}
if (-not $minioReady) { throw "MinIO did not become healthy on port 9000" }

if (-not $InfrastructureOnly) {
  $apiListener = Get-NetTCPConnection -LocalPort 5178 -State Listen -ErrorAction SilentlyContinue
  if (-not $apiListener) {
    Start-Process -FilePath $node -ArgumentList "server.js" -WorkingDirectory $root `
      -RedirectStandardOutput (Join-Path $root "server.log") `
      -RedirectStandardError (Join-Path $root "server.err.log") -WindowStyle Hidden
  }
}

[pscustomobject]@{
  MySQL = "127.0.0.1:3307"
  MinIO_API = "http://127.0.0.1:9000"
  MinIO_Console = "http://127.0.0.1:9001"
  API = if ($InfrastructureOnly) { "not started" } else { "http://127.0.0.1:5178" }
}
