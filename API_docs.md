# TICKET RUSH API Docs

- **Base URL**: `http://localhost:3001/api` (모든 엔드포인트에 `/api` 접두어)
- **Content-Type**: 모든 쓰기 요청(POST/PUT/PATCH/DELETE)은 **반드시** `Content-Type: application/json`
- **인증 방식**: **HttpOnly Cookie 자동 전송** (Authorization 헤더 사용 안 함)
- **fetch 옵션**: 모든 요청에 `credentials: "include"` 필수 (쿠키 자동 첨부)

---

## 공통

### 응답 포맷

**성공**
```json
{ "success": true, "data": { } }
```

**실패**
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "에러 메시지" } }
```

모든 에러는 이 형식으로 통일됨 (`AppError` + 중앙 errorHandler 경유).

### 인증

기존 `Authorization: Bearer` 방식 제거. 로그인 성공 시 백엔드가 다음 쿠키를 자동 발급:

| 쿠키 | 옵션 | 용도 | 만료 |
|---|---|---|---|
| `accessToken` | HttpOnly, Secure, SameSite=Strict | API 인증 | 1시간 |
| `refreshToken` | HttpOnly, Secure, SameSite=Strict | 토큰 갱신용 | 7일 |

프론트에서 별도 저장·헤더 조립 불필요. `fetch(..., { credentials: "include" })`만 있으면 됨.

### CORS

- Origin 화이트리스트: `http://localhost:3000` (로컬 개발용)
- 프로덕션 배포 시 백엔드 환경변수 `CORS_ORIGINS`에 프론트 도메인 지정 필요
- `credentials: true` — 쿠키 자동 전송 지원

### Rate Limiting

| 엔드포인트 | 창(window) | 최대 |
|---|---|---|
| `POST /auth/login` | 15분 | 5회 |
| `POST /auth/register` | 1시간 | 5회 |
| `POST /auth/refresh` | 15분 | 20회 |
| **모든 API 전역** | 1분 | 100회 |

초과 시 `429` + `TOO_MANY_*` 코드 반환. 응답 헤더 `RateLimit-*`로 남은 횟수 확인 가능.

### 비로그인 게스트 인증 (⚠️ 방식 변경됨)

> **더 이상 `X-Guest-UUID` 헤더를 프론트에서 조립하지 않습니다.**
> **더 이상 프론트에서 `crypto.randomUUID()`로 UUID를 생성하지 않습니다.**
> **더 이상 localStorage에 `guest_uuid`를 저장하지 않습니다.**

백엔드가 첫 세션 시작 시 UUID를 발급하고 HttpOnly 쿠키로 관리합니다:

| 쿠키 | 옵션 | 용도 | 만료 |
|---|---|---|---|
| `guest_uuid` | HttpOnly, SameSite=Strict, Secure(prod) | 게스트 식별 | 1년 |

**동작 원리:**
- 첫 게스트 세션 시작 요청 → 백엔드가 서버측 `crypto.randomUUID()`로 UUID 발급 + 쿠키 세팅
- 이후 모든 요청 → 브라우저가 쿠키 자동 첨부 → 백엔드가 쿠키에서 UUID 추출
- **프론트는 UUID를 절대 보지 못함** (XSS로도 못 훔침)

**프론트가 유지할 localStorage 값:**
- `guest_nickname` — 표시용 캐시. 없어도 `GET /api/guests/me`로 복구 가능
- ~~`guest_uuid`~~ — 제거
- `guest_nickname_changed_at` — 프론트 쿨다운 로직용 (선택)

---

## Auth

### 회원가입
```
POST /api/auth/register
```
**Request**
```json
{ "email": "a@a.com", "password": "12345678", "name": "홍길동" }
```

**필드 규칙**
| 필드 | 규칙 |
|---|---|
| email | 유효한 이메일 형식 |
| password | 최소 8자 |
| name | 2~12자, 한글/영문/숫자/`_`/`-` 만 허용 |

