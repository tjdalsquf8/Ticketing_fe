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
  /**
   * 예매 진입 모드.
   * - 'seat' (기본): 구역 클릭 → 개별 좌석 그리드에서 좌석 선택 (뮤지컬·콘서트홀)
   * - 'zone'      : 구역 자체를 예매 단위로 사용 (야구장·야외 스탠딩 등, 좌석 그리드 스킵)
   */
  entryMode?: 'seat' | 'zone';
  /**
   * SVG 커스텀 맵 렌더링용. 지정하면 layout이 커스텀(arena-ring·baseball·stadium-oval 등)일 때
   * 해당 path를 <path d="..."> 로 그린다. viewBox는 각 맵 컴포넌트가 결정.
   */
  svgPath?: string;
  /** SVG 라벨 표시 좌표 (viewBox 기준) */
  labelPos?: { x: number; y: number };
  /**
   * 실 공연장 표시용 좌석 수(선택). 라이브 게임 좌석 수(seatRows)와 별개로
   * 좌석배치도에 "N석" 부제로 안내할 때 사용.
   */
  capacity?: number;
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
  /**
   * ZoneMap 시각 스타일.
   * - 'grid'         (기본) : mapGrid 사각형 카드 배치 (일반 콘서트홀·소극장)
   * - 'auditorium'          : 돔형 외곽선 + 곡선 STAGE 아크 (기존 잠실 실내체육관형)
   * - 'proscenium'          : 프로시니엄 뮤지컬 극장 (블루스퀘어·세종문화회관·YES24)
   * - 'arena-ring'          : 원형 아레나, 링 구조 (KSPO돔·인스파이어 아레나)
   * - 'baseball'            : 야구장 다이아몬드 (고척·잠실야구·SSG랜더스필드)
   * - 'stadium-oval'        : 타원 트랙 스타디움 (잠실 주경기장)
   * - 'festival'            : 야외 오픈필드 페스티벌 (한강 페스티벌)
   *
   * 커스텀 layout은 SVG 기반 전용 맵 컴포넌트에서 렌더링되며, zone.svgPath / zone.labelPos를 참조한다.
   */
  layout?: 'grid' | 'auditorium' | 'proscenium' | 'arena-ring' | 'baseball' | 'stadium-oval' | 'festival';
  /**
   * 커스텀 SVG layout이 사용하는 viewBox. (예: "0 0 800 800")
   * layout이 'grid'·'auditorium'이면 무시.
   */
  svgViewBox?: string;
  /**
   * arena-ring/기타 SVG layout에서 스테이지 모양.
   * - 'rect'   (기본): 상단 중앙 사각형 STAGE
   * - 't-shape'      : 상단 사각형 + 하단 돌출부 (인스파이어 아레나 T자형)
   */
  stageShape?: 'rect' | 't-shape';
  /** arena-ring 등에서 하단 중앙에 "CONSOLE" 안내 라벨을 그릴지 여부 */
  consoleLabel?: boolean;
}

/** 선택된 좌석 한 개 */
export interface SelectedSeat {
  id: string;
  zoneId: string;
  zoneName: string;
  tier: string;
  label: string;   // "A열 5번", "스탠딩 가 001"
}
