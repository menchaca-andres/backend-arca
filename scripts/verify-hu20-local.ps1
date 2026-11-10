$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $backendRoot 'docker\compose.hu20-tests.yml'
$reportPath = Join-Path $backendRoot 'docs\HU-20-validacion-local.txt'
$names = @('DATABASE_URL', 'DB_SCHEMA', 'DB_SSL_CA_FILE', 'DB_POOL_MAX', 'HU20_LOCAL_DB_TEST', 'INTERNAL_API_KEY', 'PERSONAL_SERVICE_URL')
$saved = @{}
foreach ($name in $names) { $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$started = $false
$transcript = $false
function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Fallo de $Program (codigo $LASTEXITCODE)." }
}
Push-Location $backendRoot
try {
    Start-Transcript -Path $reportPath -Force | Out-Null
    $transcript = $true
    Write-Host 'HU-20: pruebas en PostgreSQL 16 descartable, solo 127.0.0.1:55420.'
    Invoke-Checked 'docker' @('info', '--format', '{{.ServerVersion}}')
    $started = $true
    Invoke-Checked 'docker' @('compose', '-f', $composeFile, 'up', '-d', '--wait', '--wait-timeout', '120')
    $env:DATABASE_URL = 'postgres://postgres:hu20_local_test_only@127.0.0.1:55420/arca_hu20_test'
    $env:DB_SCHEMA = 'boletas'
    $env:DB_SSL_CA_FILE = $null
    $env:DB_POOL_MAX = '5'
    $env:HU20_LOCAL_DB_TEST = '1'
    $env:INTERNAL_API_KEY = [guid]::NewGuid().ToString('N')
    $env:PERSONAL_SERVICE_URL = 'http://127.0.0.1:1'
    Invoke-Checked 'npm.cmd' @('run', 'build')
    Invoke-Checked 'node' @('node_modules/typeorm/cli.js', 'migration:run', '-d', 'services/ms-boletas/dist/data-source.js')
    Push-Location (Join-Path $backendRoot 'services\ms-boletas')
    try {
        Invoke-Checked 'node' @('../../node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', 'tests/configuracion.test.ts', 'tests/configuracion-reglas.test.ts', 'tests/personal.client.test.ts', 'tests/health.test.ts', 'tests/infra.test.ts', 'tests/repositories/configuracion.repository.test.ts')
    } finally { Pop-Location }
    Invoke-Checked 'node' @('scripts/verify-hu20-api.cjs')
    Write-Host 'HU-20: pruebas locales finalizadas correctamente.' -ForegroundColor Green
    Write-Host 'Pendiente: revision visual, Compose completo, PR aprobado y demo.'
} finally {
    if ($started) {
        & docker compose -f $composeFile down
        if ($LASTEXITCODE -ne 0) { Write-Warning 'Revisar la detencion del entorno arca-hu20-tests en Docker Desktop.' }
    }
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
    if ($transcript) { Stop-Transcript | Out-Null }
    Pop-Location
    Write-Host "Informe: $reportPath"
}
