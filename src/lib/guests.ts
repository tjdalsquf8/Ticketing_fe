import { apiFetch, ROUTES } from "./api";

/* ──────────────────────────────────────────
   Guest 신원 API
   ─ 백엔드가 guest_uuid HttpOnly 쿠키를 관리한다.
   ─ 프론트는 UUID 값을 직접 다루지 않는다.
   ────────────────────────────────────────── */

export interface Guest {
  guestUuid: string;
  nickname: string | null;
}

/**
 * 게스트 신원 생성/재확인. nickname 은 optional (1~30자).
 * 쿠키 이미 있으면 서버가 idempotent 로 기존 UUID 그대로 반환.
 * 없으면 새 UUID 발급 + Set-Cookie: guest_uuid.
 */
export function postGuest(nickname?: string) {
  return apiFetch<Guest>(ROUTES.guests.root, {
    method: "POST",
    body: nickname ? { nickname } : {},
  });
}

/** 현재 게스트 정체성 조회. 쿠키 없으면 401 GUEST_NOT_AUTHENTICATED. */
export function getGuestMe() {
  return apiFetch<Guest>(ROUTES.guests.me);
}

/** 게스트 정체성 초기화 (쿠키 삭제). 닉네임 변경 시 사용. */
export function deleteGuestMe() {
  return apiFetch<null>(ROUTES.guests.me, { method: "DELETE" });
}
