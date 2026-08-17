$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5173/api'
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

function PostJson($path, $body, $token = $null) {
  $h = @{ 'Content-Type' = 'application/json' }
  if ($token) { $h.Authorization = "Bearer $token" }
  $r = Invoke-RestMethod -Uri "$base$path" -Method Post -Headers $h -Body ($body | ConvertTo-Json -Depth 10) -TimeoutSec 30
  return $r
}
function GetJson($path, $token) {
  $h = @{ Authorization = "Bearer $token" }
  $r = Invoke-RestMethod -Uri "$base$path" -Method Get -Headers $h -TimeoutSec 30
  return $r
}
function PatchJson($path, $body, $token) {
  $h = @{ 'Content-Type' = 'application/json'; Authorization = "Bearer $token" }
  $r = Invoke-RestMethod -Uri "$base$path" -Method Patch -Headers $h -Body ($body | ConvertTo-Json -Depth 10) -TimeoutSec 30
  return $r
}

Write-Host "== E2E JOURNEY THROUGH VITE PROXY =="

# 1. login finder (demo)
$login = PostJson '/auth/login' @{ email = 'demo@findsity.edu'; password = 'Password123' }
$finderTok = $login.token
Write-Host "1. finder login OK: $($login.user.name)"

# 2. register claimant
$email = "e2e_$ts@campus.edu"
$reg = PostJson '/auth/register' @{ fullName = 'E2E User'; email = $email; password = 'Password123'; confirmPassword = 'Password123'; college = 'Campus U'; role = 'student' }
$claimTok = $reg.token
Write-Host "2. claimant registered: $email"

# 3. finder posts found item (FormData via multipart)
$boundary = "----findsity$ts"
function PostForm($path, $fields, $token, $filePath = $null) {
  $h = @{ Authorization = "Bearer $token" }
  $body = [System.Text.StringBuilder]::new()
  foreach ($k in $fields.Keys) {
    [void]$body.Append("--$boundary`r`nContent-Disposition: form-data; name=`"$k`"`r`n`r`n$($fields[$k])`r`n")
  }
  if ($filePath) {
    $bytes = [IO.File]::ReadAllBytes($filePath)
    [void]$body.Append("--$boundary`r`nContent-Disposition: form-data; name=`"images`"; filename=`"cover.jpg`"`r`nContent-Type: image/jpeg`r`n`r`n")
    $stream = [IO.MemoryStream]::new()
    $head = [Text.Encoding]::UTF8.GetBytes($body.ToString())
    $stream.Write($head, 0, $head.Length)
    $stream.Write($bytes, 0, $bytes.Length)
    [void]$stream.Write([Text.Encoding]::UTF8.GetBytes("`r`n--$boundary--`r`n"), 0, [Text.Encoding]::UTF8.GetBytes("`r`n--$boundary--`r`n").Length)
    $req = [Net.HttpWebRequest]::Create("$base$path")
    $req.Method = 'POST'
    $req.ContentType = "multipart/form-data; boundary=$boundary"
    $req.Headers['Authorization'] = "Bearer $token"
    $req.ContentLength = $stream.Length
    $rs = $req.GetRequestStream(); $stream.WriteTo($rs); $rs.Close()
    $resp = $req.GetResponse(); $reader = [IO.StreamReader]::new($resp.GetResponseStream())
    $json = $reader.ReadToEnd()
    return $json | ConvertFrom-Json
  }
  $h2 = @{ 'Content-Type' = "multipart/form-data; boundary=$boundary"; Authorization = "Bearer $token" }
  $fullBody = $body.ToString() + "--$boundary--`r`n"
  return Invoke-RestMethod -Uri "$base$path" -Method Post -Headers $h2 -Body $fullBody -TimeoutSec 30
}
$img = 'C:\dev\Findsity\backend\data\seed-cover.jpg'
if (-not (Test-Path $img)) {
  $b = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
  [IO.File]::WriteAllBytes($img, $b)
}
$found = PostForm '/items' @{ type = 'found'; name = "Sony WH-1000XM5 e2e"; categoryId = '1'; brand = 'Sony'; model = 'WH-1000XM5'; color = 'Black'; dateIncident = '2026-08-16'; timeApprox = '14:30'; location = 'Library, 2nd floor'; description = 'Over-ear headphones with noise cancelling.'; privateIdentifyingFeatures = 'Serial starts with XM5B'; reward = 'Thank you' } $finderTok $img
Write-Host "3. found item created: $($found.item.uid) id=$($found.item.id)"

