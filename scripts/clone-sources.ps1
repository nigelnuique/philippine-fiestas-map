# Clone raw data dependencies (large files — kept in data/raw/, gitignored)
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$RawDir = Join-Path $Root "data\raw"
New-Item -ItemType Directory -Force -Path $RawDir | Out-Null

$MapsRepo = Join-Path $RawDir "philippines-json-maps"
if (-not (Test-Path $MapsRepo)) {
  git clone --depth 1 https://github.com/faeldon/philippines-json-maps.git $MapsRepo
}

$PsgcRepo = Join-Path $RawDir "psgc2"
if (-not (Test-Path $PsgcRepo)) {
  git clone --depth 1 https://github.com/xemasiv/psgc2.git $PsgcRepo
}

Write-Host "Raw sources ready in data/raw/"
