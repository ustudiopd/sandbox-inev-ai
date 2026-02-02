import { Suspense } from "react";
import { WebinarFormWertPageContent } from "./WebinarFormWertPageContent";

// 동적 렌더링 강제 (useSearchParams 사용으로 인한 정적 생성 방지)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

export default function WebinarFormWertPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4da8da] mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <WebinarFormWertPageContent />
    </Suspense>
  )
}
