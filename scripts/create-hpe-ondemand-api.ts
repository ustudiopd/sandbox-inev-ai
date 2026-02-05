/**
 * HPE Webinar Series 온디맨드 생성 스크립트 (API 사용)
 * 
 * 사용법:
 * npx tsx scripts/create-hpe-ondemand-api.ts
 */

// API를 직접 호출하는 대신, 브라우저에서 생성 페이지를 사용하거나
// 아래 데이터를 사용해서 수동으로 생성할 수 있습니다.

const ondemandData = {
  clientId: 'b621c16a-ec75-4256-a65d-b722a13d865c',
  title: 'HPE Webinar Series',
  projectName: 'HPE Webinar Series',
  description: 'HPE Networking On-demand 시리즈',
  isPublic: true,
  accessPolicy: 'auth',
  sessions: [
    {
      session_key: 'platform_ai_native_networking',
      title: 'AI 네이티브 네트워킹 플랫폼이란 무엇인가',
      category_label: 'Platform',
      provider: 'youtube',
      asset_id: '', // TODO: 실제 YouTube 영상 ID 입력 필요
      order: 1,
      description: '',
    },
    {
      session_key: 'datacenter_ai_high_performance',
      title: 'AI 워크로드를 위한 고성능 네트워크 구축 방안',
      category_label: 'Data Center',
      provider: 'youtube',
      asset_id: '', // TODO: 실제 YouTube 영상 ID 입력 필요
      order: 2,
      description: '',
    },
    {
      session_key: 'campus_aruba_smart_experience',
      title: "'보이지 않는 연결, 보이는 경험' Aruba UXI와 첨단 기술로 전세계 최초로 완성한 Smart Experience",
      category_label: 'Campus & Branch',
      product_label: 'HPE Aruba Networking',
      provider: 'youtube',
      asset_id: '', // TODO: 실제 YouTube 영상 ID 입력 필요
      order: 3,
      description: "네트워크의 품질은 이제 단순히 '연결'이 아니라 '경험'으로 평가됩니다. HPE Aruba Networking 세션에서는 Aruba User Experience Insight(UXI) 를 통해 실제 사용자의 체감 품질을 실시간으로 가시화하고, 문제를 선제적으로 감지·해결하는 사례와 전세계 최초 HPE Aruba 솔루션으로 이룬HIMSS Stage7취득 & 802.11mc/802.11az 고정밀 위치기반 서비스를 소개합니다.",
    },
    {
      session_key: 'campus_juniper_fullstack_network',
      title: '클라이언트부터 클라우드까지, 최상의 경험을 제공하는 풀스택 네트워크의 구현',
      category_label: 'Campus & Branch',
      product_label: 'HPE Juniper Networking',
      provider: 'youtube',
      asset_id: '', // TODO: 실제 YouTube 영상 ID 입력 필요
      order: 4,
      description: '',
    },
  ],
}

console.log('온디맨드 생성 데이터:')
console.log(JSON.stringify(ondemandData, null, 2))
console.log('\n이 데이터를 사용해서 브라우저에서 온디맨드 생성 페이지로 가서 생성하거나,')
console.log('API를 직접 호출할 수 있습니다.')
