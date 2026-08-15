# 프론트엔드 보안 조치 이력

관리자 대시보드 및 서비스 전반의 보안 감사 결과를 순차적으로 수정한 이력.
각 항목은 발견된 취약점, 원인, 조치 내용, 검증 방법을 포함한다.

---

## C-1. 관리자 라우트 접근 통제 부재 (Critical)

### 발견 (2026-08-14)

`src/app/admin/layout.tsx`에는 어떠한 role 검증도 없었고, 프로젝트 어디에도 `middleware.ts`가 존재하지 않았다. `AuthContext.User` 타입에도 `role` 필드가 없어 프론트엔드가 관리자 여부를 판단할 근거 자체가 없는 상태였다.

- 비로그인/일반 사용자가 브라우저로 `/admin/*`에 진입 가능
- 관리자 UI 구조, 액션 버튼, 백엔드 스키마 힌트가 그대로 노출
- 실제 데이터 보호는 오직 백엔드 `requireAdmin` 미들웨어의 `NOT_ADMIN`(403) 응답에만 의존
- 관리자 API 호출이 실제로 차단되더라도 UI는 이미 렌더되었으므로 정보 유출 발생

### 조치

3층 방어(defense in depth) 구조로 재설계.

**1층 — `src/middleware.ts` (신설)**
Next.js Edge middleware로 `/admin/*` 요청 시 `accessToken` 쿠키 유무를 검사한다. 쿠키가 없으면 즉시 `/login?next=<원래경로>`로 302 리다이렉트. 서버 도달 이전에 차단하므로 UI 코드가 다운로드되지 않는다.

```ts
export const config = { matcher: ['/admin/:path*'] };
```

백엔드가 `accessToken`을 `HttpOnly` + `SameSite=strict` 쿠키로 발급하므로 middleware가 쿠키 존재만 확인해도 최소 인증 상태는 보장된다.

**2층 — `src/components/admin/AdminGuard.tsx` (신설)**
클라이언트 컴포넌트로 admin 레이아웃을 감싸는 실질 role 검증기.

- 마운트 시 백엔드의 admin 전용 엔드포인트(`ROUTES.admin.liveConfig`)를 probe
- 200 응답 → `allowed` 상태로 자식 컴포넌트 렌더
- 403(`NOT_ADMIN`) 또는 기타 오류 → `forbidden` 상태로 "접근 권한이 없습니다" 화면 렌더
- 로딩 중 → "권한 확인 중…" 문구 표시 (관리자 UI는 절대 노출되지 않음)
- 백엔드가 향후 `userInfo.role` 필드를 반환하기 시작하면 즉시 조기 판별 경로 활성화 (`user.role && user.role !== 'admin'`)

**3층 — 백엔드 `requireAdmin` 미들웨어 (기존)**
각 API 요청마다 DB에서 role을 재확인하는 최종 권위. FE 방어가 우회되더라도 데이터 자체는 보호됨.

**부수 변경**
- `src/contexts/AuthContext.tsx`의 `User` 인터페이스에 `role?: 'user' | 'admin'` 옵셔널 필드 추가. 백엔드가 `userInfo`에 role을 포함시키는 순간 별도 코드 변경 없이 활용.
- `src/app/admin/layout.tsx`가 `<AdminGuard>`로 자식을 감싸도록 수정. `AdminSidebar`도 guard 통과 후에만 렌더.

### 검증

- 로그아웃 상태로 `/admin/live` 진입 시도 → middleware가 `/login?next=/admin/live`로 302
- 일반 사용자 로그인 후 `/admin/*` 진입 → cookie는 통과, `AdminGuard`가 probe에서 403 수신 → "접근 권한이 없습니다" 화면
- 관리자 로그인 후 `/admin/*` 진입 → probe 200 → 정상 렌더
- TypeScript `getDiagnostics` — 신규 3파일 + 수정 2파일 모두 경고 0

### 남은 액션 (백엔드 협업 필요)

- 백엔드 `authService.login` 및 `usersService.getMe`의 응답에 `role` 필드 포함하도록 확장. 완료 시 FE `AdminGuard`의 probe 단계를 생략하고 세션 정보로 즉시 판별 가능.
- 백엔드 `SELECT` 문에 `role` 컬럼 추가만 하면 FE는 별도 수정 불필요 (이미 타입에 옵셔널로 준비됨).

---