**Response 201**
```json
{
  "success": true,
  "data": { "userId": 1, "email": "a@a.com", "name": "홍길동" }
}
```

**주요 에러**
| 코드 | 상태 | 설명 |
|---|---|---|
| `VALIDATION_ERROR` | 422 | 형식 오류 |
| `EMAIL_EXISTS` | 409 | 이미 사용 중인 이메일 |
| `TOO_MANY_REGISTER_ATTEMPTS` | 429 | 회원가입 시도 초과 (1시간 5회) |

---

### 로그인
```
POST /api/auth/login
```
**Request**
```json
{ "email": "a@a.com", "password": "12345678" }
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "userInfo": { "id": 1, "email": "a@a.com", "name": "홍길동" }
  }
}
```

> ⚠️ **변경**: 이전에 body에 있던 `accessToken` 필드 제거. 이제 HttpOnly Cookie로만 발급됨.

**주요 에러**
| 코드 | 상태 | 설명 |
|---|---|---|
| `VALIDATION_ERROR` | 422 | 형식 오류 |
| `INVALID_CREDENTIALS` | 401 | 이메일 또는 비밀번호 불일치 |
| `TOO_MANY_LOGIN_ATTEMPTS` | 429 | 로그인 시도 초과 (15분 5회) |

---

### 토큰 갱신
```
POST /api/auth/refresh
```
> Body 없음. `refreshToken` 쿠키 자동 전송

**Response 200**
```json
{ "success": true, "data": null }
```

> ⚠️ **변경**: 이전 응답의 `accessToken` 필드 제거. 새 `accessToken`이 Set-Cookie로 자동 갱신됨.

**주요 에러**
| 코드 | 상태 | 설명 |
|---|---|---|
| `AUTH_INVALID_TOKEN` | 401 | refreshToken 없음/만료/위조 |
| `TOO_MANY_REFRESH_ATTEMPTS` | 429 | 갱신 시도 초과 (15분 20회) |

---

### 로그아웃
```
POST /api/auth/logout 🔒
```
`accessToken`/`refreshToken` 쿠키가 서버 응답으로 삭제됨.

**Response 200**
```json
{ "success": true, "data": null }
```

---

### 내 정보 조회
```
GET /api/users/me 🔒
```
**Response 200**
```json
{
  "success": true,
  "data": { "id": 1, "email": "a@a.com", "name": "홍길동", "created_at": "2026-07-31T00:00:00Z" }
}
```

**주요 에러**
| 코드 | 상태 | 설명 |
|---|---|---|
| `AUTH_TOKEN_MISSING` | 401 | 로그인 필요 |
| `AUTH_INVALID_TOKEN` | 401 | 토큰 만료/위조 → refresh 시도 |
| `USER_NOT_FOUND` | 404 | 유저 없음 |

---

## 연습 모드

> 로그인·비로그인 모두 가능
> - 로그인: `accessToken` 쿠키 자동 전송으로 인증
> - 비로그인 (첫 방문): body에 `nickname` 필수 → 백엔드가 `guest_uuid` 쿠키 발급
> - 비로그인 (재방문): `guest_uuid` 쿠키 자동 전송, `nickname` body 생략 가능 (immutability)

### 세션 시작
```
POST /api/practice/sessions
```
**Request**
```json
{ "mode": "practice", "nickname": "익명유저", "eventId": 1 }
```
| 필드 | 필수 | 설명 |
|---|---|---|
| mode | Y | `practice` \| `live` |
| nickname | 비로그인만 Y | **2~12자, 한글/영문/숫자/`_`/`-` 만 허용**. 로그인 유저는 무시됨 |
| eventId | N | 이벤트 ID (1 이상 정수) |

**Response 201**
```json
{
  "success": true,
  "data": {
    "sessionId": "prc_a3f5b8c9d2e1f4a7",
    "startedAt": "2026-07-31T09:00:00.120Z",
    "nickname": "익명유저"
  }
}
```

