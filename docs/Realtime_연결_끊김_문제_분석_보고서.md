# Realtime 연결 끊김 문제 분석 보고서

## 🔴 문제 현상

스택 트레이스를 보면:
- `CLOSED` 상태가 반복적으로 발생
- `unsubscribe()`와 `removeChannel()`이 반복적으로 호출됨
- 재연결 시도가 계속 반복되지만 연결이 유지되지 않음

**에러 로그**:
```
실시간 구독 상태: {status: 'CLOSED', channel: 'webinar:4affa8fb-d585-4c48-af7b-a20ee6501e4c:messages', error: null}
⚠️ 실시간 구독 실패 (CLOSED) {status: 'CLOSED', ...}
```

---

## 🔍 발견된 문제점

### 1. ⚠️ **재연결 로직의 경쟁 상태 (Race Condition)**

**위치**: `components/webinar/Chat.tsx` (라인 806-815)

**문제**:
```typescript
// 재연결 시도 (reconnectKey 변경으로 useEffect 재실행, 단 메시지는 유지)
setTimeout(() => {
  // 채널 정리
  channel.unsubscribe().then(() => {
    supabase.removeChannel(channel)
    console.log('채널 정리 완료, 재연결 시도 (메시지 유지)')
  }).catch(() => {
    // 무시 (이미 정리되었을 수 있음)
  })
  
  // reconnectKey 변경으로 useEffect 재실행 (초기 로드는 건너뜀)
  setReconnectKey(prev => prev + 1)
}, delay)
```

**문제점**:
1. `setReconnectKey(prev => prev + 1)`를 호출하면 **useEffect가 재실행**됩니다.
2. useEffect가 재실행되면 **cleanup 함수가 먼저 실행**되어 채널을 정리합니다.
3. 그런데 `setTimeout` 내부에서도 채널을 정리하려고 하므로, **중복 정리**가 발생합니다.
4. cleanup 함수가 실행되면서 채널이 `CLOSED` 상태가 되고, 이것이 다시 재연결을 트리거하는 **순환**이 발생합니다.

**해결책**: `setTimeout` 내부에서 채널을 정리하지 말고, `setReconnectKey`만 호출하여 cleanup 함수가 자연스럽게 채널을 정리하도록 해야 합니다.

---

### 2. ⚠️ **cleanup 함수와 재연결 로직의 타이밍 문제**

**위치**: `components/webinar/Chat.tsx` (라인 790-815)

**문제**:
```typescript
return () => {
  console.log('실시간 구독 해제:', channelName)
  channel.unsubscribe().then(() => {
    supabase.removeChannel(channel)
  }).catch((err) => {
    console.warn('채널 구독 해제 오류:', err)
  })
}
```

**문제점**:
- cleanup 함수가 실행될 때 채널을 정리하는데, 이 시점에 `setTimeout`으로 예약된 재연결 로직이 아직 실행되지 않았을 수 있습니다.
- `setTimeout`이 실행될 때는 이미 cleanup이 실행되어 채널이 정리된 상태일 수 있습니다.
- 이로 인해 **이미 정리된 채널을 다시 정리**하려고 시도하거나, **정리되지 않은 채널을 재연결**하려고 시도할 수 있습니다.

**해결책**: `setTimeout`의 반환값을 저장하고, cleanup 함수에서 이를 취소해야 합니다.

---

### 3. ⚠️ **여러 Chat 인스턴스가 동시에 마운트될 가능성**

**위치**: `app/(webinar)/webinar/[id]/components/WebinarView.tsx` (라인 727-733, 776-782)

**문제**:
```typescript
{/* 모바일: 탭 컨텐츠 */}
{activeTab === 'chat' ? (
  <Chat webinarId={webinar.id} ... />
) : (
  <QA webinarId={webinar.id} ... />
)}

{/* 데스크톱: 사이드바 */}
{activeTab === 'chat' ? (
  <Chat webinarId={webinar.id} ... />
) : (
  <QA webinarId={webinar.id} ... />
)}
```