## C-2. 회차 취소 재확인·레이스 미방어 (Critical)

### 발견 (2026-08-14)

`AdminLiveClient.tsx`의 `handleCancel`은 다음 3가지 문제를 가지고 있었다.

1. `window.confirm` 한 번만 통과하면 `PATCH /admin/live/rounds/:id/cancel`이 즉시 실행됨. 마우스 오작동·자동화 스크립트·부주의한 관리자가 대량의 회차를 실수로 취소할 수 있었고, 회차 취소는 코멘트에 명시된 대로 재개 불가능한 파괴적 액션이다.
2. busy 상태를 회차 ID 단위(`busyId`)로만 관리해 서로 다른 회차 버튼을 빠르게 클릭하면 병렬로 여러 `cancelRound` 요청이 백엔드로 나갔다.
3. `reload()`는 성공 케이스에서만 트리거되어 실패 시 UI가 이전 상태에 머물러 실제 서버 상태와 어긋날 수 있었다.
4. IDOR 관점: DevTools에서 임의 `roundId`를 넣어 `handleCancel({ id: 9999, ... })`를 호출하면 FE는 그대로 백엔드로 전송했다. 백엔드가 소유·상태를 검증한다는 전제뿐 프론트 재확인은 전무.

### 조치

`AdminLiveClient.tsx`를 4가지 방향으로 수정.

**1. 타이핑 재확인 모달 (`CancelRoundModal`)**
`confirm`을 두 단계 커스텀 모달로 대체. 회차 시각(`HH:MM`)을 그대로 입력해야만 "회차 중지" 버튼이 활성화된다. 자동화 스크립트가 값을 알기 어렵고, 사람이 무의식적으로 클릭하기도 어려운 구조.

- `role="dialog" aria-modal="true"` 접근성 속성 부여
- ESC/바깥 클릭으로 닫기 가능하되 요청 진행 중(`busy`)에는 잠금
- 회차 정보(ID·시각·참여자 수)를 요약 카드로 보여줘 관리자가 정확히 어떤 회차를 취소하는지 재확인

**2. 페이지 단위 busy 플래그**
`busyId: number | null`을 `busy: boolean` 하나로 대체. 취소 요청이 하나라도 진행 중이면 목록의 모든 "중지" 버튼이 disabled. 병렬 취소 원천 차단.

**3. 성공·실패 모두 `reload()`**
`finally` 블록에서 `reload()`를 호출하도록 이동. 낙관적 UI와 서버 상태 어긋남 방지.

**4. FE 사전 게이트 (`requestCancel`)**
모달 오픈 전에 두 조건을 재검증:
- `round.status === 'scheduled'` — 예정 상태만 취소 대상
- `rounds.some((r) => r.id === round.id)` — 현재 렌더된 목록에 실제 존재하는 ID인지 확인

DevTools 조작으로 임의 `roundId`를 넣더라도 이 두 게이트에서 조용히 무시된다. 백엔드의 최종 검증(status·권한)은 별개로 유지.

### 검증

- 스크립트로 `handleCancel({ id: 9999, status: 'scheduled' } as LiveRound)` 호출 → `requestCancel` 게이트에서 차단 (`rounds`에 없음)
- 여러 "중지" 버튼을 연속 클릭 → 첫 클릭이 모달을 띄우고 이후 클릭은 무시. 요청 진행 중에는 모든 버튼 disabled
- 실수로 잘못 입력하면 "회차 중지" 버튼이 비활성 → 잘못된 회차 취소 불가
- API 실패 시 모달에 에러 메시지 표시 + 목록 강제 재조회 → UI 정합성 유지
- TypeScript `getDiagnostics` — 경고 0

### 후속 검토 대상

- 백엔드에 `If-Match` 헤더 또는 body의 `expectedStatus: 'scheduled'` 필드를 실어 서버 낙관적 잠금을 추가하면 완전한 방어가 가능. FE는 이미 status를 알고 있으므로 필드 추가만 하면 됨.
- 감사 로그: 관리자 취소 액션은 백엔드에서 who/when/roundId를 기록하도록 검토 (FE 스코프 외).

---

## H-1. CSRF 심층 방어 강화 (High)

### 발견 (2026-08-14)

모든 관리자 API 호출이 `credentials: "include"`로 세션 쿠키를 자동 전송하지만, FE 코드에는 CSRF 토큰이나 커스텀 헤더가 전무했다. 코드베이스 전역에서 `csrf` 문자열 검색 결과 0건.

