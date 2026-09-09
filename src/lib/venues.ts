import { apiFetch, ROUTES } from "./api";
import type { VenueConfig } from "@/types/ticketing";

/** GET /api/venues/:slug 응답. config는 FE VenueConfig 타입 그대로. */
export interface VenueConfigResponse {
  venueId: string;
  name: string;
  layout: string;
  totalSeats: number;
  thumbnailUrl: string;
  config: VenueConfig;
}

/** slug로 공연장 배치(geometry 포함) 조회. 실시간/이벤트 티켓팅 공용. */
export function getVenueConfig(slug: string) {
  return apiFetch<VenueConfigResponse>(ROUTES.venue(slug));
}
