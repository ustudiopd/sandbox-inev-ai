import requests
from bs4 import BeautifulSoup
import os
from urllib.parse import urljoin, urlparse
import json
from pathlib import Path

def download_image(url, save_path):
    """이미지를 다운로드하는 함수"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        with open(save_path, 'wb') as f:
            f.write(response.content)
        return True
    except Exception as e:
        print(f"이미지 다운로드 실패 {url}: {e}")
        return False

def get_filename_from_url(url):
    """URL에서 파일명 추출"""
    parsed = urlparse(url)
    filename = os.path.basename(parsed.path)
    if not filename or '.' not in filename:
        # 파일명이 없거나 확장자가 없으면 해시 기반으로 생성
        import hashlib
        hash_name = hashlib.md5(url.encode()).hexdigest()[:8]
        # Content-Type에서 확장자 추출 시도
        if 'image' in parsed.path.lower():
            ext = '.jpg'  # 기본값
            if '.png' in parsed.path.lower():
                ext = '.png'
            elif '.gif' in parsed.path.lower():
                ext = '.gif'
            elif '.svg' in parsed.path.lower():
                ext = '.svg'
            filename = f"{hash_name}{ext}"
        else:
            filename = f"{hash_name}.jpg"
    return filename

def crawl_onepredict():
    url = "https://ko.onepredict.ai/"
    base_dir = Path("img/onepredict")
    base_dir.mkdir(parents=True, exist_ok=True)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    print(f"페이지 로딩 중: {url}")
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    
    # HTML 저장
    html_path = base_dir / "page.html"
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(response.text)
    print(f"HTML 저장 완료: {html_path}")
    
    # HTML 파싱
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # 모든 이미지 태그 찾기
    images = soup.find_all('img')
    image_urls = set()
    
    for img in images:
        src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
        if src:
            full_url = urljoin(url, src)
            image_urls.add(full_url)
    
    # CSS에서 배경 이미지 찾기
    style_tags = soup.find_all('style')
    for style in style_tags:
        if style.string:
            import re
            bg_urls = re.findall(r'url\(["\']?([^"\']+)["\']?\)', style.string)
            for bg_url in bg_urls:
                full_url = urljoin(url, bg_url)
                if any(ext in bg_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']):
                    image_urls.add(full_url)
    
    # 인라인 스타일에서 배경 이미지 찾기
    elements_with_bg = soup.find_all(style=lambda value: value and 'background-image' in value)
    for el in elements_with_bg:
        style = el.get('style', '')
        import re
        bg_urls = re.findall(r'url\(["\']?([^"\']+)["\']?\)', style)
        for bg_url in bg_urls:
            full_url = urljoin(url, bg_url)
            if any(ext in bg_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']):
                image_urls.add(full_url)
    
    # 네트워크 요청에서 확인한 이미지 URL들 추가
    known_image_urls = [
        "https://ko.onepredict.ai/common/img/default_profile.png",
        "https://ko.onepredict.ai/common/img/flag_shapes/flag_kr_circle.png",
        "https://ko.onepredict.ai/common/img/flag_shapes/flag_kr_square.png",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/be6b22396f779.png",
        "https://cdn.imweb.me/thumbnail/20260123/e32e491137684.png",
        "https://cdn.imweb.me/thumbnail/20250715/dd0d5e742a59f.jpg",
        "https://cdn.imweb.me/thumbnail/20250115/0538e75061f1d.png",
        "https://cdn.imweb.me/thumbnail/20250124/b61a266595422.png",
        "https://cdn.imweb.me/thumbnail/20250124/a34ce61945496.png",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/c36ed110c5d35.jpg",
        "https://cdn.imweb.me/thumbnail/20250627/cdb3cd1f5ffa5.jpg",
        "https://cdn.imweb.me/thumbnail/20250627/eb7797b84a393.jpg",
        "https://cdn.imweb.me/thumbnail/20250627/da68b494081c5.jpg",
        "https://cdn.imweb.me/thumbnail/20250802/911161378c676.jpg",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/4a69957f2f9f2.jpg",
        "https://cdn.imweb.me/thumbnail/20250122/bbe699e34f6c5.jpg",
        "https://cdn.imweb.me/thumbnail/20250226/c131189dac0d5.jpg",
        "https://cdn.imweb.me/thumbnail/20250226/fd95719dde7a4.jpg",
        "https://cdn.imweb.me/thumbnail/20250109/5186a3971d52c.jpg",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/64b9ffdd5119a.png",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/b6bf63ce5fe9e.png",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/bf74e770cc76e.png",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/1085b7cd55eb4.png",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/f5c61ac49da5b.png",
        "https://cdn.imweb.me/thumbnail/20230111/ff80bc593f4b9.png",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/60b4459fdefcb.png",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/aec1d617891b5.png",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/b33f15ba1c2f6.png",
        "https://cdn.imweb.me/upload/S2020020378cd5597b10bf/b66a386bf4bc0.png",
        "https://cdn.imweb.me/thumbnail/20250715/1968d57c82740.jpg",
        "https://cdn.imweb.me/thumbnail/20250715/b9cfdcaf94e4c.png",
        "https://cdn.imweb.me/thumbnail/20250715/0bb9131f50393.png",
        "https://cdn.imweb.me/thumbnail/20251211/73d16f8a098e9.png",
        "https://cdn.imweb.me/thumbnail/20251211/dbcc9520b8f68.png",
        "https://cdn.imweb.me/thumbnail/20251022/6fb024da02921.png",
        "https://cdn.imweb.me/thumbnail/20251015/fb0be79a9dfc8.jpg",
        "https://cdn.imweb.me/thumbnail/20250915/1140f6834e239.png",
        "https://cdn.imweb.me/thumbnail/20250618/783fb1338716b.jpg",
        "https://cdn.imweb.me/thumbnail/20211101/6391fea9247d4.png",
    ]
    
    for img_url in known_image_urls:
        image_urls.add(img_url)
    
    # 이미지 다운로드
    print(f"\n총 {len(image_urls)}개의 이미지 URL 발견")
    
    image_info = []
    downloaded = 0
    
    for idx, img_url in enumerate(sorted(image_urls), 1):
        filename = get_filename_from_url(img_url)
        save_path = base_dir / filename
        
        # 중복 파일명 처리
        if save_path.exists():
            base_name, ext = os.path.splitext(filename)
            counter = 1
            while save_path.exists():
                new_filename = f"{base_name}_{counter}{ext}"
                save_path = base_dir / new_filename
                counter += 1
        
        print(f"[{idx}/{len(image_urls)}] 다운로드 중: {filename}")
        if download_image(img_url, str(save_path)):
            downloaded += 1
            image_info.append({
                'url': img_url,
                'filename': save_path.name,
                'path': str(save_path)
            })
    
    # 이미지 정보를 JSON으로 저장
    info_path = base_dir / "images_info.json"
    with open(info_path, 'w', encoding='utf-8') as f:
        json.dump({
            'page_url': url,
            'page_title': soup.title.string if soup.title else '',
            'total_images': len(image_urls),
            'downloaded': downloaded,
            'images': image_info
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n완료!")
    print(f"- HTML 저장: {html_path}")
    print(f"- 이미지 다운로드: {downloaded}/{len(image_urls)}")
    print(f"- 이미지 정보: {info_path}")
    
    # 페이지 구조 요약 저장
    structure = {
        'title': soup.title.string if soup.title else '',
        'meta_description': '',
        'headings': [],
        'links': [],
        'sections': []
    }
    
    # 메타 설명
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    if meta_desc:
        structure['meta_description'] = meta_desc.get('content', '')
    
    # 헤딩 태그들
    for level in range(1, 7):
        headings = soup.find_all(f'h{level}')
        for h in headings:
            structure['headings'].append({
                'level': level,
                'text': h.get_text(strip=True)
            })
    
    # 주요 링크들
    links = soup.find_all('a', href=True)
    for link in links[:50]:  # 처음 50개만
        structure['links'].append({
            'text': link.get_text(strip=True),
            'href': link['href']
        })
    
    # 구조 정보 저장
    structure_path = base_dir / "page_structure.json"
    with open(structure_path, 'w', encoding='utf-8') as f:
        json.dump(structure, f, ensure_ascii=False, indent=2)
    
    print(f"- 페이지 구조: {structure_path}")

if __name__ == "__main__":
    crawl_onepredict()