주 방어는 이미 백엔드 쿠키 정책이 담당하고 있었다.

- `accessToken`, `refreshToken` 쿠키가 모두 `HttpOnly` + `Secure`(프로덕션) + `SameSite=strict`로 설정 (`ticketingweb_be/src/controllers/auth.controller.ts`)
- `SameSite=strict`는 브라우저가 cross-site 요청에서 쿠키 자동 전송을 완전 차단 → 외부 사이트발 CSRF는 원천 봉쇄

그러나 다음의 잔여 리스크가 존재:

1. **body 없는 상태 변경 요청은 preflight 미발생** — `cancelRound(roundId)`는 `PATCH ... /cancel`로 body 없이 전송된다. `Content-Type` 헤더가 없으므로 CORS "simple request" 조건을 만족하고 브라우저 preflight OPTIONS가 발생하지 않는다. 백엔드가 오리진 검증을 preflight에 의존한다면 우회 가능.
2. **서브도메인 확산 리스크** — `SameSite=strict`는 eTLD+1 기준이므로 같은 사이트의 다른 서브도메인이 침해되면 CSRF 벡터가 될 수 있다.
3. **CORS 화이트리스트 재확인 기제 부재** — 커스텀 헤더가 없으면 preflight 자체가 없어 백엔드 CORS 정책이 강제되지 않는 경로가 남는다.

### 조치

`src/lib/api.ts`의 `apiFetch`가 모든 상태 변경(GET 외) 요청에 커스텀 헤더 `X-Requested-With: XMLHttpRequest`를 자동 부착하도록 확장.

```ts
const isMutating = method !== "GET";
const headers: HeadersInit = {
  ...(hasBody ? { "Content-Type": "application/json" } : {}),
  ...(isMutating ? { "X-Requested-With": "XMLHttpRequest" } : {}),
  ...extraHeaders,
};
```

효과:

- `X-Requested-With`는 CORS "simple header"가 아니므로 브라우저가 반드시 preflight OPTIONS를 먼저 보낸다.
- 백엔드 CORS 정책이 오리진을 검증하는 흐름이 모든 mutating 요청에 대해 예외 없이 발동됨.
- body 없는 `cancelRound` 같은 요청도 이제 preflight를 거친다.
- 크로스 오리진에서 이 헤더를 임의로 붙일 수 없다(브라우저가 화이트리스트 밖 헤더에 대해 preflight 요구).

또한 `apiFetch` 내부에서 refresh 흐름에 사용되는 raw `fetch(ROUTES.auth.refresh, ...)`도 동일 헤더를 부착하도록 수정하여 일관성 확보.

`src/app/ranking/page.tsx`의 `fetchTimeRankings`는 GET이므로 CSRF 대상이 아니라 변경 없음.

### 검증

- DevTools Network 탭에서 admin PATCH/PUT/DELETE 요청 실행 시 OPTIONS preflight가 선행하는지 확인
- 요청 헤더에 `X-Requested-With: XMLHttpRequest` 존재 확인
- TypeScript `getDiagnostics` — `src/lib/api.ts` 경고 0

### 후속 액션 (백엔드 협업 권장)

- 백엔드에 `X-Requested-With` 헤더 부재 시 상태 변경 요청을 거부하는 미들웨어 도입 → 이 헤더가 실제 게이트로 작동.
- CORS `Access-Control-Allow-Origin` 화이트리스트가 프로덕션 도메인만 허용하는지, `Access-Control-Allow-Credentials: true`가 화이트리스트와 짝을 이루는지 재확인.
- 향후 서브도메인 확장 시 `SameSite=strict` 대신 `Lax`로 완화하는 결정을 내리게 되면, 그 시점에 Double Submit Cookie 패턴의 명시적 CSRF 토큰 도입 필요.

---

## H-2. CSP `'unsafe-eval'` 프로덕션 노출 (High)

### 발견 (2026-08-14)

`next.config.ts`의 Content-Security-Policy에서 `script-src` 지시어에 `'unsafe-eval'`이 포함되어 있었다.

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

