# E2E 테스트 설정 가이드

**작성일**: 2026-02-02  
**목적**: 다른 PC에서 로컬 네트워크를 통해 접속하여 E2E 테스트 수행

---

## 📋 사전 준비

### 1. 개발 서버 PC 정보
- **IP 주소**: `192.168.0.19`
- **포트**: `3000`
- **접속 URL**: `http://192.168.0.19:3000`

### 2. 테스트 PC 요구사항
- 같은 로컬 네트워크에 연결되어 있어야 함
- 웹 브라우저 설치 (Chrome, Edge, Firefox 등)
- 개발자 도구 사용 가능

---

## 🔧 설정 방법

### Step 1: Windows 방화벽 설정

#### 방법 1: PowerShell 관리자 권한으로 실행
```powershell
# 포트 3000 인바운드 규칙 추가
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

#### 방법 2: GUI로 설정
1. Windows 설정 → 네트워크 및 인터넷 → Windows 방화벽
2. "고급 설정" 클릭
3. "인바운드 규칙" → "새 규칙"
4. "포트" 선택 → "다음"
5. "TCP" 선택, "특정 로컬 포트"에 `3000` 입력 → "다음"
6. "연결 허용" 선택 → "다음"
7. 모든 프로필 체크 → "다음"
8. 이름: "Next.js Dev Server" → "마침"

### Step 2: Next.js 개발 서버 외부 접속 허용

#### 방법 1: package.json 스크립트 수정
```json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0",
    "dev:local": "next dev"
  }
}
```

#### 방법 2: 환경 변수 설정
`.env.local` 파일에 추가:
```env
HOSTNAME=0.0.0.0
```

#### 방법 3: 직접 명령어 실행
```bash
# 현재 실행 중인 서버 종료 후
npm run dev -- -H 0.0.0.0
```

### Step 3: 개발 서버 재시작

```bash
# 현재 서버 종료 (Ctrl+C)
# 새로 시작
npm run dev -- -H 0.0.0.0
```

**확인 메시지**:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Step 4: 접속 테스트

#### 개발 서버 PC에서 확인
```bash
# 브라우저에서 접속 테스트
http://localhost:3000
http://192.168.0.19:3000
```

#### 다른 PC에서 확인
1. 브라우저 열기
2. 주소창에 입력: `http://192.168.0.19:3000`
3. 페이지가 로드되면 성공

---

## 🧪 E2E 테스트 시나리오

### 시나리오 1: 기본 Visit 추적 테스트

**목적**: 각 페이지에서 Visit API가 정상 호출되는지 확인

#### 테스트 단계

1. **랜딩 페이지 테스트** (`/event/149403`)
   - 접속: `http://192.168.0.19:3000/event/149403`
   - 확인 사항:
     - [ ] 페이지 정상 로드
     - [ ] 개발자 도구 → Network 탭에서 `/api/public/campaigns/*/visit` POST 요청 확인
     - [ ] 콘솔에서 `[워트 Visit API 성공]` 또는 `[WelcomePage] Visit 수집` 로그 확인
     - [ ] 응답 상태 코드: 200
     - [ ] 응답 본문: `{"success": true}`

2. **등록 페이지 테스트** (`/event/149403/register`)
   - 접속: `http://192.168.0.19:3000/event/149403/register`
   - 확인 사항:
     - [ ] 페이지 정상 로드
     - [ ] 콘솔에서 `[RegistrationPage] 세션 ID 초기화` 로그 확인
     - [ ] Network 탭에서 Visit API 호출 확인
     - [ ] 세션 ID가 쿠키에 저장되었는지 확인 (`ef_session_id`)

3. **웨비나 입장 페이지 테스트** (`/webinar/149402`)
   - 접속: `http://192.168.0.19:3000/webinar/149402`
   - 확인 사항:
     - [ ] 페이지 정상 로드
     - [ ] Network 탭에서 Visit API 호출 확인
     - [ ] 콘솔 로그 확인

4. **웨비나 시청 페이지 테스트** (`/webinar/149402/live`)
   - 접속: `http://192.168.0.19:3000/webinar/149402/live`
   - 확인 사항:
     - [ ] 페이지 정상 로드
     - [ ] Network 탭에서 Visit API 호출 확인
     - [ ] Presence ping도 정상 동작하는지 확인

---

### 시나리오 2: UTM 파라미터 추적 테스트

**목적**: UTM 파라미터가 Visit API에 정상 전달되는지 확인

#### 테스트 단계

1. **UTM 파라미터 포함 URL 접속**
   ```
   http://192.168.0.19:3000/event/149403?utm_source=test&utm_medium=email&utm_campaign=e2e_test&utm_term=keyword&utm_content=banner&cid=test_cid_123
   ```

2. **확인 사항**:
   - [ ] 페이지 정상 로드
   - [ ] Network 탭에서 Visit API 요청 본문 확인:
     ```json
     {
       "session_id": "...",
       "utm_source": "test",
       "utm_medium": "email",
       "utm_campaign": "e2e_test",
       "utm_term": "keyword",
       "utm_content": "banner",
       "cid": "test_cid_123",
       "referrer": "...",
       "user_agent": "..."
     }
     ```
   - [ ] 콘솔에서 UTM 파라미터 저장 로그 확인

3. **등록 페이지로 이동 후 UTM 유지 확인**
   - 등록 페이지에서도 동일한 UTM 파라미터가 전달되는지 확인
   - localStorage에 UTM 저장되었는지 확인

---

### 시나리오 3: 세션 ID 일관성 테스트

**목적**: 여러 페이지를 이동해도 동일한 session_id가 유지되는지 확인

