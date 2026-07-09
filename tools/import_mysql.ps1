param(
  [string]$MysqlExe = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
  [string]$HostName = 'localhost',
  [int]$Port = 3306,
  [string]$User = 'root'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

if (-not (Test-Path -LiteralPath $MysqlExe)) {
  throw "mysql.exe not found: $MysqlExe"
}

function Convert-ToMysqlPath([string]$Path) {
  return ((Resolve-Path -LiteralPath $Path).Path -replace '\\', '/')
}

$loadSql = Get-Content -Raw -Encoding UTF8 (Join-Path $repo 'db\load_data.sql')
$replacements = @{
  'db/products.csv' = Convert-ToMysqlPath (Join-Path $repo 'db\products.csv')
  'db/product_categories.csv' = Convert-ToMysqlPath (Join-Path $repo 'db\product_categories.csv')
  'db/product_images.csv' = Convert-ToMysqlPath (Join-Path $repo 'db\product_images.csv')
  'db/product_relations.csv' = Convert-ToMysqlPath (Join-Path $repo 'db\product_relations.csv')
  'db/product_knowledge_chunks.csv' = Convert-ToMysqlPath (Join-Path $repo 'db\product_knowledge_chunks.csv')
}
foreach ($key in $replacements.Keys) {
  $loadSql = $loadSql.Replace($key, $replacements[$key])
}

$schemaSql = Get-Content -Raw -Encoding UTF8 (Join-Path $repo 'db\schema.sql')
$verifySql = "`r`nSELECT COUNT(*) AS products FROM product_knowledge.products;`r`nSELECT COUNT(*) AS categories FROM product_knowledge.product_categories;`r`nSELECT COUNT(*) AS images FROM product_knowledge.product_images;`r`nSELECT COUNT(*) AS relations FROM product_knowledge.product_relations;`r`nSELECT COUNT(*) AS chunks FROM product_knowledge.product_knowledge_chunks;`r`n"
$generatedSql = Join-Path (Join-Path $repo 'db') 'generated_import.sql'
Set-Content -Encoding UTF8 -LiteralPath $generatedSql -Value ($schemaSql + "`r`n" + $loadSql + "`r`n" + $verifySql)
$mysqlGeneratedSql = Convert-ToMysqlPath $generatedSql

Write-Host "Importing products_v2.xlsx generated CSV files into MySQL database product_knowledge."
Write-Host "Generated SQL: $generatedSql"

$baseArgs = @('--host', $HostName, '--port', $Port, '--user', $User, '--default-character-set=utf8mb4')
if (-not $env:MYSQL_PWD) {
  $baseArgs += '--password'
}

& $MysqlExe @baseArgs --execute="SET GLOBAL local_infile=1;"
& $MysqlExe @baseArgs --local-infile=1 --execute="source $mysqlGeneratedSql"