> ⚠️ **변경**: `sessionId` 형식이 `prc_XXXXX` (5자리 숫자) → `prc_XXXXXXXXXXXXXXXX` (16 hex 문자, 총 20자)로 변경됨. `crypto.randomBytes` 기반으로 예측 불가.

> 🆕 **응답에 `nickname` 추가 (닉네임 immutability)**
> - 게스트 UUID가 이전에 세션을 만든 적 있으면 백엔드가 **최초 닉네임으로 강제**함
> - 프론트가 다른 닉네임을 body로 보내도 응답의 `nickname`이 실제 사용된 값
> - **프론트는 응답의 `nickname` 값으로 localStorage 갱신 필수** (그렇지 않으면 UI에 다른 이름 표시됨)

> 🆕 **응답 헤더에 `Set-Cookie: guest_uuid=...`**
> - 게스트 첫 세션 시 백엔드가 HttpOnly 쿠키 자동 발급 (1년)
> - `fetch(..., { credentials: "include" })` 옵션 있어야 브라우저가 쿠키 저장함

**주요 에러**
| 코드 | 상태 | 설명 |
|---|---|---|
| `VALIDATION_ERROR` | 422 | 형식 오류 (nickname 규칙 위반 포함) |
| `NICKNAME_REQUIRED` | 400 | 첫 방문(쿠키 없음)인데 body에 `nickname` 없음 |
| `USER_NOT_FOUND` | 404 | 로그인 유저 정보 조회 실패 |

---

### 세션 완료 (기록 제출)
```
POST /api/practice/sessions/{sessionId}/complete
```
**Request**
```json
{ "clientElapsedMs": 5400 }
```
> `clientElapsedMs`는 참고용. 실제 기록은 서버에서 재계산.

**Response 200 (랭킹 반영됨)**
```json
{
  "success": true,
  "data": {
    "elapsedMs": 5470,
    "ranked": true,
    "rankPercentile": 77.0,
    "rankNumber": 111471,
    "totalCount": 146400
  }
}
```

**Response 200 (랭킹 반영 안 됨 — impostor)**
```json
{
  "success": true,
  "data": {
    "elapsedMs": 5470,
    "ranked": false,
    "rankPercentile": null,
    "rankNumber": null,
    "totalCount": null
  }
}
```

> 🆕 **`ranked` 필드 추가**
> - `true`: 정상 랭킹 반영. `rankPercentile`/`rankNumber`/`totalCount` 값 존재
> - `false`: **다른 게스트가 먼저 사용한 닉네임**이라 랭킹 미반영. rank 필드는 모두 `null`
> - 로그인 유저 또는 닉네임 정식 소유자는 항상 `true`
> - 프론트에서 `ranked === false`면 사용자에게 "닉네임이 겹쳐 랭킹에 반영되지 않았습니다" 안내 필요

**주요 에러**
| 코드 | 상태 | 설명 |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `clientElapsedMs` 형식 오류 |
| `SESSION_NOT_FOUND` | 404 | 세션 없음 |
| `SESSION_ALREADY_COMPLETED` | 409 | 이미 완료됨 |
| `SESSION_FORBIDDEN` | 403 | 본인 세션 아님 (로그인/게스트 소유권 불일치) |
| `GUEST_UUID_MISSING` | 401 | 게스트인데 `guest_uuid` 쿠키 없음 (세션 시작 전) |

---

## 게스트 🆕

### 게스트 정보 복구
```
GET /api/guests/me
```

`guest_uuid` HttpOnly 쿠키를 읽어서 최초 사용한 닉네임을 반환. **localStorage가 지워졌을 때 복구용**.

> Body/Query 없음. 쿠키만 필요 (`fetch(..., { credentials: "include" })` 필수)

**Response 200**
```json
{
  "success": true,
  "data": {
    "guestUuid": "550e8400-e29b-41d4-a716-446655440000",
    "nickname": "익명유저"
  }
}
```

**주요 에러**
| 코드 | 상태 | 설명 |
|---|---|---|
| `GUEST_NOT_FOUND` | 404 | 쿠키에 `guest_uuid` 없거나, 그 UUID의 세션 이력 없음 |

