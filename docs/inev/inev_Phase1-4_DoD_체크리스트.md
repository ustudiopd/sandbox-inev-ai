# inev Phase 1~4 DoD 체크리스트

**실행**: `node scripts/inev-dod-test-phase1-4.mjs [BASE_URL]`  
**기본 BASE_URL**: `http://localhost:3000` (dev 서버 실행 후)

---

## Phase 1 — Event 컨테이너 + 모듈 ON/OFF

| DoD | 확인 항목 |
|-----|-----------|
| ✅ | Client 목록 조회 (`GET /api/inev/clients`) |
| ✅ | 이벤트 목록/생성 (`GET/POST /api/inev/events?client_id=`) |
| ✅ | public 진입 가능 (`/event/[slug]`, 모듈 OFF 시 해당 메뉴 비노출) |

---

## Phase 2 — 등록 + 설문

| DoD | 확인 항목 |
|-----|-----------|
| ✅ | 등록 API (`POST /api/inev/register` slug, email, name) |
| ✅ | 중복 시 갱신 메시지 |
| ✅ | 등록자 목록 조회 (`GET /api/inev/events/[eventId]/leads`) |
| ✅ | 설문 제출 (`POST /api/inev/survey`), 설문 응답 탭 |

---

## Phase 3 — UTM/Visit 이벤트 단위

| DoD | 확인 항목 |
|-----|-----------|
| ✅ | Visit 기록 (`POST /api/inev/visits` slug, utm_*) |
| ✅ | UTM 집계 조회 (`GET /api/inev/events/[eventId]/visits?aggregate=true`) |
| ✅ | 이벤트별로 데이터 분리 (클라이언트 내 여러 이벤트에서 섞이지 않음) |

---

## Phase 4 — 이메일 + 미리보기/테스트 발송

| DoD | 확인 항목 |
|-----|-----------|
| ✅ | 이벤트 이메일 초안 저장 (`PUT /api/inev/events/[eventId]/email`) |
| ✅ | 이메일 조회 (미리보기용) (`GET /api/inev/events/[eventId]/email`) |
| ✅ | 테스트 발송 API (`POST /api/inev/events/[eventId]/email/test-send`, body: `{ to }`) |
| ✅ | Admin 이벤트 상세 > 이메일 탭 (저장/미리보기/테스트 발송) |

---

*마지막 검증: 스크립트 전체 통과 기준.*