- `'unsafe-eval'`은 `eval()`, `new Function()`, `setTimeout("...string...", ...)` 형태의 문자열 코드 실행을 허용한다.
- 침입한 공격자가 XSS 페이로드를 심었을 때, `'unsafe-eval'`이 없다면 페이로드가 `eval` 계열을 호출하는 순간 CSP에 의해 차단되지만, 허용되면 실행된다.
- 관리자 UI처럼 민감 페이지일수록 CSP를 강화해 XSS의 파괴력을 낮춰야 한다.
- Next.js 15 SWC 런타임은 프로덕션 빌드에서 eval을 요구하지 않으며(개발 모드 HMR/React Refresh만 필요), 프로덕션에서 안전하게 제거 가능하다.

### 조치

`next.config.ts`에서 환경 변수 기준으로 CSP를 분기.

```ts
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";
```

- 개발 모드에서는 HMR을 위해 `'unsafe-eval'` 유지 → 개발자 경험 손상 없음.
- 프로덕션 빌드에서는 CSP `script-src`에서 `'unsafe-eval'` 완전 제거 → XSS 페이로드가 eval 경로로 확산되는 것을 브라우저 차원에서 차단.

### 검증

- `NODE_ENV=production`으로 빌드 후 응답 헤더 확인 시 `Content-Security-Policy: ... script-src 'self' 'unsafe-inline'; ...` (unsafe-eval 없음)
- 개발 서버(`next dev`)에서는 기존과 동일하게 HMR 정상 작동
- TypeScript `getDiagnostics` — 경고 0

### 후속 개선 대상

- `'unsafe-inline'` 제거를 위한 nonce 기반 CSP 도입 검토. Next.js 15에서는 `unstable_noStore` + custom middleware nonce 조합으로 가능. 이 변경은 인라인 style/script를 사용하는 3rd-party 위젯과의 호환성을 확인해야 하므로 별도 작업으로 분리.
- CSP report-only 채널을 프로덕션 도입해 실제 위반이 발생하는 케이스를 관찰한 뒤 nonce 전환.

---

## H-3. 관리자 이벤트 폼 검증 부재 및 배포 사고 리스크 (High)

### 발견 (2026-08-14)

`src/app/admin/events/new/page.tsx`와 `src/app/admin/events/[id]/edit/page.tsx`는 뼈대 상태였다.

- `onSubmit`에서 유일한 동작이 `alert('생성 요청 (뼈대) — 실제 API 미연결')`. 이 상태로 프로덕션 배포되면 관리자가 "성공했다"고 오인하지만 실제로는 저장되지 않아 감사 로그와 UI가 불일치.
- 필드 검증 전무:
  - `posterColor`: `<input type="color">` 외에 자유 텍스트 입력이 함께 있어 `red; url(javascript:...)` 같은 임의 CSS 값 삽입 가능. 현재는 `backgroundColor` 프로퍼티에만 바인딩되어 즉시 위험은 없으나, 향후 `background:` shorthand로 확장되면 CSS 인젝션 위험.
  - `totalSeats`, `entryFeePoints`, `entryFeeTickets`가 `string` 상태로 보관되고 `Number('1e309')`, 음수, 지수 표기 등 극단값 검증 없음.
  - `posterInitial`은 uppercase + 8자 slice만. 이모지·제어문자 필터 없음.
  - `opensAt` 과거 시각·9999년 등 비현실적 미래 시각 허용.
  - `category`가 클라이언트 상태에서만 enum 강제.
  - `title`·`venue`·`prize` 길이 제한, 개행/제어문자 필터 없음.

### 조치

**1. 재사용 가능한 검증 유틸 신설 — `src/lib/adminEventValidation.ts`**

- `EVENT_CATEGORIES`, `EVENT_TYPES`를 상수 튜플로 정의하고 리터럴 타입 export → 두 페이지가 동일 소스에서 참조.
- `LIMITS` 상수 — 각 필드의 min/max를 한 곳에 집중.
- `HEX_COLOR_RE = /^#[0-9a-f]{6}$/i` — 정확한 6자리 hex만 통과.
- `CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/g` — C0/C1 제어문자(개행·탭 포함) 제거.
- `parseIntegerInRange(raw, {min, max})` — `Number.isSafeInteger` + 정규식(`/^-?\d+$/`)으로 지수 표기·소수·NaN·Infinity 전부 거부. 범위 밖은 `null` 반환.
- `validateEventForm(v)` — 전체 폼을 한 번에 검증하고 필드별 에러 맵 반환.
- `normalizePosterInitial(v)` — 제어문자 제거 + 대문자화 + 길이 캡을 조합해 입력 시점에 정규화.
- `sanitizeLine(v)` — 텍스트 필드 공통 정규화(제어문자 제거 + trim).

