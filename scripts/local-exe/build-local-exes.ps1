param(
    [string] $OutputDir = "scratch/local-exe"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$source = Join-Path $PSScriptRoot "KandyDropsLauncher.cs"
$outputRoot = Join-Path $repoRoot $OutputDir
$compilerCandidates = @(
    "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$compiler = $compilerCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $compiler) {
    throw "No .NET Framework C# compiler found. Install the .NET SDK or run on Windows with .NET Framework tooling."
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$targets = @(
    "KandyDrops-Test.exe",
    "KandyDrops-Live.exe"
)

foreach ($target in $targets) {
    $output = Join-Path $outputRoot $target
    & $compiler /nologo /target:exe /platform:anycpu /out:$output $source
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build $target."
    }
}

Write-Host "Built local launchers:"
foreach ($target in $targets) {
    Write-Host " - $(Join-Path $OutputDir $target)"
}
