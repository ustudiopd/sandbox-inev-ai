export default async function WebinarLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // 모든 웨비나 입장 페이지에 흰 배경 기본 적용 (플래시 방지)
  // 149404는 WERT 스타일이지만, 다른 웨비나도 초기 로딩 시 파란 배경 플래시 방지
  const isWertPage = id === '149404' || String(id) === '149404'
  
  return (
    <>
      {/* SSR에서 즉시 흰 배경을 덮는 래퍼 - 모든 웨비나 입장 페이지에 적용 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#fff',
          background: '#fff',
          zIndex: -1,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
      {/* 메인 컨텐츠 래퍼 - 흰 배경 적용 (모든 웨비나 입장 페이지) */}
      <div
        className="bg-white min-h-screen"
        style={{
          backgroundColor: '#fff',
          background: '#fff',
          position: 'relative',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {children}
      </div>
    </>
  )
}
