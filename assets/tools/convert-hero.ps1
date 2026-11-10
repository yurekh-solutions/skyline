param(
  [string]$Src = "C:\Users\yurek\.qoder\vibe_images\mumbai-skyline-dusk_1794214813.png",
  [string]$Out = "assets\img\mumbai-skyline-dusk.jpg",
  [int]$MaxW = 1600,
  [int]$Quality = 82
)

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Resolve-Path $Src).Path)
$ratio = $MaxW / $img.Width
if ($ratio -gt 1) { $ratio = 1 }
$w = [int]($img.Width * $ratio)
$h = [int]($img.Height * $ratio)
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $w, $h)
$g.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
$bmp.Save((Join-Path (Get-Location) $Out), $codec, $ep)
$bmp.Dispose()
$img.Dispose()
Write-Host ("saved {0} {1}x{2} {3} KB" -f $Out, $w, $h, [math]::Round((Get-Item $Out).Length / 1KB))