**호출 타이밍**:
- 앱 초기 부트스트랩 시 **`localStorage.guest_nickname`이 없을 때만** 1회 호출
- `200` → `localStorage.guest_nickname` 복구 (UUID는 쿠키에만 존재, 저장 X)
- `404` → 신규 방문자, 아무것도 안 함 (닉네임 입력 후 첫 세션에서 UUID 자동 발급됨)
- 매 API 호출 전에 부르지 말 것 (캐시 활용)

**⚠️ 참고 사항**
- 30일간 활동 없으면 세션이 크론으로 삭제되어 복구 불가 → `404`
- 브라우저 데이터 완전 삭제 / 시크릿 창 / 다른 기기 → 쿠키 없음 → `404`

---

### 게스트 정체성 초기화 (닉네임 변경 시)
```
DELETE /api/guests/me
```

`guest_uuid` 쿠키를 삭제하여 게스트 정체성을 리셋. **1시간 쿨다운 후 닉네임 변경 시 사용**.

> Body/Query 없음.

**Response 200**
```json
{ "success": true, "data": null }
```

**동작:**
- 서버가 `guest_uuid` 쿠키를 `clearCookie`로 삭제 (브라우저 저장소에서 제거됨)
- 기존 UUID의 세션 데이터는 DB에 남음 → **유령 UUID** 상태
- 유령 UUID의 세션은 30일 후 크론이 자동 정리
- 다음 `POST /api/practice/sessions` 호출 시 **새 UUID 자동 발급 + 새 쿠키 세팅**

**호출 시점**:
- 프론트에서 1시간 쿨다운 통과 + 사용자가 닉네임 변경 확정한 순간
- **호출 전**: 프론트가 반드시 1시간 쿨다운 검증 (백엔드는 검증 안 함)

**호출 후 프론트 처리:**
```typescript
await fetch(`${API_URL}/api/guests/me`, { method: "DELETE", credentials: "include" });
localStorage.removeItem("guest_nickname");
localStorage.setItem("guest_nickname_changed_at", Date.now().toString());
// 이후 새 닉네임으로 세션 시작하면 서버가 새 UUID 발급
```

---

## 랭킹

### 전체 랭킹 조회
```
GET /api/rankings?mode=practice&period=daily&page=1&size=20&eventId=1
```
| 파라미터 | 필수 | 설명 |
|---|---|---|
| mode | Y | `practice` \| `live` |
| period | Y | `daily` \| `weekly` \| `monthly` |
| page | N | 기본 1 |
| size | N | 기본 20, 최대 100 |
| eventId | N | 이벤트 ID |

> 최대 100위까지만 조회 가능

**Response 200**
```json
{
  "success": true,
  "data": [
    { "rank": 1, "nickname": "홍길동", "best_ms": 5470, "is_verified": true },
    { "rank": 2, "nickname": "익명유저", "best_ms": 5575, "is_verified": false }
  ],
  "meta": { "page": 1, "size": 20, "totalCount": 812 }
}
```

**주요 에러**
| 코드 | 상태 | 설명 |
|---|---|---|
| `VALIDATION_ERROR` | 422 | 파라미터 형식 오류 |
| `INVALID_PERIOD` | 400 | period가 daily/weekly/monthly 외 값 (심층 방어) |

---

## 에러 코드 전체

