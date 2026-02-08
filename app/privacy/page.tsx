import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* 헤더 */}
        <div className="mb-12">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            ← 홈으로 돌아가기
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">개인정보처리방침</h1>
          <p className="text-gray-700 leading-relaxed mb-4">
            주식회사 유스튜디오(이하 "회사")는 Inev.ai 서비스(이하 "서비스")를 제공함에 있어 「개인정보 보호법」, 
            「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하고 
            권익을 보장하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
            <ul className="text-sm text-gray-700 space-y-1">
              <li><strong>서비스명:</strong> Inev.ai</li>
              <li><strong>운영사:</strong> 주식회사 유스튜디오 (U-STUDIO CO., LTD.)</li>
              <li><strong>시행일:</strong> 2025년 1월 27일</li>
              <li><strong>버전:</strong> Privacy Policy v1.0</li>
              <li><strong>문의:</strong> <a href="mailto:privacy@eventflow.kr" className="text-blue-600 hover:text-blue-700">privacy@eventflow.kr</a></li>
            </ul>
          </div>
        </div>

        {/* 본문 */}
        <div className="prose prose-lg max-w-none">
          {/* 1. 개인정보의 처리 목적 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. 개인정보의 처리 목적</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              회사는 다음의 목적을 위하여 최소한의 개인정보를 수집·이용하며, 수집한 개인정보는 해당 목적 이외의 용도로 이용되지 않습니다.
            </p>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>웨비나·이벤트·설문조사 등록 및 참여자 관리</li>
              <li>실시간 상호작용 기능 제공 (채팅, Q&A, 설문, 퀴즈 등)</li>
              <li>설문조사 응답 수집 및 통계 분석, 결과 리포트 제공</li>
              <li>고객 문의, 운영 지원, 기술 지원 등 고객 서비스 제공</li>
              <li>서비스 이용 통계 분석 및 품질 개선(개인 식별 불가 형태로 가공)</li>
              <li>보안, 부정 이용 방지, 서비스 안정성 확보</li>
            </ol>
          </section>

          {/* 2. 처리하는 개인정보의 항목 및 수집 방법 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. 처리하는 개인정보의 항목 및 수집 방법</h2>
            
            <div className="space-y-6 text-gray-700">
              <div>
                <h3 className="text-xl font-semibold mb-3">2.1 수집하는 개인정보 항목</h3>
                <p className="mb-3">회사는 서비스 이용 과정에서 다음과 같은 개인정보를 수집할 수 있습니다.</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li><strong>회원가입 및 계정 관리:</strong> 이메일, 이름, 비밀번호(암호화 저장), 소속 조직 정보</li>
                  <li><strong>웨비나·이벤트·설문 등록:</strong> 이메일, 이름, 회사명, 직급, 연락처(선택)</li>
                  <li><strong>실시간 상호작용:</strong> 채팅 메시지, 질문 내용, 설문·퀴즈 응답 내용</li>
                  <li><strong>고객 문의:</strong> 이메일, 이름(선택), 문의 내용</li>
                  <li><strong>자동 수집 정보:</strong> 접속 로그, IP 주소, 기기 정보, 쿠키</li>
                </ul>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-gray-700">
                    ※ 게스트 참여가 허용된 경우, 일부 개인정보 없이도 서비스 이용이 가능하나 기능이 제한될 수 있습니다.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">2.2 개인정보 수집 방법</h3>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>이용자가 회원가입, 등록, 설문, 문의 과정에서 직접 입력</li>
                  <li>서비스 이용 과정에서 자동 생성</li>
                  <li>서비스 운영 과정에서 관리자가 생성·관리</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. 개인정보의 보유 및 이용기간 및 귀속 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. 개인정보의 보유 및 이용기간 및 귀속</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                본 서비스는 에이전시 및 클라이언트를 위한 이벤트 운영 플랫폼입니다. 이에 따라 <strong>이벤트(웨비나·설문 등) 등록 시 수집되는 개인정보의 1차적 귀속 및 관리 책임은 해당 이벤트를 주최·운영하는 클라이언트에게 있습니다.</strong>
              </p>
              <p className="leading-relaxed">
                회사는 플랫폼 제공자로서 다음의 원칙에 따라 개인정보를 처리합니다.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>이벤트 등록 시 수집된 개인정보는 해당 이벤트를 생성·운영한 <strong>클라이언트에게 전달 및 귀속</strong>됩니다.</li>
                <li>클라이언트는 관련 법령에 따라 해당 개인정보를 자체 목적(이벤트 운영, 사후 안내, 통계 등)으로 처리할 책임을 집니다.</li>
                <li>회사는 플랫폼 운영 및 기술 지원 목적 범위 내에서만 해당 개인정보를 처리하며, <strong>일정 기간 보관 후 지체 없이 파기</strong>합니다.</li>
              </ul>
              
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-3">보유 기간 기준</h3>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li><strong>회원 계정 정보(플랫폼 운영):</strong> 회원 탈퇴 시까지</li>
                  <li><strong>웨비나·이벤트·설문 등록 정보:</strong> 해당 이벤트 종료 후 <strong>최대 1년 이내</strong></li>
                  <li><strong>설문 응답 데이터:</strong> 분석 및 리포트 제공 목적 달성 후 <strong>최대 1년 이내</strong></li>
                  <li><strong>고객 문의 및 지원 이력:</strong> 문의 처리 완료 후 1년</li>
                  <li><strong>통계·분석 데이터:</strong> 개인을 식별할 수 없도록 익명화된 형태로 장기 보관 가능</li>
                </ul>
                <p className="mt-4 text-gray-600">
                  회사는 보유기간이 경과하거나 처리 목적이 달성된 개인정보에 대하여 지체 없이 파기합니다.
                </p>
              </div>
            </div>
          </section>

          {/* 4. 개인정보의 제3자 제공 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. 개인정보의 제3자 제공</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="leading-relaxed">
                  다만, 본 서비스의 구조상 <strong>이벤트(웨비나·설문 등) 등록을 통해 수집된 개인정보는 해당 이벤트를 주최·운영하는 클라이언트에게 제공(귀속)됩니다.</strong> 이는 이벤트 운영을 위한 필수적인 제공으로서, 별도의 제3자 제공 동의 없이 이루어질 수 있습니다.
                </p>
              </div>
              <p className="leading-relaxed mt-4">
                그 외의 경우에는 다음에 해당하는 경우에만 개인정보를 제공합니다.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>이용자가 사전에 동의한 경우</li>
                <li>법령에 따라 제공이 요구되는 경우</li>
              </ul>
            </div>
          </section>

          {/* 5. 개인정보 처리의 위탁 및 국외 이전 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. 개인정보 처리의 위탁 및 국외 이전</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              회사는 원활한 서비스 제공을 위하여 개인정보 처리 업무의 일부를 외부 전문업체에 위탁할 수 있으며, 이 경우 관련 법령에 따라 관리·감독을 수행합니다.
            </p>
            
            <div>
              <h3 className="text-xl font-semibold mb-3">5.1 개인정보 처리 위탁 현황</h3>
              <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                <li>데이터베이스 및 인프라 운영: Supabase</li>
                <li>웹 호스팅 및 배포: Vercel</li>
              </ul>
              <p className="text-sm text-gray-600 mt-4">
                ※ 서비스 특성상 일부 데이터는 국외 서버에 저장·처리될 수 있으며, 이 경우 관련 법령에서 요구하는 사항을 준수합니다.
              </p>
            </div>
          </section>

          {/* 6. 개인정보의 파기 절차 및 방법 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. 개인정보의 파기 절차 및 방법</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              회사는 개인정보 보유기간의 경과 또는 처리 목적 달성 시 지체 없이 해당 개인정보를 파기합니다.
            </p>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-xl font-semibold mb-2">파기 절차</h3>
                <p>파기 대상 선정 → 내부 승인 → 파기 수행</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">파기 방법</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>전자적 파일: 복구 불가능한 방법으로 영구 삭제</li>
                  <li>데이터베이스: 삭제 쿼리 실행 및 백업 데이터 정리</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 7. 정보주체의 권리 및 행사 방법 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. 정보주체의 권리 및 행사 방법</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              이용자는 언제든지 자신의 개인정보에 대해 다음과 같은 권리를 행사할 수 있습니다.
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정·삭제 요구</li>
              <li>개인정보 처리정지 요구</li>
              <li>개인정보 수집·이용 동의 철회</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              권리 행사는 이메일(<a href="mailto:privacy@eventflow.kr" className="text-blue-600 hover:text-blue-700">privacy@eventflow.kr</a>)을 통해 요청할 수 있으며, 회사는 관련 법령에 따라 지체 없이 조치합니다.
            </p>
          </section>

          {/* 8. 개인정보의 안전성 확보조치 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. 개인정보의 안전성 확보조치</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              회사는 개인정보의 안전한 처리를 위하여 다음과 같은 기술적·관리적·물리적 조치를 시행하고 있습니다.
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
              <li>전송 구간 암호화(HTTPS/TLS)</li>
              <li>접근 권한 최소화 및 역할 기반 접근 통제</li>
              <li>개인정보 처리 시스템 접근 기록 관리</li>
              <li>내부 보안 정책 수립 및 정기 점검</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-700">
                또한, Inev.ai 서비스를 운영하는 <strong>주식회사 유스튜디오(U-STUDIO CO., LTD.)</strong>는 국제 정보보호 관리체계 표준인 
                <strong> ISO/IEC 27001:2022(정보보안경영시스템)</strong> 인증을 취득하여 정보보호 관리체계를 기반으로 서비스 운영 및 개인정보 보호 조치를 수행하고 있습니다.
              </p>
            </div>
          </section>

          {/* 9. 개인정보 보호책임자 및 문의처 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. 개인정보 보호책임자 및 문의처</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-3 text-gray-700">
              <div>
                <h3 className="font-semibold mb-1">개인정보 보호책임자</h3>
                <p className="text-sm">[성명]</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">담당 부서</h3>
                <p className="text-sm">[부서명]</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">이메일</h3>
                <p className="text-sm">
                  <a href="mailto:privacy@eventflow.kr" className="text-blue-600 hover:text-blue-700">privacy@eventflow.kr</a>
                </p>
              </div>
            </div>
          </section>

          {/* 10. 개인정보처리방침의 변경 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. 개인정보처리방침의 변경</h2>
            <p className="text-gray-700 leading-relaxed">
              본 개인정보처리방침은 법령, 정책 또는 서비스 변경에 따라 수정될 수 있으며, 변경 사항은 서비스 내 공지 또는 웹사이트를 통해 안내합니다.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
              <ul className="text-sm text-gray-700 space-y-1">
                <li><strong>공고일자:</strong> 2025년 12월 1일</li>
                <li><strong>시행일자:</strong> 2025년 12월 1일</li>
              </ul>
            </div>
          </section>
        </div>

        {/* 하단 링크 */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
