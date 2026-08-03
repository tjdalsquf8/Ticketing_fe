# TICKET RUSH API Docs

- Base URL: `http://localhost:3001`
- 모든 요청/응답은 `Content-Type: application/json`
- 구현 완료된 엔드포인트만 포함

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

### 인증 헤더
```
Authorization: Bearer {accessToken}
```

### 비로그인 연습 모드 헤더
```
X-Guest-UUID: {uuid}   // 프론트에서 uuid 생성 후 localStorage 보관
```

---

## Auth

### 회원가입
```
POST /auth/register
```
**Request**
```json
{ "email": "a@a.com", "password": "12345678", "name": "홍길동" }
```
**Response 201**
```json
{
  "success": true,
  "data": { "userId": 1, "email": "a@a.com", "name": "홍길동" }
}
```

---

### 로그인
```
POST /auth/login
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
    "accessToken": "eyJ...",
    "userInfo": { "id": 1, "email": "a@a.com", "name": "홍길동" }
  }
}
```
> `refreshToken`은 HttpOnly Cookie로 자동 저장됨

---

### 토큰 갱신
```
POST /auth/refresh
```
> Body 없음. refreshToken 쿠키 자동 전송

**Response 200**
```json
{
  "success": true,
  "data": { "accessToken": "eyJ..." }
}
```

---

### 로그아웃
```
POST /auth/logout 🔒
```
**Response 200**
```json
{ "success": true, "data": null }
```

---

### 내 정보 조회
```
GET /users/me 🔒
```
**Response 200**
```json
{
  "success": true,
  "data": { "id": 1, "email": "a@a.com", "name": "홍길동", "created_at": "2026-07-31T00:00:00Z" }
}
```

---

## 연습 모드

> 로그인·비로그인 모두 가능
> - 로그인: `Authorization` 헤더
> - 비로그인: `X-Guest-UUID` 헤더 + body에 `nickname` 필수

### 세션 시작
```
POST /practice/sessions
```
**Request**
```json
{ "mode": "practice", "nickname": "익명유저", "eventId": 1 }
```
| 필드 | 필수 | 설명 |
|---|---|---|
| mode | Y | `practice` \| `live` |
| nickname | 비로그인만 Y | 2~12자. 로그인 유저는 무시됨 |
| eventId | N | 이벤트 ID (1 이상 정수). 이벤트별 랭킹 분리 시 사용 |

**Response 201**
```json
{
  "success": true,
  "data": { "sessionId": "prc_88291", "startedAt": "2026-07-31T09:00:00.120Z" }
}
```

---

### 세션 완료 (기록 제출)
```
POST /practice/sessions/{sessionId}/complete
```
**Request**
```json
{ "clientElapsedMs": 5400 }
```
> `clientElapsedMs`는 참고용. 실제 기록은 서버에서 재계산

**Response 200**
```json
{
  "success": true,
  "data": {
    "elapsedMs": 5470,
    "rankPercentile": 77.0,
    "rankNumber": 111471,
    "totalCount": 146400
  }
}
```
| 필드 | 설명 |
|---|---|
| elapsedMs | 실제 소요 시간 (ms) |
| rankPercentile | 상위 몇 % (낮을수록 좋음) |
| rankNumber | 현재 순위 |
| totalCount | 전체 참여자 수 |

**에러**
| 코드 | 상태 | 설명 |
|---|---|---|
| `SESSION_NOT_FOUND` | 404 | 세션 없음 |
| `SESSION_ALREADY_COMPLETED` | 409 | 이미 완료된 세션 |
| `SESSION_FORBIDDEN` | 403 | 본인 세션 아님 |

---

## 랭킹

### 전체 랭킹 조회
```
GET /rankings?mode=practice&period=daily&page=1&size=20&eventId=1
```
| 파라미터 | 필수 | 설명 |
|---|---|---|
| mode | Y | `practice` \| `live` |
| period | Y | `daily` \| `weekly` \| `monthly` |
| page | N | 기본 1 |
| size | N | 기본 20, 최대 100 |
| eventId | N | 이벤트 ID. 지정 시 해당 이벤트 랭킹만 조회 |

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
| 필드 | 설명 |
|---|---|
| best_ms | 최고 기록 (ms) |
| is_verified | 로그인 유저 여부 (배지 표시용) |

---

## 에러 코드 전체

| 코드 | 설명 |
|---|---|
| `VALIDATION_ERROR` | 요청 값 형식 오류 |
| `AUTH_INVALID_TOKEN` | 토큰 유효하지 않음 |
| `AUTH_EXPIRED_TOKEN` | 토큰 만료 |
| `GUEST_UUID_REQUIRED` | X-Guest-UUID 헤더 누락 |
| `NICKNAME_REQUIRED` | 닉네임 누락 (비로그인) |
| `SESSION_NOT_FOUND` | 세션 없음 |
| `SESSION_ALREADY_COMPLETED` | 이미 완료된 세션 |
| `SESSION_FORBIDDEN` | 본인 세션 아님 |
| `INTERNAL_ERROR` | 서버 내부 오류 |