# 4. claimant posts lost item
$lost = PostForm '/items' @{ type = 'lost'; name = 'Sony WH-1000XM5 lost'; categoryId = '1'; brand = 'Sony'; model = 'WH-1000XM5'; color = 'Black'; dateIncident = '2026-08-16'; timeApprox = '14:00'; location = 'Library'; description = 'Lost my black Sony headphones in the library.' } $claimTok
Write-Host "4. lost item created: $($lost.item.uid) id=$($lost.item.id)"

# 5. search + matches
$search = GetJson "/items?type=found&q=headphones" $claimTok
Write-Host "5. search 'headphones' -> $($search.items.Count) results"
$matches = GetJson "/items/$($lost.item.id)/matches" $claimTok
$matchItems = @($matches.matches)
Write-Host "6. finder-side matches: $($matchItems.Count) (top score $($matchItems[0].match_score))"

# 7. claimant claims the found item
$claim = PostJson "/items/$($found.item.id)/claims" @{ lostLocation = 'Library, 2nd floor'; lostDate = '2026-08-16'; brand = 'Sony'; model = 'WH-1000XM5'; color = 'Black'; uniqueFeature = 'Serial XM5B-4431'; proofOfOwnership = 'Box and receipt at home'; additionalInfo = 'Black case included' } $claimTok
Write-Host "7. claim created: id=$($claim.claim.id) risk=$($claim.claim.riskLevel)$($claim.claim.risk_level)"

# 8. claimant views own claim; finder views claim
$mine = GetJson '/claims/mine' $claimTok
Write-Host "8. claimant claim list: $($mine.claims.Count) item"
$detail = GetJson "/claims/$($claim.claim.id)" $finderTok
Write-Host "9. finder claim detail: answers=$($detail.claim.answers.Count) canReview=$($detail.claim.canReview)"

# 10. admin reviews + approves
$adminLogin = PostJson '/auth/login' @{ email = 'admin@findsity.edu'; password = 'Password123' }
$adminTok = $adminLogin.token
$review = PostJson "/admin/claims/$($claim.claim.id)/review" @{ decision = 'approve'; note = 'Answers match' } $adminTok
Write-Host "10. admin review: $($review.message)"

# 11. finder arranges handover
$ho = PostJson "/claims/$($claim.claim.id)/handover" @{ pickupLocation = 'Library front desk'; scheduledDate = '2026-08-18'; scheduledTime = '15:00'; notes = 'Bring your ID' } $finderTok
Write-Host "11. handover arranged: $($ho.message)"

# 12. finder-confirm then claimant-confirm
$fc = PostJson "/claims/$($claim.claim.id)/handover/finder-confirm" @{} $finderTok
Write-Host "12. finder-confirm: $($fc.message)"
$cc = PostJson "/claims/$($claim.claim.id)/handover/claimant-confirm" @{} $claimTok
Write-Host "13. claimant-confirm: $($cc.message)"

# 14. final state
$final = GetJson "/claims/$($claim.claim.id)" $finderTok
Write-Host "14. final claim status: $($final.claim.status) / item status: $($final.claim.item_status)"

# 15. messages
$conv = PostJson "/conversations" @{ itemId = $found.item.id; initialMessage = 'Hi! Is my headphone case included?' } $claimTok
$cid = $conv.conversation.id
$m2 = PostJson "/conversations/$cid/messages" @{ body = 'Yes, it is. See you at the desk.' } $finderTok
$thr = GetJson "/conversations/$cid/messages" $claimTok
Write-Host "15. conversation #$cid messages: $($thr.messages.Count) thread OK"

# 16. notifications
$notif = GetJson '/notifications' $claimTok
Write-Host "16. claimant notifications: $($notif.notifications.Count)"

# 17. report + admin resolve
$rep = PostJson "/reports" @{ targetType = 'item'; targetId = $found.item.id; reason = 'spam'; details = 'Duplicate listing' } $finderTok
$res = PostJson "/admin/reports/$($rep.report.id)/resolve" @{ decision = 'rejected'; note = 'No issue' } $adminTok
Write-Host "17. report resolved: $($res.message)"

# 18. admin stats + profile bio
$stats = GetJson '/admin/stats' $adminTok
Write-Host "18. admin stats: users=$($stats.stats.totalUsers) lost=$($stats.stats.totalLost) found=$($stats.stats.totalFound) returned=$($stats.stats.returned) pendingReports=$($stats.stats.pendingReports)"
$h = @{ 'Content-Type' = 'application/json'; Authorization = "Bearer $claimTok" }
$bio = Invoke-RestMethod -Uri "$base/auth/profile" -Method Put -Headers $h -Body (@{ bio = 'E2E journey bio' } | ConvertTo-Json) -TimeoutSec 30
$me = GetJson '/auth/me' $claimTok
Write-Host "19. profile bio saved: $($me.user.bio)"

Write-Host "`nE2E JOURNEY PASSED"