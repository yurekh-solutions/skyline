$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:3000"
$code = "admin@123"

Write-Host "--- health ---"
(Invoke-RestMethod "$base/api/health") | ConvertTo-Json -Compress

Write-Host "--- POST lead ---"
$lead = @{ id = "LTEST0001AAA"; name = "API Test"; phone = "9876543210"; email = "api@example.com"; service = "GST Registration"; message = "verification post"; createdAt = (Get-Date).ToString("o") } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "$base/api/leads" -Method Post -ContentType "application/json" -Headers @{ "x-skyline-passcode" = $code } -Body $lead
$r | ConvertTo-Json -Compress

Write-Host "--- POST same lead again (must update, not duplicate) ---"
(Invoke-RestMethod -Uri "$base/api/leads" -Method Post -ContentType "application/json" -Headers @{ "x-skyline-passcode" = $code } -Body $lead) | ConvertTo-Json -Compress

Write-Host "--- GET leads with passcode ---"
$rows = Invoke-RestMethod -Uri "$base/api/leads" -Headers @{ "x-skyline-passcode" = $code }
$rows.records.Count
$rows.records[0].id + " / " + $rows.records[0].status

Write-Host "--- PATCH status ---"
(Invoke-RestMethod -Uri "$base/api/leads/LTEST0001AAA" -Method Patch -ContentType "application/json" -Headers @{ "x-skyline-passcode" = $code } -Body (@{ status = "contacted" } | ConvertTo-Json)) | ConvertTo-Json -Compress

Write-Host "--- POST review ---"
$rev = @{ id = "RTEST0001AAA"; name = "Review Bot"; service = "Bus Booking"; rating = 5; text = "verification review"; createdAt = (Get-Date).ToString("o") } | ConvertTo-Json
(Invoke-RestMethod -Uri "$base/api/reviews" -Method Post -ContentType "application/json" -Headers @{ "x-skyline-passcode" = $code } -Body $rev) | ConvertTo-Json -Compress

Write-Host "--- GET reviews without passcode (expect 401) ---"
try { Invoke-RestMethod -Uri "$base/api/reviews" | Out-Null; Write-Host "FAIL: allowed" }
catch { Write-Host ("blocked with " + $_.Exception.Response.StatusCode.value__) }

Write-Host "--- DELETE lead + review ---"
(Invoke-RestMethod -Uri "$base/api/leads/LTEST0001AAA" -Method Delete -Headers @{ "x-skyline-passcode" = $code }) | ConvertTo-Json -Compress
(Invoke-RestMethod -Uri "$base/api/reviews/RTEST0001AAA" -Method Delete -Headers @{ "x-skyline-passcode" = $code }) | ConvertTo-Json -Compress

Write-Host "--- static + traversal guard ---"
foreach ($p in @("/", "/index.html", "/admin.html", "/robots.txt", "/sitemap.xml", "/site.webmanifest", "/assets/css/base.css", "/assets/js/leads.js")) {
  $resp = Invoke-WebRequest -Uri ($base + $p) -UseBasicParsing
  Write-Host ($p + " -> " + $resp.StatusCode + " " + $resp.Headers["Content-Type"] + " " + [math]::Round($resp.RawContentLength / 1KB) + "KB")
}
try { Invoke-WebRequest -Uri ($base + "/../secrets.txt") -UseBasicParsing | Out-Null; Write-Host "traversal not blocked" }
catch { Write-Host ("traversal blocked: " + $_.Exception.Response.StatusCode.value__) }
try { Invoke-WebRequest -Uri ($base + "/data/leads.json") -UseBasicParsing | Out-Null; Write-Host "FAIL: data file served" }
catch { Write-Host ("data file protected: " + $_.Exception.Response.StatusCode.value__) }
Write-Host "--- counts after cleanup ---"
((Invoke-RestMethod -Uri "$base/api/leads" -Headers @{ "x-skyline-passcode" = $code }).records.Count)
