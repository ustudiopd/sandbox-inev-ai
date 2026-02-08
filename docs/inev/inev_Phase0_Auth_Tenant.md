# inev.ai Phase 0 — Auth & Tenant 설계

**적용 프로젝트**: inev.ai (Supabase ref: gbkivxdlebdtfudexbga)

## 1. Admin 인증

- **Supabase Auth** 사용 (이메일/비번 또는 매직링크 중 1개 선택).
- Admin은 `auth.users`에 등록되고, `profiles` 또는 `client_members` 등으로 **어느 client에 속하는지** 연결.

## 2. Tenant 구분 (공용 Supabase)

- **client_id**를 모든 핵심 테이블의 **1급 컬럼**으로 둠.
- 테이블: `clients`, `events`, `leads`, `event_participations`, `visits`, `logs` 등.
- Admin은 **자신이 속한 client_id** 범위만 조회/수정 가능하도록 **RLS** 적용.

## 3. RLS 원칙

- `clients`: 본인 소속 client만 읽기 가능 (또는 super_admin 플래그로 전체).
- `events`: `events.client_id` = Admin의 client_id.
- `leads`, `event_participations`: `event_id` → `events` → `client_id`로 간접 제한, 또는 `client_id` 컬럼 추가 후 직접 제한.
- 서비스 롤(백엔드 전용)은 RLS 우회 가능; 애플리케이션 레벨에서 client_id 검증.

## 4. 첫 Client 생성

- RLS상 `clients`에는 insert 정책이 없으므로 **서비스 롤**로만 생성.
- 로컬: `node scripts/inev-seed-first-client.mjs "이름" slug`
- 또는 API: `POST /api/inev/clients` (서비스 롤 사용) — 필요 시 인증 추가.

## 5. 확정

- 위 내용은 전체 구현 계획 1) 확정 결정 P0-4 반영.