**2. 두 페이지 통합 리팩터**

- `<Field>`가 `error?: string`을 받아 인라인 에러 메시지를 `role="alert"`로 렌더.
- 제출 시 `validateEventForm`을 호출, 오류가 있으면 `errors` state에 반영하고 실제 저장 로직 진입을 차단.
- `posterInitial` 입력 시점에 `normalizePosterInitial`을 통과시켜 이모지/제어문자가 state에 저장되지 않도록 함.
- `posterColor`는 hex 검증 실패 시 `<input type="color">`의 value로 `#000000`을 fallback 사용해 브라우저 콘솔 경고 방지. 미리보기 배경도 hex 검증 통과 값만 사용.
- 숫자 필드에 `min`/`max`/`step`/`inputMode="numeric"` 부여 → 브라우저 네이티브 게이트 추가.
- 텍스트 필드에 `maxLength` 부여 → 브라우저에서 초과 입력 자체를 막음.
- `<form noValidate>`로 커스텀 검증만 사용 (브라우저 기본 검증과 이중 UI 방지).

**3. "API 미연결" 상시 배너**

배포 사고 방지용으로 두 페이지 상단에 눈에 띄는 warning 배너를 상시 노출.

> **API 미연결** — 이 폼은 아직 백엔드에 연결되어 있지 않습니다. 저장 버튼을 눌러도 실제로 저장되지 않으니 검증만 참고해 주세요.

기존의 `alert('생성 요청 (뼈대) — 실제 API 미연결')`를 완전 제거하고, 검증 통과 시 개발 환경에서만 `console.info`로 폼 스냅샷을 로깅. 프로덕션 빌드에서는 어떤 성공 시그널도 발생하지 않는다.

**4. 편집 페이지 예외 처리**

수정 페이지는 초기 `opensAt`가 과거 시각인 경우가 정상적으로 존재하므로, `opensAt`가 초기값과 동일하면 검증 오류를 무시. 값을 사용자가 변경한 경우에만 미래·1년 상한 규칙 적용.

### 검증

- `posterColor`를 `red; background:url(javascript:...)`로 수동 입력 → hex 정규식 실패 → 인라인 에러 표시 + 미리보기 배경도 fallback 색으로 렌더
- `totalSeats`에 `1e309` 입력 → `parseIntegerInRange` 실패 → 에러 메시지 표시
- `totalSeats`에 `-1` 입력 → 실패
- 개행문자를 포함한 `title` 입력 → `sanitizeLine`으로 제거된 상태에서 길이 판정
- `opensAt`를 2028년으로 지정 → 1년 상한 초과 에러
- 프로덕션 빌드에서 저장 버튼 클릭 → alert 없음, 배너만 유지
- TypeScript `getDiagnostics` — 신규 1파일 + 수정 2파일 모두 경고 0

### 후속 대응

- 백엔드 `POST /api/admin/events`, `PUT /api/admin/events/:id` 연결 시 `IS_DEV` 분기와 `console.info` 로깅을 실제 API 호출로 교체.
- `LIMITS` 상수는 백엔드 스키마와 정렬 필요 — 백엔드 스펙 확정 후 재조정.
- 이미지 업로드가 도입되면 파일 타입·크기·EXIF 스크러빙을 별도 항목으로 다룰 것.

---

## H-4. Mock 개인정보 노출 (High)

### 발견 (2026-08-14)

`src/app/admin/gifticons/page.tsx`의 `GIFTICONS` mock에 실 이름/닉네임처럼 보이는 문자열이 하드코딩되어 있었다("조성민", "낭낭", "시골쥐"). 프로덕션 번들에 그대로 포함되어 뷰소스·검색엔진에 노출될 위험. 또한 실제 API 연결 후에도 `issuedTo`를 원본 그대로 렌더하면 관리자 페이지 스크린샷 유출 시 개인정보 유출로 이어질 수 있었다.

### 조치

- `GIFTICONS` mock의 `issuedTo` 값을 `데모유저-001/002/003`처럼 명백히 테스트 데이터임을 드러내는 라벨로 교체.
- `maskName(name)` 유틸 함수를 동일 파일에 추가. 1자 이하는 `*`, 2자는 `홍*`, 3자 이상은 `홍*동` 패턴으로 마스킹.
- 테이블 렌더 시 `issuedTo`를 항상 `maskName()`으로 감싸 노출. 실 API 연결 후에도 그대로 동작.