| 코드 | HTTP | 설명 |
|---|---|---|
| `VALIDATION_ERROR` | 422 | 요청 값 형식 오류 (validator 실패) |
| `EMAIL_EXISTS` | 409 | 이미 사용 중인 이메일 |
| `INVALID_CREDENTIALS` | 401 | 로그인 실패 (이메일/비번 불일치) |
| `AUTH_TOKEN_MISSING` | 401 | 인증 필요한데 쿠키 없음 |
| `AUTH_INVALID_TOKEN` | 401 | 토큰 만료/위조 |
| `USER_NOT_FOUND` | 404 | 유저 조회 실패 |
| `GUEST_UUID_REQUIRED` | 400 | X-Guest-UUID 헤더 누락 |
| `NICKNAME_REQUIRED` | 400 | 닉네임 누락 (비로그인) |
| `SESSION_NOT_FOUND` | 404 | 세션 없음 |
| `SESSION_ALREADY_COMPLETED` | 409 | 이미 완료된 세션 |
| `SESSION_FORBIDDEN` | 403 | 본인 세션 아님 |
| `INVALID_PERIOD` | 400 | 랭킹 period 값 오류 |
| `GUEST_NOT_FOUND` | 404 | 게스트 정보 없음 (쿠키 없거나 세션 이력 없음) |
| `GUEST_UUID_MISSING` | 401 | 게스트 세션 완료 시 `guest_uuid` 쿠키 없음 |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Content-Type이 application/json 아님 |
| `TOO_MANY_LOGIN_ATTEMPTS` | 429 | 로그인 rate limit 초과 |
| `TOO_MANY_REGISTER_ATTEMPTS` | 429 | 회원가입 rate limit 초과 |
| `TOO_MANY_REFRESH_ATTEMPTS` | 429 | refresh rate limit 초과 |
| `TOO_MANY_REQUESTS` | 429 | 전역 rate limit 초과 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 (상세 정보는 서버 로그에만) |

---

## 프론트 변경 체크리스트

이번 백엔드 라운드로 프론트에서 확인·수정이 필요한 항목:

### 1. Base URL 접두어 `/api` 확인
- 모든 API 호출 URL이 `/api/...`로 시작해야 함 (예: `/api/auth/login`)

### 2. `Authorization: Bearer` 헤더 제거 확인
- HttpOnly Cookie 방식으로 완전 이관. `Authorization` 헤더 조립 로직 있으면 제거
- `fetch(..., { credentials: "include" })` 옵션 필수

### 3. 로그인/refresh 응답에서 `accessToken` 파싱 제거
- Body에 더 이상 `accessToken` 없음. `userInfo`만 사용

### 4. 세션 ID 길이 대응
- 5자리(`prc_88291`) → 20자(`prc_a3f5b8c9d2e1f4a7`)
- URL path에 넣을 때 길이 관련 UI 잘림 확인

### 5. Content-Type 헤더 필수화
- 모든 POST/PUT/PATCH/DELETE에 `"Content-Type": "application/json"` 명시
- 누락 시 `415 UNSUPPORTED_MEDIA_TYPE`

### 6. Rate Limit 에러 대응 UI
- 429 응답 시 사용자에게 "잠시 후 다시 시도해주세요" 안내
- 에러 코드로 분기: `TOO_MANY_LOGIN_ATTEMPTS` 등

### 7. 닉네임/이름 입력 필드 프론트 검증 강화
- 백엔드 규칙과 일치시켜 UX 개선: 2~12자, 한글/영문/숫자/`_`/`-` 만
- 정규식: `/^[가-힣a-zA-Z0-9_-]+$/`

### 8. ⚠️ X-Guest-UUID 헤더 제거 (변경됨)
- 이 헤더 조립하던 코드 **모두 삭제**. 백엔드가 쿠키로 처리
- `crypto.randomUUID()` 클라이언트 생성 로직도 **삭제**
- localStorage의 `guest_uuid` 저장/읽기 로직 **삭제**

### 9. `AUTH_TOKEN_MISSING` 에러 코드 추가 대응
- 이전엔 없던 코드. 로그인 필요 페이지에서 토큰 자체가 없을 때 반환됨
- `AUTH_INVALID_TOKEN`(만료/위조)와 구분해서 처리 가능:
  - `AUTH_TOKEN_MISSING` → 로그인 페이지로 리다이렉트
  - `AUTH_INVALID_TOKEN` → refresh 시도 후 실패 시 로그인 페이지

### 10. `AUTH_EXPIRED_TOKEN` 코드 삭제됨
- 백엔드에서 발급 안 됨. 만료도 `AUTH_INVALID_TOKEN`으로 통일
- 이 코드로 분기하는 로직 있으면 `AUTH_INVALID_TOKEN`으로 병합

