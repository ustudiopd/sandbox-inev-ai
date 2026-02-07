const fs = require('fs');
const path = require('path');

// JSON 데이터 파일 읽기
const dataFile = 'C:\\Users\\User\\.cursor\\projects\\d-vibecoding-uslab-EventLive\\agent-tools\\e723a684-5283-4af3-923c-1084ca512e05.txt';
const data = fs.readFileSync(dataFile, 'utf8');

// JSON 배열 추출 (이스케이프된 JSON 문자열 처리)
let jsonStr = data;
// 이스케이프된 따옴표와 줄바꿈 처리
jsonStr = jsonStr.replace(/\\n/g, '');
jsonStr = jsonStr.replace(/\\"/g, '"');
const jsonMatch = jsonStr.match(/\[.*\]/s);
if (!jsonMatch) {
  console.error('JSON 데이터를 찾을 수 없습니다.');
  process.exit(1);
}

let users;
try {
  users = JSON.parse(jsonMatch[0]);
} catch (e) {
  // 이스케이프된 JSON 문자열인 경우 다시 파싱
  const unescaped = jsonMatch[0].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  users = JSON.parse(unescaped);
}
console.log(`총 ${users.length}명의 사용자 데이터를 찾았습니다.`);

// CSV 이스케이프 함수
const escapeCsv = (str) => {
  if (!str) return '';
  const strValue = String(str);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
};

// CSV 생성
const csvHeader = '고유값,이메일,이름';
const csvRows = users.map(u => 
  `${escapeCsv(u.고유값)},${escapeCsv(u.이메일)},${escapeCsv(u.이름)}`
);
const csvContent = csvHeader + '\n' + csvRows.join('\n');

// 파일 저장
const outputDir = path.join(process.cwd(), 'exports');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const filename = 'webinar-149402-access-20260206-13-16.csv';
const filepath = path.join(outputDir, filename);

// BOM 추가하여 저장 (엑셀 한글 깨짐 방지)
fs.writeFileSync(filepath, '\uFEFF' + csvContent, 'utf8');

console.log('=== CSV 파일 생성 완료 ===');
console.log(`파일 경로: ${filepath}`);
console.log(`총 ${users.length}명의 사용자 정보가 저장되었습니다.`);
