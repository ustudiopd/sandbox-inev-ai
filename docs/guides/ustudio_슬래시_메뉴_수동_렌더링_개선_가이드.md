# ustudio-web 슬래시 메뉴 수동 렌더링 개선 가이드

**작성 일자**: 2025-01-16  
**대상 프로젝트**: ustudio-web  
**현재 상태**: 수동 렌더링 방식 사용 중, 동작하지 않음  
**목표**: 유튜브 링크 등 커스터마이징을 위한 수동 렌더링 방식으로 정상 동작

---

## 📋 현재 상황 분석

### uslab 프로젝트 (정상 동작)
- `renderItems` 설정되어 있음
- 수동으로 `suggestionItems.map()` 사용
- `onCommand={(val) => item.command?.(val)}` 형식
- **동작 원리**: `renderItems`가 `val`을 `{ editor, range }` 객체로 변환하여 전달

### ustudio 프로젝트 (동작하지 않음)
- 수동 렌더링 방식 사용
- `renderItems` 설정 여부 불명확
- `onCommand` 형식이 잘못되었을 가능성

---

## 🔍 문제 원인 분석

### 1. `onCommand` 형식 오류

#### 잘못된 형식
```typescript
<EditorCommandItem
  onCommand={(val) => item.command?.(val)} // ← val만 받음
/>
```

#### 올바른 형식
```typescript
<EditorCommandItem
  onCommand={({ editor, range }) => {
    item.command?.({ editor, range }); // ← { editor, range } 객체 받음
  }}
/>
```

### 2. `renderItems` 설정 누락 또는 충돌

수동 렌더링을 사용할 때도 `renderItems`가 있으면 Novel이 `editor`와 `range`를 자동으로 제공합니다.

---

## ✅ 해결 방법

### 방법 1: 하이브리드 방식 (uslab 방식, 권장)

`renderItems`를 유지하면서 수동 렌더링을 사용하는 방식입니다. 이 방식이 가장 안정적이고 커스터마이징도 가능합니다.

#### Step 1: `extensions.tsx` 설정

```typescript
'use client';

import { Command, createSuggestionItems, renderItems } from 'novel';
import { 
  CheckSquare, Code, Heading1, Heading2, Heading3, 
  List, ListOrdered, Text, TextQuote, Youtube
} from 'lucide-react';

export const suggestionItems = createSuggestionItems([
  {
    title: 'Heading 1',
    description: '큰 섹션 제목.',
    searchTerms: ['title', 'big', 'h1', '제목1'],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  // ... 기타 아이템들 ...
  {
    title: 'YouTube',
    description: '유튜브 동영상 삽입.',
    searchTerms: ['youtube', 'video', 'embed', '유튜브'],
    icon: <Youtube size={18} />,
    command: ({ editor, range }) => {
      const url = prompt('YouTube URL을 입력하세요:');
      if (!url) return;
      
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
      const match = url.match(youtubeRegex);
      
      if (match) {
        const videoId = match[1];
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'youtube',
            attrs: {
              src: `https://www.youtube.com/embed/${videoId}`,
            },
          })
          .run();
      } else {
        alert('유효한 YouTube URL이 아닙니다.');
      }
    },
  },
]);

export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems, // ← 필수! 이게 있으면 Novel이 editor와 range를 자동 제공
  },
});
```

#### Step 2: `BlogEditor.tsx` (또는 에디터 컴포넌트) 설정

```typescript
'use client';

import { EditorRoot, EditorContent, EditorCommand, EditorCommandItem, EditorCommandList, EditorCommandEmpty } from 'novel';
import { handleCommandNavigation } from 'novel';
import { suggestionItems, slashCommand } from './extensions';
import { useEditor } from 'novel'; // ← 필요시 사용

