import type { EventStatus, RegistrationStatus } from "./events";

/* ──────────────────────────────────────────
   내 신청 상태 배지 (event.status × registration.status)
   ─ BE 스케줄러가 이벤트 종료 후 registration 을 다음 4가지 중 하나로 자동 세팅:
     ticketed / no_show / missed / cancelled(or refunded)
   ─ 예정·진행 중 시점에는 registration 이 pending / entered 유지.
   ─ 이벤트 자체가 cancelled 되면 registration 도 cancelled/refunded 로 정리됨.
   ────────────────────────────────────────── */

export interface RegistrationBadge {
  text: string;
  cls: string;
}

export function myRegistrationBadge(
  regStatus: RegistrationStatus | undefined,
  eventStatus: EventStatus,
): RegistrationBadge | null {
  if (!regStatus) return null;

  switch (regStatus) {
    case "ticketed":
      return { text: "당첨", cls: "badge-success" };
    case "no_show":
      return { text: "참여 실패", cls: "badge-neutral" };
    case "missed":
      return { text: "미참여", cls: "badge-neutral" };
    case "cancelled":
    case "refunded":
      return { text: "취소됨", cls: "badge-neutral" };
    case "entered":
      return eventStatus === "open"
        ? { text: "티켓팅 참여 중", cls: "badge-primary" }
        : { text: "참여함", cls: "badge-neutral" };
    case "pending":
      if (eventStatus === "cancelled") {
        return { text: "취소됨", cls: "badge-neutral" };
      }
      if (eventStatus === "closed") {
        return { text: "종료", cls: "badge-neutral" };
      }
      if (eventStatus === "open") {
        return { text: "지금 참여 가능", cls: "badge-primary" };
      }
      // scheduled
      return { text: "신청 완료 · 오픈 대기", cls: "badge-info" };
    default:
      return null;
  }
}

/** 등록이 여전히 유효(취소·환불 아님)한지. 재신청 차단 판정용. */
export function isActiveRegistration(status: RegistrationStatus): boolean {
  return status !== "cancelled" && status !== "refunded";
}
