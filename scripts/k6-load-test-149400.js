/**
 * k6 부하 테스트 스크립트 - /149400 페이지
 * 
 * 사용법:
 *   k6 run scripts/k6-load-test-149400.js
 * 
 * 환경 변수:
 *   BASE_URL: 기본 URL (기본값: http://localhost:3000)
 *   CAMPAIGN_ID: 캠페인 ID (필수)
 *   USERS: 동시 사용자 수 (기본값: 100)
 *   DURATION: 테스트 지속 시간 (기본값: 60s)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 커스텀 메트릭
const surveySuccessRate = new Rate('survey_success');
const surveyDuration = new Trend('survey_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const CAMPAIGN_ID = __ENV.CAMPAIGN_ID || '';
const USER_COUNT = parseInt(__ENV.USERS || '100', 10);
const DURATION = __ENV.DURATION || '60s';

if (!CAMPAIGN_ID) {
  throw new Error('CAMPAIGN_ID 환경 변수가 필요합니다. 예: CAMPAIGN_ID=xxx k6 run scripts/k6-load-test-149400.js');
}

export const options = {
  stages: [
    // 단계별 부하 증가
    { duration: '10s', target: Math.floor(USER_COUNT * 0.1) },  // 10%까지 증가
    { duration: '20s', target: Math.floor(USER_COUNT * 0.5) }, // 50%까지 증가
    { duration: DURATION, target: USER_COUNT },                 // 목표 사용자 수 유지
    { duration: '10s', target: 0 },                            // 종료
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],      // 95% 요청이 3초 이내
    http_req_failed: ['rate<0.05'],        // 오류율 5% 미만
    survey_success: ['rate>0.95'],        // 설문 성공률 95% 이상
  },
};

// 랜덤 사용자 정보 생성
function generateUserData(vu) {
  const userNum = vu + Math.floor(Math.random() * 10000);
  return {
    name: `테스트사용자${userNum}`,
    company: `테스트회사${Math.floor(userNum / 100)}`,
    phone: `010${String(10000000 + userNum).slice(-8)}`,
    email: `test${userNum}@example.com`,
  };
}

export default function () {
  const userData = generateUserData(__VU); // VU = Virtual User ID
  
  // 1. 메인 페이지 접속
  const mainPageRes = http.get(`${BASE_URL}/event/149400`, {
    tags: { name: '메인페이지' },
  });
  
  const mainPageSuccess = check(mainPageRes, {
    '메인 페이지 로드 성공': (r) => r.status === 200,
    '응답 시간 < 2초': (r) => r.timings.duration < 2000,
  });
  
  if (!mainPageSuccess) {
    console.error(`[VU ${__VU}] 메인 페이지 로드 실패: ${mainPageRes.status}`);
  }
  
  sleep(1 + Math.random() * 2); // 1-3초 랜덤 대기
  
  // 2. 설문 제출
  const surveyPayload = JSON.stringify({
    name: userData.name,
    company: userData.company,
    phone: userData.phone,
    answers: [],
    consentData: {
      marketing: true,
      privacy: true,
    },
  });
  
  const surveyStartTime = Date.now();
  const surveyRes = http.post(
    `${BASE_URL}/api/public/event-survey/${CAMPAIGN_ID}/submit`,
    surveyPayload,
    {
      headers: { 
        'Content-Type': 'application/json',
      },
      tags: { name: '설문제출' },
    }
  );
  
  const surveyDurationMs = Date.now() - surveyStartTime;
  surveyDuration.add(surveyDurationMs);
  
  const surveySuccess = check(surveyRes, {
    '설문 제출 성공': (r) => r.status === 200 || r.status === 409, // 409는 이미 제출됨
    '응답 시간 < 3초': (r) => r.timings.duration < 3000,
  });
  
  surveySuccessRate.add(surveySuccess);
  
  if (!surveySuccess) {
    console.error(`[VU ${__VU}] 설문 제출 실패: ${surveyRes.status} - ${surveyRes.body}`);
  } else {
    try {
      const result = JSON.parse(surveyRes.body);
      if (result.survey_no) {
        console.log(`[VU ${__VU}] 설문 제출 성공: survey_no=${result.survey_no}`);
      }
    } catch (e) {
      // JSON 파싱 실패 무시
    }
  }
  
  sleep(2 + Math.random() * 3); // 2-5초 랜덤 대기
  
  // 3. (선택) 통계 페이지 확인
  if (Math.random() > 0.7) { // 30% 확률로만 실행
    const statsRes = http.get(
      `${BASE_URL}/api/event-survey/${CAMPAIGN_ID}/stats`,
      { tags: { name: '통계조회' } }
    );
    
    check(statsRes, {
      '통계 조회 성공': (r) => r.status === 200,
    });
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += `${indent}📊 테스트 결과 요약\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;
  
  // HTTP 요청 통계
  summary += `${indent}HTTP 요청:\n`;
  summary += `${indent}  총 요청 수: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  평균 응답 시간: ${(data.metrics.http_req_duration.values.avg / 1000).toFixed(2)}초\n`;
  summary += `${indent}  최대 응답 시간: ${(data.metrics.http_req_duration.values.max / 1000).toFixed(2)}초\n`;
  summary += `${indent}  오류율: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;
  
  // 설문 제출 통계
  if (data.metrics.survey_success) {
    summary += `${indent}설문 제출:\n`;
    summary += `${indent}  성공률: ${(data.metrics.survey_success.values.rate * 100).toFixed(2)}%\n`;
    if (data.metrics.survey_duration) {
      summary += `${indent}  평균 처리 시간: ${(data.metrics.survey_duration.values.avg / 1000).toFixed(2)}초\n`;
    }
  }
  
  summary += '\n';
  return summary;
}
