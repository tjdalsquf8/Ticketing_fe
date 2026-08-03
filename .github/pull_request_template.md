<!--
  PR 제목 규칙 (Conventional Commits 준수)
    feat:     새 기능
    fix:      버그 수정
    refactor: 리팩토링 (기능 변경 없음)
    style:    UI/CSS 변경
    docs:     문서 변경
    chore:    빌드/설정/의존성
    security: 보안 개선
  예) feat(practice): 대기열 시뮬레이션 추가
-->

## 📝 요약
<!-- 이 PR이 무엇을 왜 하는지 1~3줄로 -->


## 🔧 변경 사항
<!-- 주요 변경을 불릿으로. 파일 경로 언급 시 file:line 형식 권장 -->
-
-

## 🏷️ 유형
<!-- 해당하는 항목에 [x] -->
- [ ] ✨ feat — 새 기능
- [ ] 🐛 fix — 버그 수정
- [ ] ♻️ refactor — 리팩토링
- [ ] 💄 style — UI/CSS
- [ ] 📝 docs — 문서
- [ ] 🔧 chore — 빌드/설정
- [ ] 🔒 security — 보안 개선

## 🔗 관련 이슈 / 문서
<!-- Closes #123, related to #45, security.md HIGH-02 등 -->
- 

## 🧪 테스트 방법
<!-- 리뷰어가 재현할 수 있게 단계별로 -->
1.
2.
3.

**기대 결과**: 

## 📸 스크린샷 / GIF (UI 변경 시)
<!-- Before / After 나란히 첨부 권장 -->


## ⚠️ 브레이킹 체인지
<!-- API 응답 스키마 변경, 환경변수 추가/삭제, DB 마이그레이션 등 -->
- [ ] 없음
- [ ] 있음 → 아래에 상세:



## ✅ 셀프 체크리스트

- [ ] **🔒 보안 검사 진행** — XSS/CSRF/입력값 검증/토큰 저장/CSP 등 `security.md` 원칙에 위배되지 않음
- [ ] **⚠️ 예외처리 확인** — Silent Failure 없음, 에러 시 사용자 피드백 존재, `try/catch` 적절히 배치
- [ ] **🔌 백엔드 연동 테스트** — API 요청/응답 브라우저 Network 탭에서 정상 확인, 401/500 등 실패 케이스도 확인
- [ ] **🖥️ 브라우저 동작 확인** — 골든 패스 + 엣지 케이스 직접 조작, 콘솔 에러/경고 없음
- [ ] **🧱 코드 품질** — `npx tsc --noEmit` + `npm run lint` 통과, 불필요한 `console.log` 제거

## 🗒️ 리뷰어에게 남기는 메모
<!-- 특별히 봐줬으면 하는 부분, 결정 근거, 트레이드오프 등 -->


---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
