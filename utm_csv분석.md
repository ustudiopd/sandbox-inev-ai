전체 요약


총 참여자 수: 536명


UTM 완전 미기재(- 또는 null): 약 34%


UTM 기반 유효 유입: 약 66%


→ 초반 수동/직접 유입이 꽤 있었고, 중반 이후부터 마케팅 추적이 정상 작동한 구조야.

1️⃣ UTM Source 기준 분석
UTM Source인원비율stibee30456.7%- (없음)18434.3%keywert193.5%heythere71.3%insight40.7%inblog20.4%insta10.2%
해석


Stibee 이메일이 절대적 메인 채널


keywert / heythere는 테스트·보조 채널 수준


SNS(insta)는 사실상 영향 없음



2️⃣ UTM Medium 기준 분석
UTM Medium인원비율crmemail28352.8%- (없음)18534.5%email213.9%banner(1월 웨비나)183.4%banner112.1%contents30.6%
해석


crmemail = Stibee 메인 발송 트랙


banner/contents는 보조 유입, 실전 전환은 약함


Medium이 섞여 있음 → 정규화 필요



3️⃣ UTM Campaign 기준 분석
UTM Campaign인원비율202602 웨비나 (메인)28753.5%- (없음)20337.9%202601 웨비나315.8%
해석


2월 웨비나 캠페인이 전환의 핵심


1월 캠페인은 잔존 리드 재활용 성격


캠페인 분리는 잘 됐음 👍



4️⃣ UTM Content
상태인원전부 -536
해석


콘텐츠/카피/버전별 비교 불가


다음 캠페인에서 반드시 써야 할 필드



핵심 인사이트 정리 (중요)
✅ 잘 된 점


Stibee → crmemail → 캠페인 구조 명확


메인 캠페인(202602)에 전환 집중


UTM Source / Medium / Campaign 최소 셋은 안정화됨


⚠️ 문제점


초기 34% UTM 유실


QR / 직접 접속 / 초반 링크 때문




Medium 값이 제각각


Content 미사용 → 실험 불가



다음 액션 제안 (실무용)
1️⃣ “UTM 없음”을 버리지 말고 분리
utm_source = direct
utm_medium = none
utm_campaign = pre_tracking

→ 초기 유입도 하나의 세그먼트로 인정

2️⃣ Stibee 표준안 (강력 추천)
utm_source=stibee
utm_medium=crm_email
utm_campaign=wert_ai_webinar_202602
utm_content=reminder_d1 | reminder_h3 | final_call


3️⃣ 대시보드용 분류 기준


채널 성과: Source × Medium


캠페인 성과: Campaign 단위


카피 테스트: Content (다음부터)



원하면 다음 단계로:


UTM × 직무/회사 타입 교차 분석


UTM 없는 그룹 vs 있는 그룹 행동 차이


Stibee 메일 회차별 전환률 가정 분석


EventFlow 통계 스키마에 UTM 집계 컬럼 설계


어디까지 갈지 말만 해줘.
이건 충분히 케이스 스터디급 데이터야 👌