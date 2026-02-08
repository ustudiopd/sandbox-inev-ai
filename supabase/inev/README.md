# inev.ai 전용 마이그레이션

Supabase 프로젝트 **inev.ai** (ref: gbkivxdlebdtfudexbga)에 적용하는 스키마입니다.

## 적용 방법

1. [Supabase Dashboard](https://supabase.com/dashboard) → inev.ai 프로젝트 선택
2. **SQL Editor** 이동
3. `001_initial_schema.sql` 내용 전체 복사 후 **Run** 실행

또는 Supabase CLI가 inev 프로젝트에 연결되어 있다면:

```bash
supabase db push
```

(현재 repo의 `supabase/migrations`는 EventFlow용이므로, inev는 위 SQL 파일을 수동 적용하거나 별도 링크 후 push)

## 적용 후 확인

- Table Editor에서 `clients`, `events`, `leads`, `event_participations`, `client_members` 테이블 생성 확인
- 첫 Client·Admin은 서비스 롤로 삽입하거나 `scripts/inev-seed-first-client.ts` 실행
