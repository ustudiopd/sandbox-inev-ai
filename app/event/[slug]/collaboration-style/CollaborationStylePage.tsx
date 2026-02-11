'use client'

import Event222152Header from '../components/Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

interface CollaborationStylePageProps {
  event: {
    id: string
    code: string
    slug: string
  }
  /** URL 경로의 slug (헤더 링크가 현재 주소와 맞도록) */
  pathSlug?: string
}

export default function CollaborationStylePage({ event, pathSlug }: CollaborationStylePageProps) {
  const slug = pathSlug ?? event.slug

  return (
    <div className="w-full relative flex flex-col min-h-screen bg-[#F9F9F9] overflow-x-hidden">
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="collaboration-style" />

        <main className="w-full flex justify-center items-center box-border flex-1 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[250px] py-12 sm:py-24 md:py-[150px] pb-12 md:pb-[145px] overflow-x-hidden">
          <div className="flex items-center" style={{ gap: '77px', width: 'fit-content', maxWidth: '100%' }}>
            <div className="relative" style={{ flexShrink: 0 }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="119.5"
                height="60.256"
                viewBox="0 0 120 61"
                fill="none"
                className="absolute"
                style={{
                  left: '-40px',
                  top: '-173.256px',
                }}
                aria-hidden
              >
                <path d="M14.4778 46.4657C14.3965 46.7295 14.1166 46.8775 13.8527 46.7962C13.5888 46.7148 13.4408 46.435 13.5222 46.1711L14 46.3184L14.4778 46.4657ZM119.944 6.58843C120.071 6.83364 119.975 7.13537 119.73 7.26236L115.734 9.3317C115.489 9.45869 115.187 9.36284 115.06 9.11763C114.933 8.87242 115.029 8.57069 115.274 8.44371L118.826 6.60429L116.987 3.05231C116.86 2.8071 116.956 2.50537 117.201 2.37839C117.446 2.2514 117.748 2.34724 117.875 2.59246L119.944 6.58843ZM14 46.3184L13.5222 46.1711C16.9712 34.9829 26.419 19.5977 43.5629 9.7226C60.7244 -0.16259 85.54 -4.49355 119.651 6.34182L119.5 6.81836L119.349 7.2949C85.46 -3.46973 60.9422 0.865974 44.0621 10.5891C27.1643 20.3224 17.8622 35.4872 14.4778 46.4657L14 46.3184Z" fill="#111111"/>
                <path d="M14.1461 60.7555C21.9588 60.7555 28.2922 54.4303 28.2922 46.6278C28.2922 38.8252 21.9588 32.5 14.1461 32.5C6.33342 32.5 0 38.8252 0 46.6278C0 54.4303 6.33342 60.7555 14.1461 60.7555Z" fill="#F5D327"/>
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="109.292"
                height="105.756"
                viewBox="0 0 110 107"
                fill="none"
                className="absolute"
                style={{
                  left: '-340px',
                  top: '33px',
                }}
                aria-hidden
              >
                <path d="M95.6521 93.4309C95.8505 93.623 96.167 93.618 96.3591 93.4196C96.5513 93.2213 96.5462 92.9047 96.3479 92.7126L96 93.0718L95.6521 93.4309ZM0.492022 0.071841C0.215915 0.0762469 -0.00434232 0.303648 6.36578e-05 0.579755L0.071863 5.07918C0.076269 5.35529 0.30367 5.57555 0.579777 5.57114C0.855884 5.56673 1.07614 5.33933 1.07174 5.06323L1.00791 1.06374L5.0074 0.999914C5.28351 0.995508 5.50377 0.768107 5.49936 0.492C5.49496 0.215893 5.26756 -0.00436437 4.99145 4.1604e-05L0.492022 0.071841ZM96 93.0718L96.3479 92.7126L0.847867 0.212628L0.5 0.571777L0.152133 0.930927L95.6521 93.4309L96 93.0718Z" fill="#111111"/>
                <path d="M95.6461 106.327C103.459 106.327 109.792 100.002 109.792 92.1995C109.792 84.397 103.459 78.0718 95.6461 78.0718C87.8334 78.0718 81.5 84.397 81.5 92.1995C81.5 100.002 87.8334 106.327 95.6461 106.327Z" fill="#EC1F23"/>
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="129.292"
                height="138.837"
                viewBox="0 0 130 139"
                fill="none"
                className="absolute"
                style={{
                  left: '-174px',
                  top: '393px',
                }}
                aria-hidden
              >
                <path d="M115.5 13.5815C84.3333 15.9149 20.6 41.3815 15 124.582" stroke="#111111" strokeLinecap="round"/>
                <path d="M115.146 28.2555C122.959 28.2555 129.292 21.9303 129.292 14.1278C129.292 6.32521 122.959 0 115.146 0C107.333 0 101 6.32521 101 14.1278C101 21.9303 107.333 28.2555 115.146 28.2555Z" fill="#45B652"/>
                <path d="M14.1461 138.837C21.9588 138.837 28.2922 132.512 28.2922 124.709C28.2922 116.907 21.9588 110.582 14.1461 110.582C6.33342 110.582 0 116.907 0 124.709C0 132.512 6.33342 138.837 14.1461 138.837Z" fill="#006FB7"/>
              </svg>
              <div
                aria-hidden
                style={{
                  width: '278px',
                  height: '278px',
                  borderRadius: '197.5px',
                  background: `lightgray url(${getGcbioImageUrl('page2_photo2.png')}) -87.32px -0.334px / 151.381% 100.12% no-repeat`,
                }}
              />
            </div>
            <div className="relative flex flex-col justify-center items-start flex-1 min-w-0" style={{ width: '437px', maxWidth: '437px' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="131.292"
                height="134.256"
                viewBox="0 0 132 135"
                fill="none"
                className="absolute"
                style={{
                  left: '503px',
                  top: '-154.256px',
                }}
                aria-hidden
              >
                <path d="M14.5 120C47.6667 115.5 115.5 90.1 117.5 14.5" stroke="#111111" strokeLinecap="round"/>
                <path d="M14.1461 134.256C21.9588 134.256 28.2922 127.93 28.2922 120.128C28.2922 112.325 21.9588 106 14.1461 106C6.33343 106 0 112.325 0 120.128C0 127.93 6.33343 134.256 14.1461 134.256Z" fill="#EC1F23"/>
                <path d="M117.146 28.2555C124.959 28.2555 131.292 21.9303 131.292 14.1278C131.292 6.32521 124.959 0 117.146 0C109.333 0 103 6.32521 103 14.1278C103 21.9303 109.333 28.2555 117.146 28.2555Z" fill="#45B652"/>
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="120"
                height="68"
                viewBox="0 0 124 69"
                fill="none"
                className="absolute"
                style={{
                  left: '614px',
                  top: '265px',
                }}
                aria-hidden
              >
                <path d="M120.354 13.6464C120.158 13.4512 119.842 13.4512 119.646 13.6464L116.464 16.8284C116.269 17.0237 116.269 17.3403 116.464 17.5355C116.66 17.7308 116.976 17.7308 117.172 17.5355L120 14.7071L122.828 17.5355C123.024 17.7308 123.34 17.7308 123.536 17.5355C123.731 17.3403 123.731 17.0237 123.536 16.8284L120.354 13.6464ZM120 14L119.5 14C119.5 43.5561 95.9862 67.5 67 67.5L67 68L67 68.5C96.556 68.5 120.5 44.0907 120.5 14L120 14ZM67 68L67 67.5C38.0138 67.5 14.5 43.5561 14.5 14L14 14L13.5 14C13.5 44.0907 37.444 68.5 67 68.5L67 68Z" fill="#111111"/>
                <path d="M14.1461 28.2555C21.9588 28.2555 28.2922 21.9303 28.2922 14.1278C28.2922 6.32521 21.9588 0 14.1461 0C6.33343 0 0 6.32521 0 14.1278C0 21.9303 6.33343 28.2555 14.1461 28.2555Z" fill="#F5D327"/>
              </svg>
            <h1
              className="font-['Pretendard']"
              style={{
                color: '#111',
                textAlign: 'left',
                fontFamily: 'Pretendard',
                fontSize: '41px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '140%',
                letterSpacing: '-0.44px',
              }}
            >
              협업 스타일 진단
            </h1>
            <div
              aria-hidden
              style={{
                width: '437px',
                height: '1px',
                background: '#000',
                marginTop: '24px',
                marginBottom: '24px',
              }}
            />
            <p
              className="font-['Pretendard']"
              style={{
                color: '#111',
                textAlign: 'left',
                fontFamily: 'Pretendard',
                fontSize: '21px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '140%',
                letterSpacing: '-0.48px',
              }}
            >
              당신은 어떤 리더인가요? 지금 한번 알아볼까요?
            </p>
            <div className="relative" style={{ display: 'inline-block', marginTop: '40px' }}>
              <div
                style={{
                  display: 'flex',
                  width: '235px',
                  padding: '12px 39px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '25px',
                  borderRadius: '100px',
                  background: '#111',
                }}
              >
                <span
                  className="font-['Pretendard']"
                  style={{
                    color: '#FFF',
                    fontFamily: 'Pretendard',
                    fontSize: '24px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '140%',
                  }}
                >
                  Click
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="9"
                  height="18"
                  viewBox="0 0 11 19"
                  fill="none"
                  style={{ flexShrink: 0 }}
                  aria-hidden
                >
                  <path
                    d="M0.5 0.5L9.5 9.77835L0.5 18.5"
                    stroke="#FFF"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="109.792"
                height="78.959"
                viewBox="0 0 111 83"
                fill="none"
                className="absolute"
                style={{
                  left: '318px',
                  top: '250px',
                }}
                aria-hidden
              >
                <path d="M96.0107 68.4526C96.0675 68.7229 96.3326 68.8959 96.6028 68.8391C96.8731 68.7823 97.0461 68.5172 96.9893 68.247L96.5 68.3498L96.0107 68.4526ZM0.127825 3.51591C-0.0565802 3.72145 -0.0394412 4.03757 0.166106 4.22198L3.51568 7.22703C3.72123 7.41143 4.03735 7.39429 4.22175 7.18875C4.40616 6.9832 4.38902 6.66708 4.18347 6.48268L1.20607 3.81152L3.87723 0.834117C4.06163 0.62857 4.04449 0.312452 3.83894 0.128047C3.6334 -0.0563574 3.31728 -0.0392184 3.13287 0.166328L0.127825 3.51591ZM96.5 68.3498L96.9893 68.247C94.5541 56.6589 87.108 39.535 71.9235 25.7545C56.7252 11.9615 33.8015 1.54357 0.472931 3.35053L0.5 3.8498L0.527069 4.34907C33.5985 2.55604 56.2581 12.8881 71.2515 26.4951C86.2587 40.1146 93.6125 57.0407 96.0107 68.4526L96.5 68.3498Z" fill="#111111"/>
                <path d="M96.1461 82.6051C103.959 82.6051 110.292 76.2799 110.292 68.4774C110.292 60.6748 103.959 54.3496 96.1461 54.3496C88.3334 54.3496 82 60.6748 82 68.4774C82 76.2799 88.3334 82.6051 96.1461 82.6051Z" fill="#006FB7"/>
              </svg>
            </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