**문제점**:
- 모바일과 데스크톱에서 **각각 Chat 컴포넌트가 렌더링**됩니다.
- `hidden lg:block`으로 화면에 하나만 보이지만, **두 인스턴스가 모두 마운트**될 수 있습니다.
- 같은 `webinarId`로 **두 개의 채널이 구독**될 수 있습니다.
- 하나의 인스턴스가 언마운트되면 cleanup이 실행되어 채널이 정리되고, 이것이 다른 인스턴스에도 영향을 줄 수 있습니다.

**해결책**: 
- Chat 컴포넌트를 한 번만 렌더링하고, 레이아웃만 변경하도록 수정
- 또는 `key` prop을 사용하여 인스턴스를 분리

---

### 4. ⚠️ **setTimeout이 cleanup되지 않음**

**위치**: `components/webinar/Chat.tsx` (라인 787-791, 807-815)

**문제**:
```typescript
// 3회 실패 시 폴백 활성화
if (reconnectTriesRef.current >= 3) {
  setFallbackOn(true)
  setTimeout(() => {
    setReconnectKey(prev => prev + 1)
  }, 30000)
  return
}

// 재연결 시도
setTimeout(() => {
  channel.unsubscribe().then(() => {
    supabase.removeChannel(channel)
  })
  setReconnectKey(prev => prev + 1)
}, delay)
```

**문제점**:
- `setTimeout`의 반환값을 저장하지 않아서, cleanup 함수에서 취소할 수 없습니다.
- 컴포넌트가 언마운트되거나 useEffect가 재실행되어도, 예약된 `setTimeout`이 계속 실행됩니다.
- 이로 인해 **이미 정리된 채널을 다시 정리**하려고 시도하거나, **불필요한 재연결**이 발생할 수 있습니다.

**해결책**: `setTimeout`의 반환값을 `useRef`에 저장하고, cleanup 함수에서 `clearTimeout`을 호출해야 합니다.

---

### 5. ⚠️ **기존 채널 정리 로직의 비동기 처리 문제**

**위치**: `components/webinar/Chat.tsx` (라인 437-446)

**문제**:
```typescript
// 기존 채널 확인 및 제거 (안전장치)
const existingChannel = supabase.getChannels().find(...)
if (existingChannel) {
  console.warn('기존 채널 발견, 제거 중:', channelName)
  existingChannel.unsubscribe().then(() => {
    supabase.removeChannel(existingChannel)
  })
}
```

**문제점**:
- `unsubscribe()`가 완료되기 전에 새로운 채널을 생성할 수 있습니다.
- 비동기 작업이 완료되기 전에 useEffect가 재실행되면, **여러 채널이 동시에 존재**할 수 있습니다.

**해결책**: `await`를 사용하여 기존 채널 정리가 완료된 후에 새로운 채널을 생성해야 합니다.

---

## 📋 참고해야 할 파일

### 핵심 파일
1. **`components/webinar/Chat.tsx`** (라인 419-815)
   - Realtime 구독 로직
   - 재연결 로직
   - cleanup 함수

2. **`app/(webinar)/webinar/[id]/components/WebinarView.tsx`** (라인 727-791)
   - Chat 컴포넌트 사용 위치
   - 조건부 렌더링 로직

3. **`lib/supabase/client.ts`**
   - Supabase 클라이언트 생성
   - Realtime 토큰 주입

### 관련 파일
4. **`components/webinar/QA.tsx`**
   - 비슷한 Realtime 구독 패턴 (참고용)

5. **`app/(webinar)/webinar/[id]/live/page.tsx`**
   - WebinarView를 사용하는 페이지

---

## 🔧 권장 수정 사항

### 1. 재연결 로직 개선 (최우선)