### 11. 🆕 앱 부트스트랩 시 `GET /api/guests/me` 호출
- 조건: **로그인 유저 X && `localStorage.guest_nickname` 없음**
- `200` → `localStorage.guest_nickname` 복구 (UUID는 쿠키에만 있음, 저장 안 함)
- `404` → 신규 방문자, 아무것도 안 함 (닉네임 입력 후 첫 세션에서 UUID 자동 발급됨)
- 매 라우트 이동 / 매 API 호출 전에 부르지 말 것 (한 번만)

```typescript
// 예시 부트스트랩 코드
useEffect(() => {
  if (isLoggedIn) return;
  if (localStorage.getItem("guest_nickname")) return;

  fetch(`${API_URL}/api/guests/me`, { credentials: "include" })
    .then(async (res) => {
      if (!res.ok) return;
      const { data } = await res.json();
      // guest_uuid는 저장 안 함 (쿠키에만)
      localStorage.setItem("guest_nickname", data.nickname);
    })
    .catch(() => {});
}, []);
```

### 12. 🆕 세션 시작 응답의 `nickname` 값으로 localStorage 갱신 필수
- 백엔드가 게스트 UUID의 **최초 닉네임**으로 강제 override
- 사용자가 프론트에서 새 닉네임을 입력해도 응답 `data.nickname`이 실제 사용된 값
- 응답 받은 즉시 `localStorage.setItem("guest_nickname", data.nickname)` 필수

### 13. 🆕 세션 완료 응답의 `ranked` 필드 처리
- `ranked: true` → 정상 랭킹 반영 (기존 UI)
- `ranked: false` → 사용자에게 안내: "닉네임이 겹쳐 랭킹에 반영되지 않았어요"
- `rankPercentile`/`rankNumber`/`totalCount`가 `null`로 올 수 있으므로 UI에서 방어 필요
- 티켓/결과 화면에서 rank 표시 여부 분기

### 14. 🆕 게스트 API 호출 시 `credentials: "include"` 필수
- `POST /api/practice/sessions`, `POST /api/practice/sessions/:id/complete`, `GET/DELETE /api/guests/me` 모두
- 없으면 브라우저가 쿠키 안 보냄 → 첫 요청은 UUID 발급되지만 이후 요청에서 쿠키 미전송 → `GUEST_UUID_MISSING`

```typescript
// ✅ 올바른 예
await fetch(`${API_URL}/api/practice/sessions`, {
  method: "POST",
  credentials: "include",   // ← 필수
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mode, nickname }),
});
```

### 15. 🆕 닉네임 변경 흐름 (1시간 쿨다운)
- 프론트가 1시간 쿨다운 강제 (`localStorage.guest_nickname_changed_at` 사용)
- 쿨다운 통과 시 아래 순서로 처리:

```typescript
async function changeNickname(newNickname: string) {
  const changedAt = Number(localStorage.getItem("guest_nickname_changed_at") || 0);
  if (Date.now() - changedAt < 60 * 60 * 1000) {
    alert("1시간 후에 변경 가능합니다");
    return;
  }

  // 1. 게스트 정체성 초기화 (쿠키 삭제)
  await fetch(`${API_URL}/api/guests/me`, {
    method: "DELETE",
    credentials: "include",
  });

  // 2. localStorage 정리
  localStorage.removeItem("guest_nickname");
  localStorage.setItem("guest_nickname_changed_at", Date.now().toString());

  // 3. 새 닉네임으로 세션 시작 → 서버가 새 UUID 자동 발급
  const res = await fetch(`${API_URL}/api/practice/sessions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "practice", nickname: newNickname }),
  });
  const { data } = await res.json();
  localStorage.setItem("guest_nickname", data.nickname);
}
```

**중요:**
- 1시간 이전에 사용자가 localStorage를 강제로 지우고 다른 닉으로 세션 시작해도, **쿠키가 살아있어서 백엔드가 원래 닉으로 강제 복구** (immutability)
- 즉, 정상 경로(위 함수)로만 닉 변경 가능. localStorage 조작은 무의미

---

## 프론트 통합 에러 처리 가이드

백엔드와 통일된 응답 스키마(`{ success, data }` / `{ success, error: { code, message } }`)를 전제로, 프론트는 다음 규약으로 처리한다.

### 1. `apiFetch<T>` 계약

`src/lib/api.ts`의 `apiFetch<T>`가 스키마 파싱·에러 throw를 전담한다. **caller는 성공 시 `data`만 받고, 실패 시 `ApiError`만 catch하면 된다.**

```ts
// 성공 시 T(data) 반환
const { userInfo } = await apiFetch<{ userInfo: User }>(ROUTES.auth.login, {
  method: 'POST',
  body: { email, password },
});