export default function BlogEditor({ ... }) {
  return (
    <EditorRoot>
      <EditorContent
        extensions={[/* ... 기타 확장들 ... */, slashCommand]}
        immediatelyRender={false} // ← SSR 환경에서 필수
        editorProps={{
          handleDOMEvents: {
            keydown: (_view, event) => handleCommandNavigation(event), // ← 키보드 네비게이션
          },
        }}>
        <EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-slate-200 bg-white px-1 py-2 shadow-lg">
          <EditorCommandEmpty className="px-2 text-sm text-slate-600">No results</EditorCommandEmpty>
          <EditorCommandList>
            {suggestionItems.map((item) => (
              <EditorCommandItem
                value={item.title}
                onCommand={({ editor, range }) => {
                  // ← 핵심! { editor, range } 객체를 받아서 전달
                  // renderItems가 있으면 Novel이 자동으로 이 객체를 제공함
                  item.command?.({ editor, range });
                }}
                className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100 aria-selected:bg-slate-100"
                key={item.title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                  {item.icon}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600">{item.description}</p>
                </div>
              </EditorCommandItem>
            ))}
          </EditorCommandList>
        </EditorCommand>
      </EditorContent>
    </EditorRoot>
  );
}
```

**핵심 포인트**:
- `render: renderItems` 설정 → Novel이 `editor`와 `range`를 자동 제공
- `onCommand={({ editor, range }) => ...}` 형식으로 받아서 전달
- 수동 렌더링으로 UI 커스터마이징 가능

---

### 방법 2: 완전 수동 방식 (renderItems 제거)

`renderItems`를 제거하고 완전히 수동으로 처리하는 방식입니다. 더 많은 제어가 필요할 때 사용합니다.

#### Step 1: `extensions.tsx` 설정

```typescript
'use client';

import { Command, createSuggestionItems } from 'novel';
// renderItems import 제거

export const suggestionItems = createSuggestionItems([
  // ... 아이템 정의 동일 ...
]);

export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    // render: renderItems, ← 제거!
  },
});
```

#### Step 2: `BlogEditor.tsx` 설정

```typescript
'use client';

import { EditorRoot, EditorContent, EditorCommand, EditorCommandItem, EditorCommandList, EditorCommandEmpty } from 'novel';
import { useEditor } from 'novel'; // ← 필수!
import { suggestionItems, slashCommand } from './extensions';

