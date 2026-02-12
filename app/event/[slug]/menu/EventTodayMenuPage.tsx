'use client'

import { useState } from 'react'
import Image from 'next/image'
import Event222152Header from '../components/Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

interface EventTodayMenuPageProps {
  event: {
    id: string
    code: string
    slug: string
  }
  pathSlug?: string
}

const buttonBase = {
  display: 'flex' as const,
  width: 710,
  padding: '19px 0',
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  borderTop: '2px solid #949494',
  borderBottom: '2px solid #949494',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 16,
  fontStyle: 'normal' as const,
  fontWeight: 500,
  lineHeight: '140%',
  letterSpacing: -0.32,
}

const LUNCH_MENU_ITEMS: { titleEn: string; titleKo: string }[] = [
  { titleEn: 'Japanese Cold Appetizer', titleKo: '일본식 전채' },
  { titleEn: 'Seasonal Fresh Fish Sashimi', titleKo: '계절 특선 생선회' },
  { titleEn: 'Seasonal Fresh Fruits & Japanese Dessert', titleKo: '신선한 계절과일과 일식 디저트' },
  { titleEn: 'Japanese Style Roasted Chicken & Egg Roll', titleKo: '일본식 닭다리구이와 계란말이' },
  { titleEn: 'Roasted Beef Chuck Flap Tail with Garlic', titleKo: '일본식 소고기 살치살구이와 마늘' },
  { titleEn: 'Broiled Mero Fish, Steamed Abalone & Roasted Shrimp', titleKo: '메로 유안야끼, 전복찜과 새우구이' },
  { titleEn: 'Steamed Rice with Roasted Eel & Clear Clam Soup', titleKo: '장어덮밥과 맑은 조갯국' },
]

const DINNER_MENU_ITEMS: { titleEn: string; titleKo: string }[] = [
  { titleEn: 'Norwegian Smoked Salmon with Condiment', titleKo: '노르웨이산 훈제 연어와 콘디 먼트' },
  { titleEn: 'Cuttlefish with Citron', titleKo: '감귤 유자 갑오징어 샐러드' },
  { titleEn: 'Red Crab Rillettes with Bell pepper, Lemon Cream', titleKo: '레몬 크림을 곁들인 게살 리에뜨' },
  { titleEn: 'Korean Style Beef Tartar', titleKo: '육회 쇠고기(호주산)' },
  { titleEn: 'Seasonal Sashimi', titleKo: '계절특선 생선회' },
  { titleEn: 'Selection of Sushi & Roll', titleKo: '모둠초밥과 롤 쌀(국내산)' },
  { titleEn: 'Namul & Kimchi', titleKo: '나물과 김치 김치(배추:국내산, 고춧가루:국내산)' },
  { titleEn: 'Fresh Mixed Salad with Dressing', titleKo: '양상추·로메인 샐러드와 드레싱' },
  { titleEn: 'Tomato Caprese Salad', titleKo: '이탈리아 카프리풍의 토마토와 모짜렐라 치즈 샐러드' },
  { titleEn: 'Marinated Asparagus Salad', titleKo: '아스파라거스 샐러드' },
  { titleEn: 'Fennel, Artichoke Salad & Parma Ham with Parmesan Cheese', titleKo: '파마산 치즈를 곁들인 파르마햄, 펜넬, 아티쵸크 샐러드' },
  { titleEn: 'Bacon & Avocado Salad with Blue Cheese', titleKo: '블루치즈를 곁들인 아보카도 샐러드' },
  { titleEn: 'Chicken & Eggplant Salad with Ricotta Cheese', titleKo: '리코타 치즈를 곁들인 치킨 샐러드 닭고기(국내산)' },
  { titleEn: 'Carving Station:\nRoasted Beef Rib with Red wine Sauce', titleKo: '레드와인 소스를 곁들인 쇠고기 등심구이 등심(쇠고기:미국산)' },
  { titleEn: 'Chef Special Soup', titleKo: '조리장 특선 스프' },
  { titleEn: 'Japanese Style Bean Paste Soup', titleKo: '조리장 추천 미소국' },
  { titleEn: 'Braised Herb Chicken with Tomato Sauce', titleKo: '토마토 소스를 곁들인 닭고기 스튜(닭고기: 브라질)' },
  { titleEn: 'Sweet and Sour Pork', titleKo: '탕수육 등심(돼지고기:국내산)' },
  { titleEn: 'Stir-Fried Seafood and Vegetables', titleKo: '전가복' },
  { titleEn: 'Broiled Beef Short Ribs/ Korean Style', titleKo: '한식 갈비구이 갈비(쇠고기:미국산)' },
  { titleEn: 'Deep Fried Shrimp with Lemon Mayonnaise Sauce', titleKo: '레몬 마요네이즈 소스를 곁들인 새우' },
  { titleEn: 'Rack of Lamb Provencal with Herb', titleKo: '허브를 곁들인 프로방스 풍의 양갈비구이 양갈비(호주산)' },
  { titleEn: 'Lasagna with Beef Ragu & Bechamel Sauce', titleKo: '소고기 라구와 베샤멜소스를 곁들인 라자냐' },
  { titleEn: 'Seared Salmon with BBQ Sauce', titleKo: '바베큐소스의 연어구이' },
  { titleEn: 'Steamed Grains Rice Wrapped in a Lotus Leaf', titleKo: '건강식 연잎잡곡밥 쌀(국내산)' },
  { titleEn: 'Tiramisu, Fruit Macaron, Apple Tartlet', titleKo: '티라미수, 과일 마카롱, 사과 타르렛' },
  { titleEn: 'Opera Cake, Cheese Cake', titleKo: '오페라 케이크, 치즈 케이크' },
  { titleEn: 'Walnut Chocolate Brownie', titleKo: '초코렛 브라우니' },
  { titleEn: 'Seasonal Fresh Fruits', titleKo: '신선한 계절 과일' },
  { titleEn: 'Freshly Baked Breads Butter', titleKo: '갓구운 빵과 버터' },
  { titleEn: 'Korean Traditional Drink', titleKo: '전통음료' },
  { titleEn: 'Freshly Brewed Coffee and Assortment of Gourmet Tea', titleKo: '커피와 따뜻한 차' },
]