```typescript
// setTimeout 반환값 저장
const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
const fallbackReconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

// useEffect 내부
useEffect(() => {
  // ... 기존 코드 ...
  
  .subscribe(async (status, err) => {
    // ... 기존 로깅 ...
    
    if (status === 'SUBSCRIBED') {
      // 기존 재연결 타이머 취소
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (fallbackReconnectTimeoutRef.current) {
        clearTimeout(fallbackReconnectTimeoutRef.current)
        fallbackReconnectTimeoutRef.current = null
      }
      // ... 기존 코드 ...
    } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
      // ... 기존 코드 ...
      
      if (reconnectTriesRef.current >= 3) {
        setFallbackOn(true)
        // 기존 타이머 취소
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
        // 폴백 재연결 타이머 설정
        fallbackReconnectTimeoutRef.current = setTimeout(() => {
          reconnectTriesRef.current = 0
          setReconnectKey(prev => prev + 1)
          fallbackReconnectTimeoutRef.current = null
        }, 30000)
        return
      }
      
      // 토큰 재주입 시도
      // ... 기존 코드 ...
      
      // 재연결 타이머 설정 (채널 정리하지 않음 - cleanup이 처리)
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectKey(prev => prev + 1)
        reconnectTimeoutRef.current = null
      }, delay)
    }
  })
  
  return () => {
    // 모든 타이머 취소
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (fallbackReconnectTimeoutRef.current) {
      clearTimeout(fallbackReconnectTimeoutRef.current)
      fallbackReconnectTimeoutRef.current = null
    }
    
    // 채널 정리
    channel.unsubscribe().then(() => {
      supabase.removeChannel(channel)
    }).catch((err) => {
      console.warn('채널 구독 해제 오류:', err)
    })
  }
}, [webinarId, supabase, currentUser?.id, reconnectKey])
```

### 2. 기존 채널 정리 개선

```typescript
// 기존 채널 확인 및 제거 (비동기 대기)
const existingChannel = supabase.getChannels().find(
  ch => ch.topic === `realtime:${channelName}`
)
if (existingChannel) {
  console.warn('기존 채널 발견, 제거 중:', channelName)
  await existingChannel.unsubscribe()
  supabase.removeChannel(existingChannel)
  // 약간의 지연을 두어 정리가 완전히 완료되도록 함
  await new Promise(resolve => setTimeout(resolve, 100))
}
```

### 3. Chat 컴포넌트 중복 렌더링 방지

**옵션 A**: Chat 컴포넌트를 한 번만 렌더링
```typescript
// WebinarView.tsx
const chatComponent = (
  <Chat
    webinarId={webinar.id}
    canSend={true}
    maxMessages={50}
    isAdminMode={isAdminMode}
  />
)

// 모바일과 데스크톱에서 같은 인스턴스 사용
<div className="lg:hidden">{chatComponent}</div>
<div className="hidden lg:block">{chatComponent}</div>
```

**옵션 B**: key prop으로 인스턴스 분리
```typescript
<Chat
  key={`chat-mobile-${webinar.id}`}
  webinarId={webinar.id}
  ...
/>
<Chat
  key={`chat-desktop-${webinar.id}`}
  webinarId={webinar.id}
  ...
/>
```

---

## 🎯 우선순위

1. **최우선**: 재연결 로직 개선 (setTimeout cleanup)
2. **높음**: 기존 채널 정리 개선 (비동기 대기)
3. **중간**: Chat 컴포넌트 중복 렌더링 방지

---

## 📝 추가 확인 사항

1. **React Strict Mode**: 개발 모드에서 Strict Mode가 활성화되어 있으면 useEffect가 두 번 실행될 수 있습니다.
2. **컴포넌트 리마운트**: WebinarView가 리마운트되는 경우가 있는지 확인
3. **상태 업데이트**: `setReconnectKey`가 다른 상태 업데이트와 함께 배치 처리되는지 확인

---

## 🔗 관련 코드 위치

### 핵심 코드 섹션

1. **Realtime 구독 useEffect** (라인 420-794)
   - 채널 생성 및 구독
   - 재연결 로직
   - cleanup 함수

2. **재연결 로직** (라인 762-815)
   - 에러 처리
   - 재연결 시도
   - 폴백 활성화

