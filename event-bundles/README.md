# event-bundles

sandbox에서 만든 특수 랜딩을 dev로 이식할 때 사용하는 번들 폴더입니다.

## 폴더 규격

```
event-bundles/<EVENT_CODE>/
  Landing.tsx
  content.json        # 선택
  public/
    events/<EVENT_CODE>/*   # 이미지 등
  README.md
```

## 사용법

1. sandbox에서 `event-bundles/<EVENT_CODE>/` 폴더를 생성하고 랜딩 개발
2. dev로 이식 시 폴더째 복사:
   - `Landing.tsx` → `app/event/[slug]/components/Event<EVENT_CODE>Landing.tsx`
   - `public/events/<EVENT_CODE>/*` → dev의 `public/events/<EVENT_CODE>/*`
   - `app/event/[slug]/page.tsx`에 `event.code === '<EVENT_CODE>'` 분기 1개 추가

자세한 내용: [sandbox-inev-ai 운영 명세](../docs/specs/sandbox-inev-ai-operation-spec.md)
