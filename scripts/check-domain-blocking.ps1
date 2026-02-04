# 도메인 차단 체크 스크립트
# 사용법: .\check-domain-blocking.ps1 [도메인]
# 예시: .\check-domain-blocking.ps1 eventflow.kr

param(
    [string]$domain = "eventflow.kr"
)

Write-Host "=== 도메인 차단 체크 ===" -ForegroundColor Green
Write-Host "도메인: $domain`n" -ForegroundColor Cyan

# 1. DNS 확인
Write-Host "1. DNS 확인..." -ForegroundColor Yellow
try {
    $dns = Resolve-DnsName $domain -Type A -ErrorAction Stop
    $ipAddresses = ($dns | Where-Object { $_.Type -eq 'A' }).IPAddress -join ', '
    Write-Host "   ✅ DNS 정상: $ipAddresses" -ForegroundColor Green
} catch {
    Write-Host "   ❌ DNS 오류: $_" -ForegroundColor Red
}

# 2. HTTPS 접속 확인
Write-Host "`n2. HTTPS 접속 확인..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://$domain" -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ HTTPS 정상: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   ✅ 서버: $($response.Headers.Server)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ HTTPS 오류: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "   상태 코드: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}

# 3. SSL 인증서 확인
Write-Host "`n3. SSL 인증서 확인..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($domain, 443)
    $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream(), $false, { param($sender, $cert, $chain, $errors) return $true })
    $sslStream.AuthenticateAsClient($domain)
    $cert = $sslStream.RemoteCertificate
    $certObj = [System.Security.Cryptography.X509Certificates.X509Certificate2]$cert
    
    Write-Host "   ✅ 인증서 발급자: $($certObj.Issuer)" -ForegroundColor Green
    Write-Host "   ✅ 주체: $($certObj.Subject)" -ForegroundColor Green
    Write-Host "   ✅ 만료일: $($certObj.NotAfter)" -ForegroundColor Green
    
    $daysUntilExpiry = ($certObj.NotAfter - (Get-Date)).Days
    if ($daysUntilExpiry -lt 30) {
        Write-Host "   ⚠️  인증서 만료까지 $daysUntilExpiry 일 남음" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ 인증서 만료까지 $daysUntilExpiry 일 남음" -ForegroundColor Green
    }
    
    $sslStream.Close()
    $tcpClient.Close()
} catch {
    Write-Host "   ❌ SSL 오류: $_" -ForegroundColor Red
}

# 4. 응답 헤더 확인
Write-Host "`n4. 보안 헤더 확인..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://$domain" -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    
    $securityHeaders = @{
        'Strict-Transport-Security' = 'HSTS'
        'X-Frame-Options' = 'X-Frame-Options'
        'X-Content-Type-Options' = 'X-Content-Type-Options'
        'Content-Security-Policy' = 'CSP'
        'Referrer-Policy' = 'Referrer-Policy'
        'Permissions-Policy' = 'Permissions-Policy'
    }
    
    $foundHeaders = 0
    foreach ($header in $securityHeaders.Keys) {
        if ($response.Headers[$header]) {
            Write-Host "   ✅ $($securityHeaders[$header]): $($response.Headers[$header])" -ForegroundColor Green
            $foundHeaders++
        }
    }
    
    if ($foundHeaders -eq 0) {
        Write-Host "   ⚠️  보안 헤더가 설정되지 않았습니다" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  헤더 확인 실패: $_" -ForegroundColor Yellow
}

# 5. 온라인 도구 링크 제공
Write-Host "`n=== 추가 확인 링크 ===" -ForegroundColor Green
Write-Host "다음 도구들을 사용하여 더 자세한 정보를 확인하세요:`n" -ForegroundColor Cyan

$tools = @{
    "VirusTotal" = "https://www.virustotal.com/gui/domain/$domain"
    "URLVoid" = "https://www.urlvoid.com/scan/$domain"
    "Google Safe Browsing" = "https://transparencyreport.google.com/safe-browsing/search?url=$domain"
    "Sucuri SiteCheck" = "https://sitecheck.sucuri.net/?q=$domain"
    "SSL Labs" = "https://www.ssllabs.com/ssltest/analyze.html?d=$domain"
    "Security Headers" = "https://securityheaders.com/?q=https://$domain"
    "DNS Checker" = "https://dnschecker.org/#A/$domain"
    "MXToolbox" = "https://mxtoolbox.com/SuperTool.aspx?action=blacklist%3a$domain"
}

foreach ($tool in $tools.GetEnumerator()) {
    Write-Host "   • $($tool.Key):" -ForegroundColor Yellow
    Write-Host "     $($tool.Value)" -ForegroundColor Gray
}

Write-Host "`n=== 체크 완료 ===" -ForegroundColor Green
Write-Host "`n참고: 자동화된 모니터링을 원하시면 UptimeRobot, Pingdom 등의 서비스를 사용하세요." -ForegroundColor Cyan