export default function EventTodayMenuPage({ event, pathSlug }: EventTodayMenuPageProps) {
  const slug = pathSlug ?? event.slug
  const [selected, setSelected] = useState<'lunch' | 'dinner'>('lunch')

  return (
    <>
      <div className="sticky top-0 z-50 w-full bg-[#F9F9F9]">
        <Event222152Header slug={slug} variant="today-menu" />
      </div>
      <div className="w-full relative flex flex-col min-h-screen bg-[#F9F9F9] overflow-x-hidden">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
          <main className="w-full flex-1 flex flex-col items-center justify-center" style={{ marginTop: 30 }}>
          <div className="relative w-full max-w-[1420px] flex justify-center items-center rounded-2xl sm:rounded-[32px] overflow-hidden h-[270px] sm:h-[320px]">
            <Image
              src={getGcbioImageUrl('page6_session.png')}
              alt=""
              width={1420}
              height={320}
              className="w-full h-full object-cover object-center"
              unoptimized
            />
            <span
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-white font-semibold leading-[140%] text-2xl sm:text-3xl md:text-[44px] px-2"
              style={{
                fontFamily: 'Pretendard, sans-serif',
                fontStyle: 'normal',
                letterSpacing: -1.1,
              }}
            >
              오늘의 메뉴
            </span>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-2 sm:gap-0 w-full max-w-[1420px] px-4" style={{ marginTop: 80 }}>
            <button
              type="button"
              onClick={() => setSelected('lunch')}
              className="w-full sm:w-[355px] md:w-[710px] min-w-0 flex-1 sm:flex-none"
              style={{
                ...buttonBase,
                width: undefined,
                maxWidth: '100%',
                background: selected === 'lunch' ? '#111' : 'transparent',
                color: selected === 'lunch' ? '#FFF' : '#111',
              }}
            >
              중식 / Lunch
            </button>
            <button
              type="button"
              onClick={() => setSelected('dinner')}
              className="w-full sm:w-[355px] md:w-[710px] min-w-0 flex-1 sm:flex-none"
              style={{
                ...buttonBase,
                width: undefined,
                maxWidth: '100%',
                background: selected === 'dinner' ? '#111' : 'transparent',
                color: selected === 'dinner' ? '#FFF' : '#111',
              }}
            >
              석식 / Dinner
            </button>
          </div>
          {selected === 'lunch' && (
            <div
              className="flex flex-col items-center w-full max-w-full px-4"
              style={{ marginTop: 40 }}
            >
              <p
                className="text-[#111] text-center font-bold leading-[140%] text-xl sm:text-2xl md:text-[32px] break-words max-w-full"
                style={{ fontFamily: 'Pretendard, sans-serif', fontStyle: 'normal' }}
              >
                JAPANESE BENTO BOX
              </p>
              <div style={{ width: 1, height: 50, background: '#949494', marginTop: 40 }} />
              {LUNCH_MENU_ITEMS.map((item, i) => (
                <div
                  key={item.titleEn + i}
                  className="flex flex-col items-center w-full max-w-full px-2"
                  style={{ marginTop: 40 }}
                >
                  <p
                    className="text-[#949494] text-center font-semibold text-sm sm:text-base leading-[140%] whitespace-nowrap sm:whitespace-normal sm:break-words max-w-full"
                    style={{ fontFamily: 'Pretendard, sans-serif', fontStyle: 'normal' }}
                  >
                    {item.titleEn}
                  </p>
                  <p
                    className="text-[#949494] text-center font-medium text-sm sm:text-base leading-[140%] mt-1 whitespace-nowrap sm:whitespace-normal sm:break-words max-w-full"
                    style={{ fontFamily: 'Pretendard, sans-serif', fontStyle: 'normal' }}
                  >
                    {item.titleKo}
                  </p>
                </div>
              ))}
              <Image
                src={getGcbioImageUrl('page6_menu1.png')}
                alt=""
                width={1420}
                height={674}
                className="object-contain w-full max-w-full h-auto md:w-[1420px] md:h-[674px] md:max-w-[1420px]"
                style={{ marginTop: 106 }}
                unoptimized
              />
              <div style={{ height: 192 }} />
            </div>
          )}
          {selected === 'dinner' && (
            <div
              className="flex flex-col items-center w-full"
              style={{ marginTop: 40 }}
            >
              <div
                className="flex flex-col items-stretch w-full max-w-full px-4"
              >
                <p
                  className="block w-full text-[#111] text-center font-bold text-xl sm:text-2xl md:text-[32px] leading-[140%] break-words max-w-full"
                  style={{ fontFamily: 'Pretendard, sans-serif', fontStyle: 'normal' }}
                >
                  INTERNATIONAL BUFFET
                </p>
                <div className="self-center" style={{ width: 1, height: 50, background: '#949494', marginTop: 26 }} />
                {DINNER_MENU_ITEMS.map((item, i) => (
                  <div
                    key={item.titleEn + i}
                    className="flex flex-col items-stretch w-full max-w-full px-2"
                    style={{ marginTop: 26 }}
                  >
                    <p
                      className={`block w-full text-[#949494] text-center font-semibold text-sm sm:text-base leading-[140%] whitespace-nowrap max-w-full ${
                        item.titleEn.includes('\n') ? 'sm:whitespace-pre-line' : 'sm:whitespace-normal sm:break-words'
                      }`}
                      style={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontStyle: 'normal',
                      }}
                    >
                      {item.titleEn}
                    </p>
                    <p
                      className="block w-full text-[#949494] text-center font-medium text-sm sm:text-base leading-[140%] mt-1 whitespace-nowrap sm:whitespace-normal sm:break-words max-w-full"
                      style={{ fontFamily: 'Pretendard, sans-serif', fontStyle: 'normal' }}
                    >
                      {item.titleKo}
                    </p>
                  </div>
                ))}
              </div>
              <Image
                src={getGcbioImageUrl('page6_menu2.png')}
                alt=""
                width={1420}
                height={674}
                className="object-contain w-full max-w-full h-auto md:w-[1420px] md:h-[674px] md:max-w-[1420px]"
                style={{ marginTop: 192 }}
                unoptimized
              />
              <div style={{ height: 192 }} />
            </div>
          )}
        </main>
        </div>
      </div>
    </>
  )
}