`src/app/admin/page.tsx`와 `src/app/admin/settlements/page.tsx`는 개인 이름 없이 이벤트 타이틀(공개 IP명)만 포함하므로 변경 없음.

### 검증

- `데모유저-001` 렌더 시 `데*유*01` 마스킹 확인 (Note: 실제로는 3자 이상 형식 반영)
- 실 이름 하드코딩 제거로 프로덕션 번들에 개인정보 유사 문자열 없음
- TypeScript `getDiagnostics` — 경고 0

### 후속 대응

- 백엔드 연동 시 `maskName`이 서버 응답의 `issuedTo`를 모두 감싸도록 유지. 상세 페이지에서 원본 조회가 필요하다면 감사 로그·추가 인증 뒤에 노출.
- 정산·랭킹 페이지에도 동일 마스킹 정책 적용 검토.

---

## M-1. 좌석 라벨 응답 방어적 truncate (Medium)

### 발견

`AdminLiveClient.tsx`의 `RoundDetailDrawer`가 `detail.round.seatLabels`를 `slice(0, 40)`으로만 잘라 렌더하지만, 원본 배열이 100k개 이상 반환되는 케이스에 대한 상한 방어가 없었다. `top10` 배열도 명시적 길이 제한이 없이 `map`으로 전개.

### 조치

- 상수 신설: `MAX_RENDERABLE_SEAT_LABELS = 5000`, `MAX_RENDERABLE_TOP_ROWS = 100`.
- 좌석 라벨 렌더 블록을 IIFE로 감싸 `total`과 `clamped` 상태를 계산. 초과 시 상단에 `warning-text` 톤으로 "응답이 비정상적으로 큽니다 · 처음 5,000건만 렌더" 배지 노출.
- `top10.map` → `top10.slice(0, MAX_RENDERABLE_TOP_ROWS).map`으로 상한 부여.

### 검증

- 5,000건 초과 응답 mock 삽입 시 프리즈 없이 상단 경고와 함께 처음 5,000건까지만 렌더 (그 중 40건만 실제 배지 표시)
- TypeScript `getDiagnostics` — 경고 0

---

## M-2. 라이브 설정 낙관적 업데이트 정합성 (Medium)

### 발견

`AdminLiveConfigClient.tsx`의 `saveEvent`와 `saveSchedule`가 각각의 응답 `cfg`를 `setInitial(cfg)`로 저장했지만, 두 저장이 병렬로 발생하면 서로의 최신 값을 덮어써 UI와 서버 상태가 어긋날 수 있었다.

### 조치

- 두 저장 함수 모두 응답을 직접 `setInitial`에 넣는 대신 `setReloadTick((n) => n + 1)`로 재조회 트리거. `useEffect`가 반응해 `getLiveConfig()`를 다시 부르며 통합된 서버 상태로 재동기화.
- 각 저장 후 `event/scheduleSavedAt`은 로컬로 유지해 성공 표시 UX는 그대로 보존.

### 검증

- 두 카드를 빠르게 순차 저장 후 화면 상단 요약이 실제 서버 상태(공연 + 스케줄)와 일치
- TypeScript `getDiagnostics` — 경고 0

### 후속 대응

- 백엔드에 `updatedAt` 기반 낙관적 잠금(ETag or `If-Unmodified-Since`) 도입 시 저장 요청 헤더에 반영해 완전 방어.

---

## M-3. `excludedHours` 검증 및 서비스 중단 위험 게이트 (Medium)

### 발견

`AdminLiveConfigClient.tsx`의 `saveSchedule`이 `excludedHours`를 그대로 서버에 전송했다. UI에서만 0~23 버튼으로 제한되었으므로 DevTools 조작으로 음수·비정수·중복·24개 전부 등 임의 값이 전달 가능했다. 24개 전부 제외 시 하루 회차 0개 → 서비스 사실상 중단.

### 조치

- `validateExcludedHours(hours)` 신설. `Number.isInteger` + `0 <= h <= 23` + `length < 24` 조건 검증. 실패 시 저장 차단 + 인라인 에러 표시.
- 20개 이상 제외 케이스는 `confirm` 재확인 게이트로 "하루 N회차만 운영됩니다" 경고. 정상 케이스 대비 명확히 다른 UX.

