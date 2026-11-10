$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:3007"
$code = "admin@123"
$h = @{ "x-skyline-passcode" = $code }

Write-Host "--- health ---"
(Invoke-RestMethod "$base/api/health") | ConvertTo-Json -Compress

Write-Host "--- post a review (pending by default) ---"
$rev = @{ id = "RPUB0001AAA"; name = "Meera Rane"; initials = "MR"; service = "Home Loan"; rating = 5; text = "Documents were listed clearly and the sanction came faster than expected." } | ConvertTo-Json
(Invoke-RestMethod -Uri "$base/api/reviews" -Method Post -ContentType "application/json" -Body $rev) | ConvertTo-Json -Compress

Write-Host "--- public feed while pending (must be empty) ---"
((Invoke-RestMethod "$base/api/reviews/public").records.Count)

Write-Host "--- approve it ---"
(Invoke-RestMethod -Uri "$base/api/reviews/RPUB0001AAA" -Method Patch -ContentType "application/json" -Headers $h -Body (@{ status = "approved" } | ConvertTo-Json)).record.status

Write-Host "--- public feed after approval (no passcode needed) ---"
$pub = Invoke-RestMethod "$base/api/reviews/public"
$pub.records.Count
$pub.records[0] | ConvertTo-Json -Compress

Write-Host "--- public feed must not leak contact fields ---"
$raw = (Invoke-WebRequest "$base/api/reviews/public" -UseBasicParsing).Content
if ($raw -match "phone" -or $raw -match "email") { Write-Host "FAIL: contact field present" } else { Write-Host "clean: no phone/email in public feed" }

Write-Host "--- leads must never be public ---"
try { Invoke-RestMethod "$base/api/leads" | Out-Null; Write-Host "FAIL: leads readable without passcode" }
catch { Write-Host ("protected: " + $_.Exception.Response.StatusCode.value__) }

Write-Host "--- cleanup ---"
(Invoke-RestMethod -Uri "$base/api/reviews/RPUB0001AAA" -Method Delete -Headers $h) | ConvertTo-Json -Compress