// data가 null인 성공 응답
await apiFetch<null>(ROUTES.auth.logout, { method: 'POST' });

// 실패는 ApiError로 throw
try {
  await apiFetch<...>(...);
} catch (e) {
  if (e instanceof ApiError) {
    // e.code, e.status, e.message 사용
  }
}
```

내부 동작:
- `res.ok && success === true` → `data`(T) 반환
- 위 조건 실패 → `ApiError('INVALID_RESPONSE', ...)` throw
- HTTP 4xx/5xx → `error.code` + `error.message`로 `ApiError` throw
- 5xx는 원본 메시지 감추고 `INTERNAL_ERROR`로 통일 (내부 정보 유출 방지)

### 2. 에러 코드 → 사용자 메시지 매핑

`src/lib/errors.ts`의 `ERROR_MESSAGES`에 코드→한글 메시지 매핑이 있어야 함. 새 코드가 백엔드에 추가되면 여기에도 반드시 등록.

```ts
export function getErrorMessage(code: string | undefined, fallback?: string): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return fallback ?? '요청 처리 중 오류가 발생했습니다.';
}
```

프론트 표시는 항상 `getErrorMessage(e.code, e.message)` 순서로 매핑된 메시지를 우선. 백엔드 원문(`e.message`)은 fallback.

### 3. 401 자동 처리 (세션 관련만)

- `AUTH_INVALID_TOKEN` → `POST /api/auth/refresh` 자동 시도, 성공 시 원 요청 재시도
- `AUTH_TOKEN_MISSING` → refresh 스킵하고 즉시 로그아웃 + `/login` 이동
- **그 외 401 (예: `INVALID_CREDENTIALS`)** → forceLogout·refresh 안 함. 그냥 `ApiError` throw만. 로그인 페이지에서 에러 메시지 표시가 사라지지 않도록 하기 위함

### 4. 429 (Rate Limit) 처리

백엔드 rate limiter도 envelope 포맷을 지켜야 함 (`{ success:false, error:{ code:'TOO_MANY_...', message:'...' } }`). 그렇지 않으면 프론트가 `요청 실패 (429)`라는 fallback을 표시함. `express-rate-limit` 사용 시 `handler` 옵션으로 커스텀 응답 필요.

### 5. UI 표시 원칙

- **폼 인라인 에러**: 로그인/회원가입 등 폼 컨텍스트에서는 카드 상단·필드 하단에 빨간 텍스트로 표시. 자동 소멸 X
- **토스트/자동 소멸**: 헤더 닉네임 편집 등 부수적인 액션에서는 3초 후 자동 소멸
- **랭킹 미반영(`ranked: false`)**: 티켓/결과 카드에 경고 문구 삽입, rank 필드는 `—`로 대체

### 6. 신규 에러 코드 도입 절차

백엔드에 새 코드가 추가되면 프론트는 다음을 항상 함께 업데이트:
1. `src/lib/errors.ts`의 `ERROR_MESSAGES`에 한글 메시지 등록
2. 특수 처리 필요하면 caller에서 `e.code === '...'` 분기
3. 이 문서의 "에러 코드 전체" 표에 반영
