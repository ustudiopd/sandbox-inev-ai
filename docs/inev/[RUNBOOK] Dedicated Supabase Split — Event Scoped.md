[RUNBOOK] Dedicated Supabase Split — Event Scoped
Inputs

source_supabase: (공용 URL, service role key는 공유 금지)

target_supabase: (전용 URL)

event_id: (분리 대상)

output_dir: ./exports/event-<shortid>

Steps

Export (source)

Dry-run import (target)

Import (target)

Verify counts + RLS + auth redirect URLs

Deploy env only to target Vercel project

Record results: manifest path, new ids, verification results

DoD

Import 성공

핵심 카운트 일치

RLS 최소 검증 통과

배포 프로젝트 env 분리 완료

롤백 플랜 문서에 남김

Hard Rules

No code changes

No leaking keys in repo / chat logs

Dev project must not contain target env

문서 체계(Phase 9 대신 유지해야 할 문서 2개)

docs/inev/Phase8_전용_Supabase_분리_절차.md (이미 있음)

docs/inev/clients/<client_slug>/ops.md (클라이언트별 운영 카드, 1페이지)

대표 도메인

Vercel 프로젝트명

Supabase 모드(shared/dedicated)

마지막 분리/이관 날짜

롤백 기준