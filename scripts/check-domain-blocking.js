#!/usr/bin/env node
/**
 * 도메인 차단 체크 스크립트
 * 사용법: node check-domain-blocking.js [도메인]
 * 예시: node check-domain-blocking.js eventflow.kr
 */

const https = require('https');
const dns = require('dns').promises;
const { URL } = require('url');

const domain = process.argv[2] || 'eventflow.kr';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkDNS() {
  try {
    const addresses = await dns.resolve4(domain);
    log(`   ✅ DNS 정상: ${addresses.join(', ')}`, 'green');
    return true;
  } catch (error) {
    log(`   ❌ DNS 오류: ${error.message}`, 'red');
    return false;
  }
}

function checkHTTPS() {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      log(`   ✅ HTTPS 정상: ${res.statusCode}`, 'green');
      if (res.headers.server) {
        log(`   ✅ 서버: ${res.headers.server}`, 'gray');
      }
      resolve(true);
    });

    req.on('error', (error) => {
      log(`   ❌ HTTPS 오류: ${error.message}`, 'red');
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      log('   ❌ HTTPS 타임아웃', 'red');
      resolve(false);
    });

    req.end();
  });
}

function checkSSL() {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      if (cert) {
        log(`   ✅ 인증서 발급자: ${cert.issuer.CN}`, 'green');
        log(`   ✅ 주체: ${cert.subject.CN}`, 'green');
        
        const expiryDate = new Date(cert.valid_to);
        const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        log(`   ✅ 만료일: ${expiryDate.toLocaleDateString()}`, 'green');
        
        if (daysUntilExpiry < 30) {
          log(`   ⚠️  인증서 만료까지 ${daysUntilExpiry} 일 남음`, 'yellow');
        } else {
          log(`   ✅ 인증서 만료까지 ${daysUntilExpiry} 일 남음`, 'green');
        }
        resolve(true);
      } else {
        log('   ❌ 인증서 정보 없음', 'red');
        resolve(false);
      }
    });

    req.on('error', (error) => {
      log(`   ❌ SSL 오류: ${error.message}`, 'red');
      resolve(false);
    });

    req.end();
  });
}

function checkSecurityHeaders() {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 10000,
    };

    const securityHeaders = {
      'strict-transport-security': 'HSTS',
      'x-frame-options': 'X-Frame-Options',
      'x-content-type-options': 'X-Content-Type-Options',
      'content-security-policy': 'CSP',
      'referrer-policy': 'Referrer-Policy',
      'permissions-policy': 'Permissions-Policy',
    };

    const req = https.request(options, (res) => {
      let foundHeaders = 0;
      
      Object.keys(securityHeaders).forEach((header) => {
        const value = res.headers[header];
        if (value) {
          log(`   ✅ ${securityHeaders[header]}: ${value}`, 'green');
          foundHeaders++;
        }
      });

      if (foundHeaders === 0) {
        log('   ⚠️  보안 헤더가 설정되지 않았습니다', 'yellow');
      }

      resolve(true);
    });

    req.on('error', () => {
      log('   ⚠️  헤더 확인 실패', 'yellow');
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  log('=== 도메인 차단 체크 ===', 'green');
  log(`도메인: ${domain}\n`, 'cyan');

  log('1. DNS 확인...', 'yellow');
  await checkDNS();

  log('\n2. HTTPS 접속 확인...', 'yellow');
  await checkHTTPS();

  log('\n3. SSL 인증서 확인...', 'yellow');
  await checkSSL();

  log('\n4. 보안 헤더 확인...', 'yellow');
  await checkSecurityHeaders();

  log('\n=== 추가 확인 링크 ===', 'green');
  log('다음 도구들을 사용하여 더 자세한 정보를 확인하세요:\n', 'cyan');

  const tools = {
    'VirusTotal': `https://www.virustotal.com/gui/domain/${domain}`,
    'URLVoid': `https://www.urlvoid.com/scan/${domain}`,
    'Google Safe Browsing': `https://transparencyreport.google.com/safe-browsing/search?url=${domain}`,
    'Sucuri SiteCheck': `https://sitecheck.sucuri.net/?q=${domain}`,
    'SSL Labs': `https://www.ssllabs.com/ssltest/analyze.html?d=${domain}`,
    'Security Headers': `https://securityheaders.com/?q=https://${domain}`,
    'DNS Checker': `https://dnschecker.org/#A/${domain}`,
    'MXToolbox': `https://mxtoolbox.com/SuperTool.aspx?action=blacklist%3a${domain}`,
  };

  Object.entries(tools).forEach(([name, url]) => {
    log(`   • ${name}:`, 'yellow');
    log(`     ${url}`, 'gray');
  });

  log('\n=== 체크 완료 ===', 'green');
  log('\n참고: 자동화된 모니터링을 원하시면 UptimeRobot, Pingdom 등의 서비스를 사용하세요.', 'cyan');
}

main().catch(console.error);
