param(
  [string]$Region = 'sa-east-1',
  [string]$Bucket = 'moneystack-frontend',
  [string]$DistributionId = 'E25QMGVM17EIA6'
)
$ErrorActionPreference = 'Stop'
function Invoke-Aws([string[]]$Arguments) {
  & aws @Arguments --region $Region
  if ($LASTEXITCODE -ne 0) { throw 'AWS command failed.' }
}
if ($env:VITE_API_URL -and $env:VITE_API_URL -ne 'https://api.moneystack.com.br') {
  throw 'Production deployment requires the production API URL.'
}
& pnpm build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
$revision = (& git rev-parse HEAD).Trim()
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "releases/shopping-lists/$stamp-$revision/previous-index.html"
New-Item -ItemType Directory -Path 'tmp' -Force | Out-Null
# Keep both a remote rollback entry point and all previously published hashed assets.
Invoke-Aws @('s3','cp',"s3://$Bucket/index.html","s3://$Bucket/$backup",'--only-show-errors')
Invoke-Aws @('s3','sync','dist/assets',"s3://$Bucket/assets",'--cache-control','public,max-age=31536000,immutable','--only-show-errors')
foreach ($file in Get-ChildItem -LiteralPath 'dist' -File | Where-Object Name -NE 'index.html') {
  Invoke-Aws @('s3','cp',$file.FullName,"s3://$Bucket/$($file.Name)",'--cache-control','public,max-age=86400','--only-show-errors')
}
# Publish the entry point last so clients never receive references to missing assets.
Invoke-Aws @('s3','cp','dist/index.html',"s3://$Bucket/index.html",'--content-type','text/html','--cache-control','no-cache,no-store,must-revalidate','--metadata',"web-commit=$revision",'--only-show-errors')
$invalidation = & aws cloudfront create-invalidation --distribution-id $DistributionId --paths '/*' --query 'Invalidation.Id' --output text --region $Region
if ($LASTEXITCODE -ne 0) { throw 'CloudFront invalidation failed.' }
@{ revision=$revision; backupIndex="s3://$Bucket/$backup"; distributionId=$DistributionId; invalidationId=$invalidation; publishedAt=(Get-Date).ToUniversalTime().ToString('o') } |
  ConvertTo-Json | Set-Content -LiteralPath 'tmp/shopping-lists-web-release.json' -Encoding utf8
Write-Output "Frontend published. Revision: $revision. Invalidation: $invalidation. Backup: s3://$Bucket/$backup"