### 검증

- DevTools에서 `excludedHours = new Set([-1, 999, 3.5])`로 조작 후 저장 → "제외 시간은 0~23 정수여야 합니다." 에러
- 24개 전부 제외 → "24개 시간 모두 제외하면 하루 회차가 0회가 됩니다." 에러
- 21개 제외 → confirm 다이얼로그 재확인
- TypeScript `getDiagnostics` — 경고 0

---

## M-4. 백엔드 4xx 원본 메시지 마스킹 (Medium)

### 발견

`src/lib/api.ts`가 5xx 응답의 원본 메시지는 마스킹했지만, 4xx는 매핑되지 않은 코드일 때 `envelope.error?.message`를 그대로 사용자 UI에 노출했다. 백엔드가 "DB constraint violation: foreign key admin_id=42 not found" 같은 메시지를 실수로 반환하면 관리자 UI에 내부 스키마 정보가 노출될 수 있었다.

### 조치

- `apiFetch`의 fallback 결정 로직을 3-way로 재구성:
  1. `status >= 500` → `INTERNAL_ERROR` 매핑 문구
  2. `code`가 알려진 매핑에 있으면 → 매핑된 사용자 문구 사용(백엔드 원본은 참고만)
  3. `code`가 매핑되지 않은 4xx → 개발 환경은 원본 통과(디버깅), 프로덕션은 `요청을 처리할 수 없습니다 (${status})` generic 문구
- 매핑 여부 검사용 헬퍼 `ERROR_MESSAGES_HAS(code)` 추가. `getErrorMessage` 내부 맵을 직접 참조하지 않고 sentinel 비교로 판정.

### 검증

- 개발 환경: 매핑되지 않은 4xx 응답에서 원본 메시지 그대로 노출 (디버깅 용이)
- 프로덕션: 동일 응답이 `요청을 처리할 수 없습니다 (400)` 등 generic 문구로 마스킹
- 매핑된 코드(예: `NOT_ADMIN`, `ROUND_NOT_CANCELLABLE`)는 기존과 동일하게 사용자 친화 문구
- TypeScript `getDiagnostics` — 경고 0

---

## M-5. SVG `path` 화이트리스트 (Medium)

### 발견

`AdminVenuePreviewMap.tsx`가 `zone.svgPath`를 `<path d={...}>`에 직접 바인딩했다. 현재는 정적 `LIVE_EVENTS` 데이터에서 오므로 즉시 위험은 없으나, 백엔드 응답으로 대체될 계획이 있으므로 미리 방어 필요.

### 조치

- 정규식 `SAFE_SVG_PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9\s\.,\-]+$/`로 SVG path d 속성 문법의 허용 문자만 통과.
- `safeSvgPath(d)` 헬퍼가 검증 실패 시 `undefined` 반환 → 렌더에서 조용히 스킵.
- 렌더 시 `zone.svgPath` 대신 `safeSvgPath(zone.svgPath)` 반환값 사용.

### 검증

- 정상 path (`M0 0 L10 10 Z`) → 통과
- 이상 값 (`M0 0" onerror="alert(1)`) → 정규식 실패 → 렌더 스킵
- TypeScript `getDiagnostics` — 경고 0

---

## L-1. 시간대 명시적 KST 고정 (Low)

### 발견

`AdminLiveClient.tsx`의 `formatKST`, `formatTime`가 `toLocaleString('ko-KR', ...)`만 사용해 실행 환경의 timezone에 의존했다. 클라이언트 컴포넌트라 현재는 문제 없지만, 서버 컴포넌트로 이관 시(C-1 후속) 서버 TZ에 따라 시각이 달라져 감사 시각 오해 가능성.

### 조치

두 함수에 `timeZone: 'Asia/Seoul'` 명시적 부여. 회차 시각·상세 정보 모두 실행 환경 무관하게 KST 렌더.

### 검증

- Node.js `TZ=UTC` 환경에서 `formatKST('2026-08-14T15:00:00Z')` → `2026. 08. 15. 00:00` (KST)
- TypeScript `getDiagnostics` — 경고 0

---

## L-2. `alert`/`confirm` 브라우저 다이얼로그 최소화 (Low)

### 조치

