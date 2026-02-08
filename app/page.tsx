import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, BarChart3, MessageSquare, Settings2, Shield, Users, Building2 } from "lucide-react";
import DashboardButton from "./components/DashboardButton";

export default async function Home() {
  const supabase = await createServerSupabase();

  // 로그인한 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 1. Hero Section: 메인 캐치프레이즈 */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-200 dark:ring-blue-800 bg-blue-50 dark:bg-blue-900/30 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 mr-2"></span>
            Inev.ai
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6 break-keep">
            B2B 이벤트 관리, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              AI로 스마트하게
            </span>{" "}
            하세요
          </h1>
          
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 break-keep">
            복잡한 웨비나 운영부터 실시간 데이터 분석까지.<br/>
            Inev.ai로 모든 이벤트 경험을 혁신하세요.
          </p>

          <div className="flex justify-center gap-4">
            {user ? (
              <DashboardButton />
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-8 py-3.5 rounded-lg bg-blue-600 dark:bg-blue-500 text-white font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/50 flex items-center"
                >
                  시작하기 <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
                <Link
                  href="/admin"
                  className="px-8 py-3.5 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  관리자 접속
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 2. Features: 핵심 기능 소개 */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">AI 데이터 분석</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                참여자의 행동 데이터를 AI가 분석하여 리포트를 제공합니다. 
                의사결정에 필요한 핵심 인사이트를 놓치지 마세요.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">실시간 인터랙션</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                끊김 없는 채팅, Q&A, 그리고 실시간 설문까지. 
                참여자와 진행자 간의 거리를 좁히는 몰입형 경험을 제공합니다.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center mb-6 text-teal-600 dark:text-teal-400">
                <Settings2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">스마트 운영 콘솔</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                복잡한 설정 없이 직관적인 대시보드에서 모든 이벤트를 관리하세요.
                초대부터 사후 관리까지 간편해집니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. B2B 플랫폼 안내 섹션 */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">B2B 관리 플랫폼</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Inev.ai는 기업을 위한 전용 이벤트 관리 플랫폼입니다.<br/>
              로그인하여 대시보드에서 이벤트를 생성하고 관리하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* 안내 카드 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 rounded-2xl border border-blue-100 dark:border-blue-800">
              <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center mb-6 text-white">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">기업 전용 플랫폼</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                기업 고객을 위한 전용 관리 시스템으로 안전하고 체계적인 이벤트 운영이 가능합니다.
              </p>
            </div>

            {/* 안내 카드 2 */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-8 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center mb-6 text-white">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">다중 워크스페이스</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                에이전시와 클라이언트 구조를 지원하여 여러 조직의 이벤트를 효율적으로 관리할 수 있습니다.
              </p>
            </div>

            {/* 안내 카드 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-8 rounded-2xl border border-purple-100 dark:border-purple-800">
              <div className="w-12 h-12 bg-purple-600 dark:bg-purple-500 rounded-lg flex items-center justify-center mb-6 text-white">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">보안 및 권한 관리</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                세밀한 권한 제어와 보안 기능으로 안전한 이벤트 관리 환경을 제공합니다.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            {user ? (
              <DashboardButton />
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center px-8 py-3.5 rounded-lg bg-blue-600 dark:bg-blue-500 text-white font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/50"
              >
                로그인하여 시작하기 <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

