import { apiFetch, apiFetchWithMeta, ROUTES } from "./api";

export interface TicketListItem {
  ticketId: number;
  serial: string;
  seatLabel: string;
  rankNumber: number;
  elapsedMs: number;
  issuedAt: string;
  roundId: number;
  eventId: number;
}

export interface TicketDetail extends TicketListItem {
  qrPayload: string;
  totalParticipants: number;
  /** ((totalParticipants - rankNumber + 1) / totalParticipants) * 100, 소수 1자리. 집계 전 null. */
  rankPercentile: number | null;
}

export interface TicketListMeta {
  page: number;
  size: number;
  totalCount: number;
}

/** 내 티켓 목록. 로그인 필수. */
export function getMyTickets(params: { page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  const url = qs.toString() ? `${ROUTES.tickets.me}?${qs}` : ROUTES.tickets.me;
  return apiFetchWithMeta<TicketListItem[], TicketListMeta>(url);
}

/** 티켓 상세 (QR 포함). 본인 티켓만. */
export function getTicket(ticketId: number | string) {
  return apiFetch<TicketDetail>(ROUTES.tickets.detail(ticketId));
}