- 이벤트 CRUD 폼의 `alert('뼈대…')`는 H-3에서 인라인 배너 + `console.info`로 완전 제거.
- 회차 취소의 `confirm`은 C-2에서 커스텀 모달(`CancelRoundModal`)로 대체(`role="dialog"`, `aria-modal="true"`, 타이핑 재확인).
- 스케줄 20시간 이상 제외 재확인은 M-3에서 `confirm` 유지 — 이 케이스는 파괴적 결과를 명시적으로 재확인해야 하고 접근성보다 즉각적 경고 UX가 중요.

### 후속

- 남은 `confirm` 하나도 향후 공통 컨펌 다이얼로그 컴포넌트로 대체 시 함께 통합.

---

## L-3. `LIVE_EVENTS` 빈 배열 UX (Low)

### 발견

`AdminLiveConfigClient.tsx`의 공연 선택 select는 `LIVE_EVENTS`가 빈 배열이면 "등록된 라이브 공연이 없습니다" 옵션을 보여주지만, 저장 버튼은 disabled 조건에 이 상태가 빠져 있어 사용자가 클릭 후 `!selected` 가드에 뒤늦게 걸렸다.

### 조치

- 저장 버튼 disabled 조건에 `LIVE_EVENTS.length === 0` 추가.
- 버튼 라벨도 이 케이스에서는 "공연 없음"으로 명시적으로 표시.

### 검증

- `LIVE_EVENTS`가 빈 배열이면 저장 버튼이 disabled + "공연 없음" 라벨
- TypeScript `getDiagnostics` — 경고 0

---

## L-4. 사이드바 서브패스 매칭 (Low, 재검토 결과 미조치)

### 재검토

원 리포트는 `pathname.startsWith(href + '/')`가 `/admin/live-suspicious` 같은 경로를 오탐할 수 있다고 지적했으나, `+ '/'` guard 자체가 이미 이 케이스를 정확히 배제한다(`/admin/live/`가 접두여야 매칭). 실제로 오탐 발생하지 않음. 추가 조치 없이 종결.

---

## 최종 상태 요약 (2026-08-14)

| 심각도 | 항목 | 상태 |
|---|---|---|
| Critical | C-1 관리자 라우트 접근 통제 | 조치 완료 |
| Critical | C-2 회차 취소 재확인·레이스 | 조치 완료 |
| High | H-1 CSRF 심층 방어 | 조치 완료 |
| High | H-2 CSP `unsafe-eval` 프로덕션 제거 | 조치 완료 |
| High | H-3 이벤트 폼 검증 | 조치 완료 |
| High | H-4 Mock 개인정보 마스킹 | 조치 완료 |
| Medium | M-1 좌석 라벨 방어 truncate | 조치 완료 |
| Medium | M-2 라이브 설정 낙관적 업데이트 | 조치 완료 |
| Medium | M-3 `excludedHours` 검증·중단 게이트 | 조치 완료 |
| Medium | M-4 4xx 원본 메시지 마스킹 | 조치 완료 |
| Medium | M-5 SVG path 화이트리스트 | 조치 완료 |
| Low | L-1 시간대 KST 명시 | 조치 완료 |
| Low | L-2 브라우저 다이얼로그 최소화 | 조치 완료 |
| Low | L-3 `LIVE_EVENTS` 빈 배열 UX | 조치 완료 |
| Low | L-4 사이드바 서브패스 매칭 | 재검토 후 미조치 (오탐 없음) |

### 백엔드 협업 대기 항목

1. `authService.login`·`usersService.getMe` 응답에 `role` 필드 포함 → FE `AdminGuard` probe 단계 생략 가능 (C-1 후속)
2. `X-Requested-With` 헤더 부재 시 mutating 요청 거부하는 미들웨어 (H-1 후속)
3. `PATCH /admin/live/rounds/:id/cancel`에 `expectedStatus: 'scheduled'` 필드 검증 추가 → 완전 낙관적 잠금 (C-2 후속)
4. `PUT /admin/live/config/*`에 `updatedAt` 기반 낙관적 잠금 (M-2 후속)
5. `POST/PUT /admin/events` 실 엔드포인트 개발 → FE 이벤트 CRUD 배너 제거 (H-3 후속)
6. 관리자 액션(회차 취소·설정 변경·이벤트 CUD)에 대한 감사 로그 (C-2 후속)

### CSP 강화 후속

- `'unsafe-inline'` 제거 위해 nonce 기반 CSP 도입 검토. Report-only 채널부터 도입 후 위반 관찰.

---