export default function BlogEditor({ ... }) {
  const { editor } = useEditor(); // ← 에디터 인스턴스 가져오기

  return (
    <EditorRoot>
      <EditorContent
        extensions={[/* ... 기타 확장들 ... */, slashCommand]}
        immediatelyRender={false}
        editorProps={{
          handleDOMEvents: {
            keydown: (_view, event) => handleCommandNavigation(event),
          },
        }}>
        <EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-slate-200 bg-white px-1 py-2 shadow-lg">
          <EditorCommandEmpty className="px-2 text-sm text-slate-600">No results</EditorCommandEmpty>
          <EditorCommandList>
            {suggestionItems.map((item) => (
              <EditorCommandItem
                value={item.title}
                onCommand={() => {
                  // renderItems가 없으면 수동으로 editor와 range를 가져와야 함
                  if (!editor) return;
                  
                  // Command 확장에서 range 가져오기
                  const { state } = editor.view;
                  const { $from } = state.selection;
                  
                  // 슬래시 명령어의 range 찾기
                  // (실제로는 Command 확장의 내부 상태에서 가져와야 함)
                  // 이 부분이 복잡하므로 방법 1(하이브리드)을 권장
                  
                  // 임시 해결책: range 없이 실행 (슬래시 문자는 남을 수 있음)
                  item.command?.({ 
                    editor, 
                    range: { from: $from.pos - 1, to: $from.pos } // 근사치
                  });
                }}
                className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100 aria-selected:bg-slate-100"
                key={item.title}>
                {/* ... UI 동일 ... */}
              </EditorCommandItem>
            ))}
          </EditorCommandList>
        </EditorCommand>
      </EditorContent>
    </EditorRoot>
  );
}
```

**주의**: 완전 수동 방식은 `range`를 정확히 가져오기 어려워서 **방법 1(하이브리드)을 강력히 권장**합니다.

---

## 🎯 ustudio 프로젝트 개선 체크리스트

### 필수 확인 사항

- [ ] **`extensions.tsx`에서 `renderItems` import 확인**
  ```typescript
  import { Command, createSuggestionItems, renderItems } from 'novel';
  ```

- [ ] **`slashCommand`에 `render: renderItems` 설정 확인**
  ```typescript
  export const slashCommand = Command.configure({
    suggestion: {
      items: () => suggestionItems,
      render: renderItems, // ← 필수!
    },
  });
  ```

- [ ] **`EditorCommandItem`의 `onCommand` 형식 확인**
  ```typescript
  <EditorCommandItem
    onCommand={({ editor, range }) => {
      // ← 올바른 형식: { editor, range } 객체를 받음
      item.command?.({ editor, range });
    }}
  />
  ```

- [ ] **`extensions` 배열에 `slashCommand` 포함 확인**
  ```typescript
  const extensions = useMemo(() => [
    // ... 기타 확장들 ...
    slashCommand, // ← 필수!
  ], [dependencies]);
  ```

- [ ] **`handleCommandNavigation` 연결 확인**
  ```typescript
  editorProps={{
    handleDOMEvents: {
      keydown: (_view, event) => handleCommandNavigation(event),
    },
  }}
  ```

- [ ] **SSR 환경에서 `immediatelyRender={false}` 설정 확인**
  ```typescript
  <EditorContent
    immediatelyRender={false} // ← Next.js 등 SSR 환경에서 필수
    // ...
  >
  ```

---

## 🔧 일반적인 문제 해결

### 문제 1: 메뉴는 보이지만 명령이 적용되지 않음

**원인**: `onCommand` 형식이 잘못됨

**해결**:
```typescript
// ❌ 잘못된 형식
onCommand={(val) => item.command?.(val)}

// ✅ 올바른 형식
onCommand={({ editor, range }) => {
  item.command?.({ editor, range });
}}
```

### 문제 2: `editor`가 `undefined`

**원인**: `renderItems`가 없거나 `useEditor` 훅을 사용하지 않음

**해결**:
- 방법 1(하이브리드) 사용: `render: renderItems` 설정
- 또는 `useEditor` 훅으로 `editor` 가져오기

### 문제 3: `range`가 `undefined`

**원인**: `renderItems`가 없어서 Novel이 `range`를 제공하지 않음

**해결**:
- `render: renderItems` 설정 (방법 1 권장)
- 또는 Command 확장의 내부 상태에서 `range` 가져오기 (복잡함)

### 문제 4: 슬래시 문자(`/`)가 남아있음

**원인**: `range`가 없어서 `deleteRange(range)`가 실행되지 않음

**해결**:
- `renderItems`를 사용하면 Novel이 올바른 `range`를 자동 제공
- `command` 함수에서 `deleteRange(range)` 실행 확인

---

## 📝 최종 권장 코드 (하이브리드 방식)

### `components/editor/extensions.tsx`

```typescript
'use client';

import { Command, createSuggestionItems, renderItems } from 'novel';
import { 
  CheckSquare, Code, Heading1, Heading2, Heading3, 
  List, ListOrdered, Text, TextQuote, Youtube
} from 'lucide-react';

