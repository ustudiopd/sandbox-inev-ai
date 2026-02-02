# ⚠️ 더미 데이터 생성 스크립트 주의사항

## 비활성화된 스크립트

다음 스크립트들은 더미 데이터를 생성하므로 **사용하지 마세요**:

- `force-recover-entries.disabled.ts` - 더미 데이터 생성
- `recover-from-access-logs.disabled.ts` - 더미 데이터 생성
- `clean-and-create-87.disabled.ts` - 더미 데이터 생성
- `create-87-conversions-clean.disabled.ts` - 더미 데이터 생성
- `fix-87-conversions-final.disabled.ts` - 더미 데이터 생성
- `fix-87-conversions-complete.disabled.ts` - 더미 데이터 생성
- `restore-87-conversions-final.disabled.ts` - 더미 데이터 생성
- `restore-87-conversions.disabled.ts` - 더미 데이터 생성

## 안전한 스크립트

다음 스크립트들은 더미 데이터를 생성하지 않습니다:

- `check-backup-restore-status.ts` - 데이터 확인만
- `find-real-data-in-all-entries.ts` - 데이터 확인만
- `check-all-entries.ts` - 데이터 확인만

## 원칙

**더미 데이터는 절대 생성하지 않습니다.**
- 실제 데이터만 사용
- 백업에서 복구
- 수동 입력만 허용
