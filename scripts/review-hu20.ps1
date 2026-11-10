param([switch]$Stop)
$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path -Parent $PSScriptRoot
$storyNumber = 20
$projectName = "arca-hu$storyNumber-review"
$runtimeFile = Join-Path $backendRoot ".env.hu$storyNumber.review"
$overrideFile = Join-Path $backendRoot "docker\compose.hu$storyNumber-review.yml"
$reportFile = Join-Path $backendRoot "docs\HU-$storyNumber-arranque-completo.txt"
$composeArguments = @('compose', '--env-file', $runtimeFile, '-p', $projectName, '-f', (Join-Path $backendRoot 'docker-compose.yml'), '-f', $overrideFile)
$environmentNames = @('INTERNAL_API_KEY', 'JWT_SECRET')
$previous = @{}
foreach ($name in $environmentNames) {
    $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    [Environment]::SetEnvironmentVariable($name, $null, 'Process')
}
$recording = $false
function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Fallo de $Program (codigo $LASTEXITCODE)." }
}
Push-Location $backendRoot
try {
    if (!(Test-Path -LiteralPath $runtimeFile)) {
        if ($Stop) { throw 'No existe la configuracion de esta revision; no se detuvo ningun entorno.' }
        & git -c "safe.directory=$($backendRoot.Replace('\','/'))" check-ignore -q -- (Split-Path -Leaf $runtimeFile)
        if ($LASTEXITCODE -ne 0) { throw 'El archivo privado de revision debe estar excluido por Git antes de crearlo.' }
        # Claves locales nuevas; no leer archivos privados de Supabase ni mostrarlas.
        $internalKey = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
        $jwtKey = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
        Set-Content -LiteralPath $runtimeFile -Value @("INTERNAL_API_KEY=$internalKey", "JWT_SECRET=$jwtKey") -Encoding ascii
    }
    if ($Stop) {
        Invoke-Checked 'docker' ($composeArguments + @('down'))
        Write-Host "Revision HU-$storyNumber detenida; se conservan sus datos locales."
        return
    }
    Start-Transcript -Path $reportFile -Force | Out-Null
    $recording = $true
    Write-Host "Iniciando HU-$storyNumber en proyecto separado $projectName."
    Write-Host 'Se aplican las migraciones y semillas del sistema solo en la base local de este proyecto.'
    Write-Host 'No se utiliza Supabase ni volumenes de otros proyectos.'
    Invoke-Checked 'docker' @('info', '--format', '{{.ServerVersion}}')
    Invoke-Checked 'docker' ($composeArguments + @('config', '--quiet'))
    Invoke-Checked 'docker' ($composeArguments + @('up', '-d', '--build', '--wait', '--wait-timeout', '300'))
    Invoke-Checked 'docker' ($composeArguments + @('ps', '-a'))
    $gatewayPort = 58100 + $storyNumber
    $frontendPort = 55100 + $storyNumber
    $health = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$gatewayPort/health" -TimeoutSec 20
    if ($health.StatusCode -ne 200) { throw 'El gateway no respondio 200.' }
    $page = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$frontendPort/" -TimeoutSec 20
    if ($page.StatusCode -ne 200) { throw 'El frontend no respondio 200.' }
    Write-Host "ARRANQUE COMPLETO CORRECTO. Abrir http://127.0.0.1:$frontendPort/" -ForegroundColor Green
    Write-Host 'Pendiente: comprobar el flujo en navegador. Se dejan los servicios encendidos para esa revision.'
} finally {
    foreach ($name in $environmentNames) {
        [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
    }
    if ($recording) { Stop-Transcript | Out-Null }
    Pop-Location
}
