# Supabase MCP 연동 가이드

다른 PC에서 Cursor와 Supabase MCP를 연동할 때 필요한 설정 방법을 정리한 문서입니다.

---

## 1. 사전 요구사항

- **Node.js** 설치 (npx 사용을 위해 필요)
- **인터넷** 연결 (최초 실행 시 MCP 패키지 다운로드)
- **Supabase 계정** (동일 조직/프로젝트 접근 권한)

---

## 2. Supabase Personal Access Token (PAT) 발급

1. 브라우저에서 **https://supabase.com/dashboard/account/tokens** 접속
2. Supabase 계정으로 로그인
3. **Generate new token** 으로 새 Access Token 생성
4. 토큰 이름(설명) 입력 후 생성
5. **표시된 토큰 값을 복사해 안전한 곳에 보관**
   - 한 번 생성 후에는 다시 볼 수 없으므로 반드시 저장

**다른 PC에서 사용 시**

- **방법 A:** 같은 계정으로 로그인 후 새 토큰 발급
- **방법 B:** 기존에 복사해 둔 토큰 값을 그대로 사용 (동일 계정이면 동일 프로젝트 접근)

---

## 3. Cursor MCP 설정

### 3.1 방법 A: 프로젝트별 설정 (`.cursor/mcp.json`)

프로젝트 루트에 `.cursor` 폴더를 만들고, 그 안에 `mcp.json` 파일을 생성합니다.

**경로:** `프로젝트_루트/.cursor/mcp.json`

**내용 예시:**

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "여기에_발급받은_토큰_붙여넣기"
      ]
    }
  }
}
```

- `여기에_발급받은_토큰_붙여넣기` 를 2단계에서 발급한 **Personal Access Token** 값으로 교체합니다.

**보안 권장**

- `mcp.json` 에 토큰이 포함되므로, 공용 저장소에 올리지 않도록 `.gitignore` 에 추가하는 것을 권장합니다.

  ```gitignore
  .cursor/mcp.json
  ```

### 3.2 방법 B: Cursor 사용자 전역 설정

- **Cursor → Settings → MCP** 메뉴에서 MCP 서버를 추가할 수 있습니다.
- 서버 이름, command(`npx`), args(`-y`, `@supabase/mcp-server-supabase@latest`, `--access-token`, `토큰값`) 를 동일하게 입력합니다.
- 이 방법은 Cursor 사용자 설정에 저장되며, 프로젝트와 무관하게 모든 워크스페이스에서 사용할 수 있습니다.

---

## 4. 연동 확인

1. `mcp.json` 저장 후 Cursor를 재시작하거나, MCP 설정 화면을 새로고침합니다.
2. **Cursor → Settings → MCP** 에서 Supabase 서버가 **초록색(활성)** 으로 표시되면 연동이 완료된 것입니다.
3. 채팅에서 Supabase 프로젝트 목록 조회, SQL 실행 등 MCP 도구가 정상 동작하는지 확인합니다.

---

## 5. MCP로 가능한 작업 (참고)

연동이 완료되면 Cursor에서 다음 작업을 할 수 있습니다.

- Supabase 스키마 조회·수정
- 테이블 설계 및 마이그레이션 관리
- SQL 쿼리 실행 및 데이터 조회
- DB 스키마 기반 TypeScript 타입 생성
- 프로젝트 설정·URL·키 확인
- 백엔드 관련 작업 자동화

---

## 6. 문제 해결

| 증상 | 확인 사항 |
|------|-----------|
| MCP 서버가 보이지 않음 | `.cursor/mcp.json` 경로·이름 확인, Cursor 재시작 |
| 연결 실패(빨간색) | 토큰 값 오타·만료 여부, Supabase 로그인 상태 확인 |
| npx 실패 | Node.js 설치 여부, `npx -v` 로 확인 |
| 프로젝트 목록이 비어 있음 | 해당 토큰의 Supabase 계정에 프로젝트가 있는지 대시보드에서 확인 |

---

## 7. 요약

| 단계 | 내용 |
|------|------|
| 1 | Supabase 대시보드에서 Personal Access Token 발급 및 보관 |
| 2 | 프로젝트 루트 `.cursor/mcp.json` 생성 또는 Cursor 전역 MCP 설정에 서버 추가 |
| 3 | `command`: `npx`, `args`: `-y`, `@supabase/mcp-server-supabase@latest`, `--access-token`, `토큰값` |
| 4 | Cursor 재시작 후 Settings → MCP 에서 초록색 활성 상태 확인 |

다른 PC에서는 **동일한 Supabase 계정의 토큰**만 준비한 뒤, 위 2~4단계를 그대로 적용하면 됩니다.
