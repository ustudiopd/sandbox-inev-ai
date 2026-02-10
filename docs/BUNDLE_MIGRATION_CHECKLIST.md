# 이벤트 번들 → dev 이식 체크리스트

sandbox의 `event-bundles/<EVENT_CODE>/`를 dev 레포로 옮긴 뒤, 이식이 올바른지 확인할 때 사용한다.

---

## 이식 전 (샌드박스에서 확인)

### 번들 구조

- [ ] `event-bundles/<EVENT_CODE>/Landing.tsx` 존재
- [ ] `event-bundles/<EVENT_CODE>/content.json` 존재 (사용 시)
- [ ] `event-bundles/<EVENT_CODE>/public/events/<EVENT_CODE>/` 에 이미지 등 정리됨
- [ ] `README.md` 에 이벤트 코드·용도·주의사항 정리됨

### 랜딩 품질

- [ ] PC에서 `/event/<EVENT_CODE>` 정상 렌더
- [ ] 모바일에서 레이아웃·버튼 터치 영역 확인
- [ ] 이미지 경로가 `public/events/<EVENT_CODE>/` 또는 상대 경로로 통일됨 (하드코딩 URL 최소화)
- [ ] Landing이 `event`, `content`, `links` props 기반으로 동작 (필요 시)

### 링크·CTA

- [ ] entry/등록/웨비나/온디맨드/문의 버튼 링크가 `links` 또는 placeholder로 설정됨
- [ ] dev 이식 시 실제 URL만 바꿔도 되도록 구조화됨

### 폼·동작

- [ ] 폼 제출은 `onSubmit`/`onRegister` 등 콜백 prop으로 분리 가능
- [ ] 샌드박스에서만 쓰는 테스트 저장은 `sandbox_*` 테이블 사용

---

## 이식 후 (dev에서 확인)

### 파일 복사

- [ ] `Event<EVENT_CODE>Landing.tsx` 가 `app/event/[slug]/components/` 에 있음
- [ ] `public/events/<EVENT_CODE>/*` 가 dev의 `public/` 아래에 복사됨
- [ ] `content.json` 반영 방식 결정됨 (파일 유지 또는 DB/세션으로 이전)

### 라우트·분기

- [ ] `app/event/[slug]/page.tsx` 에 `event.code === '<EVENT_CODE>'` 분기 1개만 추가됨
- [ ] 해당 분기에서 `<Event<EVENT_CODE>Landing event={event} ... />` 호출 확인

### 이미지·OG

- [ ] 랜딩 내 이미지가 dev 도메인 기준으로 정상 로드됨 (예: `/events/<EVENT_CODE>/xxx.png`)
- [ ] OG/메타 이미지 경로가 운영 도메인으로 올바름
- [ ] `generateMetadata` 에 해당 이벤트용 title/description/image 설정 여부 확인 (필요 시)

### 동작·QA

- [ ] dev 환경에서 `/event/<slug 또는 code>` 로 접속 시 샌드박스와 동일한 화면 재현
- [ ] entry/등록/웨비나 등 CTA 클릭 시 운영 플로우로 이동
- [ ] 폼 제출 시 dev용 handler(실제 등록 API 등)로 연결됨

### 운영 코어

- [ ] `/s`, `/entry`, API 라우트 등 **분기 외** 수정 없음
- [ ] RLS/서비스롤/운영 테이블 접근 로직 변경 없음

---

## 빠른 점검 (5분 이식 검증용)

1. 번들 폴더 복사 → dev `app/event/[slug]/components/` + `public/events/<code>/`
2. `page.tsx` 분기 1줄 추가
3. dev에서 `/event/<code>` 접속 → 화면·이미지·버튼만 확인

위 세 단계가 끊기지 않으면 "간단 이식" 규격을 만족한다.