3. **Chat 컴포넌트 사용** (WebinarView.tsx 라인 727-791)
   - 모바일/데스크톱 렌더링

---

## 📄 참고 파일 소스

### 1. `components/webinar/Chat.tsx` - 핵심 구독 로직

```420:815:components/webinar/Chat.tsx
  // 메시지 로드 및 Realtime 구독
  useEffect(() => {
    // webinarId가 변경되면 초기 로드 리셋
    if (lastWebinarIdRef.current !== webinarId) {
      initialLoadTimeRef.current = 0
      lastWebinarIdRef.current = webinarId
    }
    
    // 초기 로드는 한 번만 실행 (재연결 시에는 메시지 유지)
    const isInitialLoad = initialLoadTimeRef.current === 0
    if (isInitialLoad) {
      loadMessages(true) // 초기 로드만 실행
    }
    
    // 고정 채널명 사용 (중복 구독 방지)
    const channelName = `webinar:${webinarId}:messages`
    
    // 기존 채널 확인 및 제거 (안전장치)
    const existingChannel = supabase.getChannels().find(
      ch => ch.topic === `realtime:${channelName}`
    )
    if (existingChannel) {
      console.warn('기존 채널 발견, 제거 중:', channelName)
      existingChannel.unsubscribe().then(() => {
        supabase.removeChannel(existingChannel)
      })
    }
    
    // 실시간 구독
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false }, // 자신의 메시지는 제외 (Optimistic Update로 처리)
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `webinar_id=eq.${webinarId}`,
        },
        (payload) => {
          // ... 이벤트 처리 로직 ...
        }
      )
      .subscribe(async (status, err) => {
        // 상세한 로깅 (디버깅 개선)
        console.log('실시간 구독 상태:', {
          status,
          channel: channelName,
          error: err ? {
            message: err.message,
            code: (err as any)?.code,
            reason: (err as any)?.reason,
            wasClean: (err as any)?.wasClean,
            error: err,
          } : null,
        })
        
        if (status === 'SUBSCRIBED') {
          reconnectTriesRef.current = 0
          if (fallbackOn) {
            console.log('✅ 실시간 구독 성공, 폴백 폴링 비활성화')
            setFallbackOn(false)
          }
          lastEventAt.current = Date.now()
          console.log('✅ 실시간 구독 성공:', channelName)
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          reconnectTriesRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectTriesRef.current - 1), 10000)
          
          // 상세한 에러 정보 로깅
          console.warn(`⚠️ 실시간 구독 실패 (${status})`, {
            status,
            channel: channelName,
            retryCount: reconnectTriesRef.current,
            maxRetries: 3,
            nextRetryDelay: delay,
            error: err ? {
              message: err.message,
              code: (err as any)?.code,
              reason: (err as any)?.reason,
              wasClean: (err as any)?.wasClean,
              error: err,
            } : null,
          })
          
          // 3회 실패 시 폴백 활성화
          if (reconnectTriesRef.current >= 3) {
            console.warn('🔴 실시간 구독 3회 실패, 폴백 폴링 활성화')
            setFallbackOn(true)
            // 폴백 활성화 후에도 주기적으로 재연결 시도 (메시지는 유지)
            setTimeout(() => {
              console.log('🔄 폴백 모드에서 재연결 시도 (메시지 유지)')
              reconnectTriesRef.current = 0 // 재시도 횟수 리셋
              setReconnectKey(prev => prev + 1) // 재연결 시도 (초기 로드는 건너뜀)
            }, 30000) // 30초 후 재연결 시도
            return
          }
          
          // 토큰 재주입 시도
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
              supabase.realtime.setAuth(session.access_token)
              console.log('토큰 재주입 완료')
            }
          } catch (tokenError) {
            console.warn('토큰 재주입 실패:', tokenError)
          }
          
          // 재연결 시도 (reconnectKey 변경으로 useEffect 재실행, 단 메시지는 유지)
          setTimeout(() => {
            // 채널 정리
            channel.unsubscribe().then(() => {
              supabase.removeChannel(channel)
              console.log('채널 정리 완료, 재연결 시도 (메시지 유지)')
            }).catch(() => {
              // 무시 (이미 정리되었을 수 있음)
            })
            
            // reconnectKey 변경으로 useEffect 재실행 (초기 로드는 건너뜀)
            setReconnectKey(prev => prev + 1)
          }, delay)
        }
      })
    
    return () => {
      console.log('실시간 구독 해제:', channelName)
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel)
      }).catch((err) => {
        console.warn('채널 구독 해제 오류:', err)
      })
    }
  }, [webinarId, supabase, currentUser?.id, reconnectKey])
```

