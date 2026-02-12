export default function SessionGuideLoading() {
  return (
    <div className="w-full min-h-screen bg-[#F9F9F9] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#111] border-t-transparent rounded-full animate-spin" />
        <p className="font-['Pretendard'] text-sm text-[#111]">세션 안내 불러오는 중...</p>
      </div>
    </div>
  )
}
