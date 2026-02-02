# E2E 테스트 빠른 시작 가이드

**작성일**: 2026-02-02  
**목적**: 다른 PC에서 빠르게 E2E 테스트 시작하기

---

## 🚀 빠른 시작 (3단계)

### Step 1: 방화벽 설정 (1분)

**PowerShell 관리자 권한으로 실행**:
```powershell
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Step 2: 개발 서버 재시작 (30초)

**현재 서버 종료** (Ctrl+C) 후:
```bash
npm run dev:network
```

**확인 메시지**:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Step 3: 다른 PC에서 접속 (10초)

**브라우저 주소창에 입력**:
```
http://192.168.0.19:3000
```

---

## ✅ 기본 테스트 체크리스트

### 1. 랜딩 페이지 테스트
- [ ] 접속: `http://192.168.0.19:3000/event/149403`
- [ ] 개발자 도구 → Network 탭
- [ ] `/api/public/campaigns/*/visit` POST 요청 확인
- [ ] 응답: `{"success": true}`

### 2. 등록 페이지 테스트
- [ ] 접속: `http://192.168.0.19:3000/event/149403/register`
- [ ] 콘솔에서 `[RegistrationPage] 세션 ID 초기화` 확인
- [ ] Visit API 호출 확인

### 3. 웨비나 시청 페이지 테스트
- [ ] 접속: `http://192.168.0.19:3000/webinar/149402/live`
- [ ] Visit API 호출 확인

### 4. UTM 파라미터 테스트
- [ ] 접속: `http://192.168.0.19:3000/event/149403?utm_source=test&utm_medium=email&cid=test123`
- [ ] Network 탭 → Visit API 요청 본문 확인
- [ ] UTM 파라미터가 포함되어 있는지 확인

---

## 🔍 상세 테스트 시나리오

자세한 테스트 시나리오는 `docs/E2E_테스트_설정_가이드.md` 참고

---

## 🐛 문제 해결

### 접속이 안 될 때
1. 방화벽 규칙 확인: `Get-NetFirewallRule -DisplayName "Next.js Dev Server"`
2. 서버가 `0.0.0.0`에서 리스닝하는지 확인
3. 두 PC가 같은 네트워크인지 확인

### Visit API가 호출 안 될 때
1. 개발자 도구 → Console에서 에러 확인
2. Network 탭에서 필터링: `visit`
3. 페이지 새로고침

---

**작성일**: 2026-02-02