export const suggestionItems = createSuggestionItems([
  {
    title: 'Text',
    description: '일반 텍스트로 시작.',
    searchTerms: ['p', 'paragraph', '텍스트'],
    icon: <Text size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode('paragraph', 'paragraph').run();
    },
  },
  {
    title: 'Heading 1',
    description: '큰 섹션 제목.',
    searchTerms: ['title', 'big', 'h1', '제목1'],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: '중간 섹션 제목.',
    searchTerms: ['subtitle', 'medium', 'h2', '제목2'],
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: '작은 섹션 제목.',
    searchTerms: ['subtitle', 'small', 'h3', '제목3'],
    icon: <Heading3 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: '순서 없는 목록 생성.',
    searchTerms: ['unordered', 'point', '목록'],
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: '번호가 있는 목록 생성.',
    searchTerms: ['ordered', '번호'],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'To-do List',
    description: '할 일 목록으로 작업 추적.',
    searchTerms: ['todo', 'task', 'list', 'check', '체크'],
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Quote',
    description: '인용문 삽입.',
    searchTerms: ['blockquote', '인용'],
    icon: <TextQuote size={18} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleNode('paragraph', 'paragraph').toggleBlockquote().run(),
  },
  {
    title: 'Code',
    description: '코드 블록 삽입.',
    searchTerms: ['codeblock', '코드'],
    icon: <Code size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'YouTube',
    description: '유튜브 동영상 삽입.',
    searchTerms: ['youtube', 'video', 'embed', '유튜브'],
    icon: <Youtube size={18} />,
    command: ({ editor, range }) => {
      const url = prompt('YouTube URL을 입력하세요:');
      if (!url) return;
      
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
      const match = url.match(youtubeRegex);
      
      if (match) {
        const videoId = match[1];
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'youtube',
            attrs: {
              src: `https://www.youtube.com/embed/${videoId}`,
            },
          })
          .run();
      } else {
        alert('유효한 YouTube URL이 아닙니다.');
      }
    },
  },
]);

export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems, // ← 핵심! Novel이 editor와 range를 자동 제공
  },
});
```

### `components/editor/BlogEditor.tsx` (또는 에디터 컴포넌트)

```typescript
'use client';

import { EditorRoot, EditorContent, EditorCommand, EditorCommandItem, EditorCommandList, EditorCommandEmpty } from 'novel';
import { handleCommandNavigation } from 'novel';
import { suggestionItems, slashCommand } from './extensions';
// ... 기타 import ...

export default function BlogEditor({ ... }) {
  // ... 기타 코드 ...

  return (
    <EditorRoot>
      <EditorContent
        extensions={[/* ... 기타 확장들 ... */, slashCommand]}
        immediatelyRender={false}
        editorProps={{
          handleDOMEvents: {
            keydown: (_view, event) => handleCommandNavigation(event),
          },
        }}>
        <EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-slate-200 bg-white px-1 py-2 shadow-lg">
          <EditorCommandEmpty className="px-2 text-sm text-slate-600">No results</EditorCommandEmpty>
          <EditorCommandList>
            {suggestionItems.map((item) => (
              <EditorCommandItem
                value={item.title}
                onCommand={({ editor, range }) => {
                  // ← 핵심! { editor, range } 객체를 받아서 전달
                  item.command?.({ editor, range });
                }}
                className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100 aria-selected:bg-slate-100"
                key={item.title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                  {item.icon}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600">{item.description}</p>
                </div>
              </EditorCommandItem>
            ))}
          </EditorCommandList>
        </EditorCommand>
      </EditorContent>
    </EditorRoot>
  );
}
```

---

## 🎯 핵심 포인트 요약

1. **`renderItems`는 유지**: Novel이 `editor`와 `range`를 자동으로 제공
2. **`onCommand` 형식**: `({ editor, range }) => ...` 형식으로 받아서 전달
3. **수동 렌더링**: `suggestionItems.map()`으로 UI 커스터마이징 가능
4. **하이브리드 방식**: `renderItems` + 수동 렌더링 = 최적의 조합

---

## 📚 참고 자료

- [Novel.sh - Slash Command 공식 문서](https://novel.sh/docs/guides/tailwind/slash-command)
- [uslab 프로젝트 구현 참고](./블로그_에디터_이식_슬래시_메뉴_이슈_해결_보고서.md)

---

**작성 완료**: 2025-01-16  
**권장 방식**: 하이브리드 방식 (renderItems + 수동 렌더링)

