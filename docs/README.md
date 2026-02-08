# docs — 문서 분류

이 디렉터리의 md 문서 분류 체계입니다.

## 폴더 구조

| 폴더 | 용도 | 예시 |
|------|------|------|
| **inev/** | inev.ai 리빌딩 계획·설계·Phase | 리빌딩 메인, 전체구현계획, UI, 매직링크, Auth/Tenant |
| **important-docs/** | 장애 보고서, 핵심 명세, 법·운영 보존용 | EventLive 전체 기능 명세서, 서버 장애 보고서, 블로그 에디터 가이드 |
| **guides/** | 설정·운영·트러블슈팅 가이드 | ENV_SETUP, 백업/복구, 인덱스, UTM, 크론, E2E 테스트 |
| **specs/** | 기능 명세서 (구현 전/중) | 이메일 발송, 설문조사, 웨비나 통계, 채팅, AI 분석 |
| **reports/** | 사후 보고·분석·장애·성능 | 장애 보고서, 성능 분석, test-send 진단, 최적화 검토 |
| **loadtest/** | 부하 테스트 계획·결과 | realtime runbook, 메트릭, 리포트 |

## 빠른 찾기

- **inev 리빌딩**: `inev/inev_리빌딩_전체구현계획.md`, `inev/inev리빌딩.md`
- **EventLive 기능 전체**: `important-docs/EventLive_전체_기능_명세서.md`
- **프로젝트 초기화(Cursor)**: `프로젝트_초기화_가이드_Cursor_Agent.md`
- **에이전트 운영 헌법**: 루트 `AGENTS.md`

## 루트에 두는 문서

- `AGENTS.md` — 에이전트 운영 헌법
- `README.md` — 프로젝트 소개
- 프로젝트 초기화 가이드는 `docs/프로젝트_초기화_가이드_Cursor_Agent.md`로 이동함

## 기타

- **memory_bank/** — 프로젝트 맥락·기술·진행 (Cursor 규칙에서 참조)
- **loadtest/** — 부하 테스트는 `docs/loadtest/` 유지
