param(
  [ValidateSet('felipe')][string]$Profile = 'felipe',
  [string]$Region = 'sa-east-1'
)
$ErrorActionPreference = 'Stop'
$identity = (& aws sts get-caller-identity --profile $Profile --region $Region --output json | ConvertFrom-Json)
if ($LASTEXITCODE -ne 0 -or $identity.Account -ne '379443323181') { throw 'Profile felipe must use account 379443323181.' }
if ($env:VITE_API_URL -and $env:VITE_API_URL -ne 'https://api.moneystack.com.br') { throw 'Production API URL is required.' }
& corepack pnpm@10.5.2 run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
$hasProductionApi = @(Get-ChildItem -LiteralPath 'dist/assets' -Filter '*.js' | Where-Object { [System.IO.File]::ReadAllText($_.FullName).Contains('https://api.moneystack.com.br') }).Count -gt 0
if (!$hasProductionApi) { throw 'The frontend bundle does not point to the production API.' }
function Invoke-Aws([string[]]$Arguments) {
  & aws @Arguments --profile $Profile --region $Region
  if ($LASTEXITCODE -ne 0) { throw 'AWS command failed.' }
}
$revision = (& git rev-parse HEAD).Trim()
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "releases/independent-invoices/$stamp-$revision/previous-index.html"
New-Item -ItemType Directory -Path 'tmp/independent-invoices' -Force | Out-Null
Invoke-Aws @('s3','cp','s3://moneystack-frontend/index.html',"s3://moneystack-frontend/$backup",'--only-show-errors')
Invoke-Aws @('s3','sync','dist/assets','s3://moneystack-frontend/assets','--cache-control','public,max-age=31536000,immutable','--only-show-errors')
foreach ($file in Get-ChildItem -LiteralPath 'dist' -File | Where-Object Name -NE 'index.html') {
  Invoke-Aws @('s3','cp',$file.FullName,"s3://moneystack-frontend/$($file.Name)",'--cache-control','public,max-age=86400','--only-show-errors')
}
Invoke-Aws @('s3','cp','dist/index.html','s3://moneystack-frontend/index.html','--content-type','text/html','--cache-control','no-cache,no-store,must-revalidate','--metadata',"web-commit=$revision",'--only-show-errors')
$invalidation = & aws cloudfront create-invalidation --distribution-id E25QMGVM17EIA6 --paths '/*' --query 'Invalidation.Id' --output text --profile $Profile --region $Region
if ($LASTEXITCODE -ne 0) { throw 'CloudFront invalidation failed.' }
@{ revision=$revision; backupIndex="s3://moneystack-frontend/$backup"; distributionId='E25QMGVM17EIA6'; invalidationId=$invalidation; publishedAt=(Get-Date).ToUniversalTime().ToString('o') } |
  ConvertTo-Json | Set-Content -LiteralPath 'tmp/independent-invoices/web-release.json' -Encoding utf8
Write-Output "Frontend published. Revision: $revision. Invalidation: $invalidation. Rollback: s3://moneystack-frontend/$backup"
