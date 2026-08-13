$root = 'C:\Users\Ghz\Desktop\eliyas\my-menu'
$cssUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663887810301/ZQPhKWCtuuPYaFBY.css'
$cssPath = Join-Path $root 'assets\css\customer-redesign.css'
Invoke-WebRequest -UseBasicParsing -Uri $cssUrl -OutFile $cssPath
$indexPath = Join-Path $root 'index.html'
$html = Get-Content -Path $indexPath -Raw
if ($html -notmatch 'customer-redesign\.css') {
  $link = "  <link rel=`"stylesheet`" href=`"assets/css/customer-redesign.css?v=ember-premium-1`">`r`n"
  $html = $html.Replace('</head>', $link + '</head>')
  Set-Content -Path $indexPath -Value $html -Encoding utf8
}
Write-Output 'Customer redesign applied'
Write-Output $cssPath
Write-Output $indexPath