### 2. `app/(webinar)/webinar/[id]/components/WebinarView.tsx` - Chat 컴포넌트 사용

```727:791:app/(webinar)/webinar/[id]/components/WebinarView.tsx
                {/* 탭 컨텐츠 */}
                <div className="flex-1 overflow-hidden">
                  {activeTab === 'chat' ? (
                    <Chat
                      webinarId={webinar.id}
                      canSend={true}
                      maxMessages={50}
                      isAdminMode={isAdminMode}
                    />
                  ) : (
                    <QA
                      webinarId={webinar.id}
                      canAsk={true}
                      showOnlyMine={false}
                      isAdminMode={isAdminMode}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 사이드바 - 채팅/Q&A (데스크톱) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[calc(100vh-200px)] flex flex-col w-full max-w-[400px]">
              {/* 탭 */}
              <div className="border-b border-gray-200 flex">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  💬 채팅
                </button>
                <button
                  onClick={() => setActiveTab('qa')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'qa'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  ❓ Q&A
                </button>
              </div>
              
              {/* 탭 컨텐츠 */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'chat' ? (
                  <Chat
                    webinarId={webinar.id}
                    canSend={true}
                    maxMessages={50}
                    isAdminMode={isAdminMode}
                  />
                ) : (
                  <QA
                    webinarId={webinar.id}
                    canAsk={true}
                    showOnlyMine={false}
                    isAdminMode={isAdminMode}
                  />
                )}
              </div>
            </div>
          </div>
```

### 3. `components/webinar/Chat.tsx` - 상태 및 ref 선언

```54:75:components/webinar/Chat.tsx
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false) // 상단 더보기 로딩 상태
  const [sending, setSending] = useState(false)
  const [fallbackOn, setFallbackOn] = useState(false)
  const [reconnectKey, setReconnectKey] = useState(0) // 재연결을 위한 키
  const [currentUser, setCurrentUser] = useState<{ id: string; display_name?: string; email?: string } | null>(null)
  const [nextCursor, setNextCursor] = useState<{ beforeTs: string; beforeId: number } | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesTopRef = useRef<HTMLDivElement>(null) // 상단 sentinel
  const messagesContainerRef = useRef<HTMLDivElement>(null) // 메시지 컨테이너
  const sendingClientMsgIdRef = useRef<string | null>(null)
  const lastEventAt = useRef<number>(Date.now())
  const lastMessageIdRef = useRef<number>(0)
  const reconnectTriesRef = useRef<number>(0)
  const initialLoadTimeRef = useRef<number>(0) // 초기 로드 완료 시간
  const etagRef = useRef<string | null>(null) // ETag 캐시
  const pollBackoffRef = useRef<number>(0) // 폴링 백오프 (에러 시 증가)
  const lastWebinarIdRef = useRef<string | null>(null) // 마지막 webinarId 추적
  const supabase = createClientSupabase()
```

---

## 💡 예상되는 해결 효과

위 수정 사항을 적용하면:
1. ✅ 재연결 시도가 cleanup과 충돌하지 않음
2. ✅ 불필요한 채널 정리가 발생하지 않음
3. ✅ 메모리 누수 방지 (setTimeout cleanup)
4. ✅ 중복 구독 방지 (기존 채널 정리 개선)
5. ✅ 안정적인 Realtime 연결 유지

