# sandbox.inev.ai 배포 가이드

sandbox는 **운영 리허설 서버**입니다. dev와 동일한 코드베이스·테이블을 사용하며, client_id만 sandbox로 격리됩니다.

## Vercel 배포

- **프로젝트**: `sandbox-inev-ai` (별도 Vercel 프로젝트)
- **도메인**: `sandbox.inev.ai`

## 환경 변수 (필수)

```env
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# sandbox 도메인으로 설정 (도메인 기반 client_id 격리에 사용)
NEXT_PUBLIC_APP_URL=https://sandbox.inev.ai
```

**중요**: `NEXT_PUBLIC_APP_URL`을 `https://sandbox.inev.ai`로 설정해야 도메인 기반 client_id 격리가 정상 동작합니다.

## 운영과 동일한 flow

- sandbox.inev.ai에서 `/s` → `/entry` → 등록 → 웨비나/온디맨드/QR until **동일한 플로우**로 테스트 가능
- 데이터는 `clients.slug = 'sandbox'`인 client_id로만 격리되어 저장됨

## 참고

- [sandbox-inev-ai 운영 명세](../specs/sandbox-inev-ai-operation-spec.md)