#### 테스트 단계

1. **초기 접속**
   - 접속: `http://192.168.0.19:3000/event/149403`
   - 개발자 도구 → Application → Cookies에서 `ef_session_id` 확인
   - 세션 ID 기록: `________________`

2. **등록 페이지 이동**
   - 클릭: "웨비나 등록하기" 버튼
   - 쿠키에서 `ef_session_id` 확인
   - [ ] 세션 ID가 동일한지 확인

3. **웨비나 입장 페이지 이동**
   - 접속: `http://192.168.0.19:3000/webinar/149402`
   - 쿠키에서 `ef_session_id` 확인
   - [ ] 세션 ID가 동일한지 확인

4. **Network 탭에서 모든 Visit API 요청 확인**
   - 각 요청의 `session_id`가 동일한지 확인
   - [ ] 모든 요청에서 동일한 session_id 사용

---

### 시나리오 4: 여러 브라우저/기기 테스트

**목적**: 다른 브라우저나 기기에서도 정상 동작하는지 확인

#### 테스트 단계

1. **다른 브라우저에서 테스트**
   - Chrome, Edge, Firefox 등에서 각각 접속
   - 각 브라우저마다 다른 session_id가 생성되는지 확인
   - [ ] 각 브라우저에서 Visit API 정상 호출

2. **모바일 기기에서 테스트** (선택사항)
   - 같은 Wi-Fi 네트워크에 연결된 모바일 기기에서 접속
   - 모바일 브라우저에서도 정상 동작하는지 확인
   - [ ] 모바일에서도 Visit API 정상 호출

---

### 시나리오 5: 에러 처리 테스트

**목적**: 네트워크 오류나 API 실패 시에도 페이지가 정상 동작하는지 확인

#### 테스트 단계

1. **네트워크 제한 테스트**
   - 개발자 도구 → Network 탭 → "Offline" 모드 활성화
   - 페이지 새로고침
   - [ ] 페이지는 정상 로드되지만 Visit API는 실패
   - [ ] 콘솔에 에러 로그는 있지만 페이지 동작에는 영향 없음

2. **API 강제 실패 테스트** (개발 환경)
   - URL에 `?__debug_visit_fail=1` 추가
   - 접속: `http://192.168.0.19:3000/event/149403?__debug_visit_fail=1`
   - [ ] Visit API가 500 에러 반환
   - [ ] 페이지는 정상 동작
   - [ ] 콘솔에 구조화 로그 출력 확인

---

## 📊 테스트 체크리스트

### 기본 기능
- [ ] 랜딩 페이지 Visit API 호출
- [ ] 등록 페이지 Visit API 호출
- [ ] 웨비나 입장 페이지 Visit API 호출
- [ ] 웨비나 시청 페이지 Visit API 호출

### UTM 파라미터
- [ ] UTM 파라미터 URL 전달
- [ ] UTM 파라미터 Visit API 요청 본문 포함
- [ ] UTM 파라미터 localStorage 저장
- [ ] UTM 파라미터 페이지 이동 시 유지

### 세션 ID
- [ ] 세션 ID 쿠키 생성
- [ ] 세션 ID 페이지 이동 시 유지
- [ ] 세션 ID Visit API 요청에 포함
- [ ] 브라우저별로 다른 세션 ID 생성

### 에러 처리
- [ ] 네트워크 오류 시 graceful failure
- [ ] API 실패 시 페이지 정상 동작
- [ ] 구조화 로그 출력

---

## 🐛 문제 해결

### 문제 1: 다른 PC에서 접속 불가

**증상**: `http://192.168.0.19:3000` 접속 시 연결 시간 초과

**해결 방법**:
1. Windows 방화벽 확인
2. Next.js 서버가 `0.0.0.0`에서 리스닝하는지 확인
3. 두 PC가 같은 네트워크에 있는지 확인
4. 방화벽 로그 확인

### 문제 2: Visit API 호출 안 됨

**증상**: 페이지는 로드되지만 Visit API 호출이 없음

**해결 방법**:
1. 개발자 도구 → Console에서 에러 확인
2. Network 탭에서 필터링: `/api/public/campaigns/*/visit`
3. 페이지 새로고침 후 확인
4. 브라우저 캐시 클리어

### 문제 3: 세션 ID가 계속 바뀜

**증상**: 페이지 이동 시마다 새로운 세션 ID 생성

**해결 방법**:
1. 쿠키 설정 확인 (SameSite, Secure 등)
2. 브라우저 쿠키 차단 설정 확인
3. 개발자 도구 → Application → Cookies에서 쿠키 저장 확인

---

## 📝 테스트 결과 기록 템플릿

```markdown
## 테스트 결과 - [날짜]

### 테스트 환경
- 개발 서버 IP: 192.168.0.19:3000
- 테스트 PC: [PC 정보]
- 브라우저: [브라우저 및 버전]

### 테스트 결과

#### 시나리오 1: 기본 Visit 추적
- [ ] 랜딩 페이지: ✅/❌
- [ ] 등록 페이지: ✅/❌
- [ ] 웨비나 입장: ✅/❌
- [ ] 웨비나 시청: ✅/❌

#### 시나리오 2: UTM 파라미터
- [ ] UTM 전달: ✅/❌
- [ ] UTM 저장: ✅/❌

#### 시나리오 3: 세션 ID 일관성
- [ ] 세션 ID 유지: ✅/❌

### 발견된 문제
1. [문제 설명]
2. [문제 설명]

### 스크린샷
- [스크린샷 첨부]
```

---

**작성일**: 2026-02-02  
**다음 단계**: 실제 E2E 테스트 수행 및 결과 기록
