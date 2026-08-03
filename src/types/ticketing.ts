/* ─────────────────────────────────────────────────────────
   Ticketing domain types
   배치도(venue layout)는 VenueConfig로 교체 가능하도록 분리
   ───────────────────────────────────────────────────────── */

export interface TierInfo {
  label: string;   // "VIP석", "R석" …
  price: number;
  color: string;   // hex — 테두리/텍스트 강조용
  bg: string;      // hex — 연한 배경
}

/** 일반 지정석 구역의 한 행 */
export interface SeatRow {
  label: string;     // "A", "B", "가나구역" …
  seatCount: number;
}

/** 스탠딩 구역의 입장 번호 블록 */
export interface StandingBlock {
  blockId: string;    // "001", "021" …
  rangeLabel: string; // "입장번호 1~1000"
  available: number;
  total: number;
}

/** 단일 구역 */
export interface Zone {
  id: string;
  name: string;      // "VIP 구역", "스탠딩 가" …
  tier: string;      // TierInfo 키
  type: 'seated' | 'standing';
  seatRows?: SeatRow[];
  standingBlocks?: StandingBlock[];
}

/** 좌석도 전체보기 맵 셀 */
export type MapCell =
  | { type: 'empty';    colSpan?: number }
  | { type: 'stage';    colSpan?: number }
  | { type: 'label';    text: string; colSpan?: number }
  | { type: 'zone';     zoneId: string; colSpan?: number }
  ;

/** 공연장 배치 설정 — 이벤트마다 교체 가능 */
export interface VenueConfig {
  id: string;
  name: string;
  tiers: Record<string, TierInfo>;  // 해당 공연장 좌석 등급
  zones: Zone[];
  mapGrid: MapCell[][];             // 전체 보기 그리드 레이아웃
}

/** 선택된 좌석 한 개 */
export interface SelectedSeat {
  id: string;
  zoneId: string;
  zoneName: string;
  tier: string;
  label: string;   // "A열 5번", "스탠딩 가 001"
}
