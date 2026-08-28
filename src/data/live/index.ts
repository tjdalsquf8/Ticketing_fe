import type { VenueConfig } from '@/types/ticketing';
import { KSPO_DOME } from './kspoDome';
import { GOCHEOK_SKYDOME } from './gocheokSkydome';
import { JAMSIL_BASEBALL } from './jamsilBaseball';
import { SSG_LANDERS_FIELD } from './ssgLanders';
import { INSPIRE_ARENA } from './inspireArena';
import { JAMSIL_OLYMPIC_MAIN } from './jamsilOlympicMain';
import { BLUESQUARE_MAIN } from './bluesquare';
import { SEJONG_GRAND } from './sejongGrand';
import { YES24_LIVE_HALL } from './yes24LiveHall';
import { HANGANG_FESTIVAL } from './hangangFestival';

/* ─────────────────────────────────────────────────────────
   LIVE_EVENTS — 실시간 티켓팅 이벤트 카탈로그
   각 이벤트는 실제 공연장 배치(VenueConfig)와 매핑됨.
   백엔드 연동 전 mock 역할. 실제로는 GET /events/:id 응답으로 대체 예정.
   ───────────────────────────────────────────────────────── */

export interface LiveEvent {
  id: string;             // URL param과 매칭 (예: /event/:id)
  /**
   * 백엔드 venues 테이블의 정수 PK.
   * admin `PUT /admin/live/config/venue` body(`defaultVenueId: number`)에 실어 보낸다.
   * BE 리팩터로 라이브 config·라운드가 venue 참조로 바뀌며 기존 `eventId` 필드는 폐기됨.
   */
  backendVenueId: number;
  /**
   * 백엔드 venues.slug 문자열. public 라이브 응답의 `round.venueId`(slug)와 매칭.
   * `venue.id` 와 대체로 같지만 배포된 실제 slug 가 우선 (예: jamsil-olympic-main-v1).
   */
  backendVenueSlug: string;
  title: string;
  category: string;
  venueName: string;
  posterImage: string;
  totalSeats: number;     // 실제 공연장 총 수용 좌석 (표시용)
  /**
   * 실시간 티켓팅 미니게임에서 **구역당 오픈될 좌석 수**.
   * 총 라이브 좌석 = seated 구역 개수 × liveSeatsPerZone.
   * 모든 구역에 공평하게 좌석이 배정되어 어느 구역을 골라도 참여 가능.
   * 백엔드 `defaultSeatLabels`는 총 1~2000개 제약이므로,
   *   `zones × liveSeatsPerZone`이 2000을 넘지 않게 조정 필요.
   */
  liveSeatsPerZone: number;
  /** opens_at 계산 (호출 시점의 다음 정각·오늘 특정 시각 등) */
  opensAtFn: () => Date;
  venue: VenueConfig;
}

// ── opensAt 계산 헬퍼 (mockEvents와 동일 규칙) ──

/** 다음 정각 (매시 정각 자동 오픈용) */
function nextHour(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export const LIVE_EVENTS: LiveEvent[] = [
  {
    id: 'kspo-dome-1',
    backendVenueId: 1,
    backendVenueSlug: 'kspo-dome-v1',
    title: '2026 K-POP GRAND CONCERT — KSPO돔',
    category: '콘서트',
    venueName: 'KSPO돔 (올림픽공원 체조경기장)',
    posterImage: '/Img/live/kspo-dome.png',
    totalSeats: 14594,
    liveSeatsPerZone: 40,
    opensAtFn: nextHour,
    venue: KSPO_DOME,
  },
  // 고척스카이돔 라이브 (매시 정각 오픈) — 실제 좌석 배치는 src/data/live/gocheokSkydome.ts 참조.
  // seated 구역: 1층 내야(12) + 1층 외야(12) + 2층(14) + 3층(16) = 54개.
  // liveSeatsPerZone 30 × 54 = 1,620개 (백엔드 2000개 상한 이내).
  {
    id: 'gocheok-1',
    backendVenueId: 2,
    backendVenueSlug: 'gocheok-skydome-v1',
    title: '2026 SUMMER SONIC — 고척스카이돔',
    category: '콘서트',
    venueName: '고척스카이돔',
    posterImage: '/Img/live/gocheok-skydome.png',
    totalSeats: 25000,
    liveSeatsPerZone: 30,
    opensAtFn: nextHour,
    venue: GOCHEOK_SKYDOME,
  },
  // 잠실 야구장 라이브 (매시 정각 오픈) — 실제 좌석 배치는 src/data/live/jamsilBaseball.ts 참조.
  // seated 구역: 1층 내야(12) + 외야 지정석(8) + 2층(14) + 3층(18) = 52개.
  // liveSeatsPerZone 30 × 52 = 1,560개 (백엔드 2000개 상한 이내).
  // 공평성 원칙에 따라 외야도 seat-mode로 통일.
  {
    id: 'jamsil-baseball-1',
    backendVenueId: 3,
    backendVenueSlug: 'jamsil-baseball-v1',
    title: '2026 SEOUL SUMMER LIVE — 잠실 야구장',
    category: '콘서트',
    venueName: '잠실 야구장',
    posterImage: '/Img/live/jamsil-baseball.png',
    totalSeats: 30000,
    liveSeatsPerZone: 30,
    opensAtFn: nextHour,
    venue: JAMSIL_BASEBALL,
  },
  // 인천 SSG랜더스필드 라이브 (매시 정각 오픈) — 실제 좌석 배치는 src/data/live/ssgLanders.ts 참조.
  // seated 구역: 1층 내야(12) + 외야 그린석(8) + 2층(14) + 3층(16) = 50개.
  // liveSeatsPerZone 30 × 50 = 1,500개 (백엔드 2000개 상한 이내).
  // KBO 랜더스 실제 등급명(네이비/레드/블루/그린)을 콘서트 티어로 재구획 + 랜더스라이브존 특수석.
  {
    id: 'ssg-landers-1',
    backendVenueId: 4,
    backendVenueSlug: 'ssg-landers-v1',
    title: '2026 INCHEON WAVE FESTIVAL — SSG랜더스필드',
    category: '콘서트',
    venueName: '인천 SSG랜더스필드',
    posterImage: '/Img/live/ssg-landers.png',
    totalSeats: 25000,
    liveSeatsPerZone: 30,
    opensAtFn: nextHour,
    venue: SSG_LANDERS_FIELD,
  },
  // 인스파이어 아레나 라이브 (매시 정각 오픈) — 실제 좌석 배치는 src/data/live/inspireArena.ts 참조.
  // seated 구역: FLOOR(8) + 3층(13) + 4층(7) = 28개.
  // liveSeatsPerZone 30 × 28 = 840개 (백엔드 2000개 상한 이내).
  // 정면 명당 프리미엄 tier: 3층 311~314, 4층 412~414 (하단 정면 트랙).
  // 실 배치 총 7,143석 (FLOOR 2,182 + 3층 3,149 + 4층 1,812).
  {
    id: 'inspire-arena-1',
    backendVenueId: 5,
    backendVenueSlug: 'inspire-arena-v1',
    title: '2026 GLOBAL K-POP AWARDS — 인스파이어 아레나',
    category: '콘서트',
    venueName: '인스파이어 아레나',
    posterImage: '/Img/live/inspire-arena.png',
    totalSeats: 7143,
    liveSeatsPerZone: 30,
    opensAtFn: nextHour,
    venue: INSPIRE_ARENA,
  },
  // 잠실 종합운동장 주경기장 라이브 (매시 정각 오픈) — src/data/live/jamsilOlympicMain.ts 참조.
  // seated 구역: GROUND(4) + 1층(14) + 2층(16) + 3층(18) = 52개.
  // liveSeatsPerZone 30 × 52 = 1,560개 (백엔드 2000개 상한 이내).
  // 등급: VIP 피트 / 그라운드 / SR 정면 / R / S / A (실 투어 대표 세팅 하드코딩).
  {
    id: 'jamsil-olympic-1',
    backendVenueId: 6,
    // BE 실제 slug 는 'jamsil-olympic-main-v1' — FE 카탈로그 venue.id('jamsil-olympic-v1')와 다르므로 명시적으로 매핑.
    backendVenueSlug: 'jamsil-olympic-main-v1',
    title: '2026 WORLD TOUR FINAL — 잠실 주경기장',
    category: '콘서트',
    venueName: '잠실 종합운동장 주경기장',
    posterImage: '/Img/live/jamsil-olympic-main.png',
    totalSeats: 45000,
    liveSeatsPerZone: 30,
    opensAtFn: nextHour,
    venue: JAMSIL_OLYMPIC_MAIN,
  },
  // 블루스퀘어 대극장 라이브 (매시 정각 오픈) — src/data/live/bluesquare.ts 참조.
  // seated 구역: 1층(9) + 2층(6) + 3층(8) = 23개.
  // liveSeatsPerZone 30 × 23 = 690개 (뮤지컬 소규모라 라벨 수 적음, 백엔드 2000 상한 여유).
  // 등급: VIP(1층 중앙 앞·중) / R(1층 나머지 + 2층 앞 중앙) / S(2층 나머지 + 3층 앞) / A(3층 사이드·뒷).
  {
    id: 'bluesquare-1',
    backendVenueId: 7,
    backendVenueSlug: 'bluesquare-main-v1',
    title: '뮤지컬 팬텀 오브 디 오페라 — 블루스퀘어',
    category: '뮤지컬',
    venueName: '블루스퀘어 대극장',
    posterImage: '/Img/live/bluesquare.png',
    totalSeats: 1767,
    liveSeatsPerZone: 30,
    opensAtFn: nextHour,
    venue: BLUESQUARE_MAIN,
  },
  // 세종문화회관 대극장 라이브 (매시 정각 오픈) — src/data/live/sejongGrand.ts 참조.
  // seated 구역: 1층(9) + 2층(8=6+박스2) + 3층(8) + 4층(8) = 33개.
  // liveSeatsPerZone 30 × 33 = 990개 (백엔드 2000 상한 이내).
  // 등급: VIP / R / S / A / B / C / D (프로시니엄 4단 발코니 최대 6등급 + VIP).
  {
    id: 'sejong-grand-1',
    backendVenueId: 8,
    backendVenueSlug: 'sejong-grand-v1',
    title: '2026 세종 크로스오버 콘서트 — 세종문화회관',
    category: '콘서트',
    venueName: '세종문화회관 대극장',
    posterImage: '/Img/live/sejong-grand.png',
    totalSeats: 3022,
    liveSeatsPerZone: 30,
    opensAtFn: nextHour,
    venue: SEJONG_GRAND,
  },
  // YES24 라이브홀 라이브 (매시 정각 오픈) — src/data/live/yes24LiveHall.ts 참조.
  // seated 구역: 1층(4) + 2층(5) = 9개.
  // liveSeatsPerZone 30 × 9 = 270개 (소규모 라이브하우스, 백엔드 2000 상한 여유).
  // 공평성 원칙에 따라 1층 스탠딩도 좌석 모드로 통일 (가/나/다/라).
  {
    id: 'yes24-livehall-1',
    backendVenueId: 9,
    backendVenueSlug: 'yes24-livehall-v1',
    title: '인디밴드 페스티벌 — YES24 라이브홀',
    category: '콘서트',
    venueName: 'YES24 라이브홀',
    posterImage: '/Img/live/yes24-livehall.png',
    totalSeats: 1051,
    liveSeatsPerZone: 30,
    opensAtFn: nextHour,
    venue: YES24_LIVE_HALL,
  },
  // 한강 페스티벌 필드 라이브 (매시 정각 오픈) — src/data/live/hangangFestival.ts 참조.
  // seated 구역: 메인 VIP(1) + GOLDEN(1) + GA 3구역 + 피크닉 2구역 + VIP 라운지(1) + 서브 A(1) + 서브 B(1) = 10개.
  // liveSeatsPerZone 30 × 10 = 300개 (백엔드 2000 상한 여유).
  // 공평성 원칙에 따라 스탠딩/피크닉 존도 좌석 모드로 통일.
  {
    id: 'hangang-festival-1',
    backendVenueId: 10,
    backendVenueSlug: 'hangang-festival-v1',
    title: '2026 SEOUL RIVER FEST — 한강 페스티벌',
    category: '페스티벌',
    venueName: '한강 페스티벌 필드',
    posterImage: '/Img/live/hangang-festival.png',
    totalSeats: 20000,
    liveSeatsPerZone: 30,
    opensAtFn: nextHour,
    venue: HANGANG_FESTIVAL,
  },
];

/**
 * id로 라이브 이벤트 조회. 없으면 null.
 * `-demo` 접미가 있으면 primary id(예: `sejong-grand-demo` → `sejong-grand-1`)로 fallback.
 * (데모 이벤트는 mockEvents에서만 30초 오픈 오버라이드되고, venue 구성은 동일 재사용)
 */
export function getLiveEvent(id: string): LiveEvent | null {
  const found = LIVE_EVENTS.find((e) => e.id === id);
  if (found) return found;
  if (id.endsWith('-demo')) {
    const base = id.slice(0, -'-demo'.length);
    return LIVE_EVENTS.find((e) => e.id === `${base}-1`) ?? null;
  }
  return null;
}

/**
 * public 라이브 응답의 `round.venueId`(slug 문자열) 로 라이브 이벤트 조회.
 * 매핑 실패 시 null → UI 는 fallback(제네릭 카드) 표시.
 */
export function getLiveEventByVenueSlug(venueSlug: string): LiveEvent | null {
  return LIVE_EVENTS.find((e) => e.backendVenueSlug === venueSlug) ?? null;
}

/**
 * admin `LiveConfig.defaultVenueId`(정수 PK) 로 라이브 이벤트 조회.
 * `AdminLiveConfigClient` 가 현재 배치된 공연장을 표시할 때 사용.
 */
export function getLiveEventByBackendVenueId(venueId: number): LiveEvent | null {
  return LIVE_EVENTS.find((e) => e.backendVenueId === venueId) ?? null;
}

/* ─────────────────────────────────────────────────────────
   관리자 콘솔용 — 등록된 공연장 선택 옵션
   LIVE_EVENTS 의 venue 를 유니크하게 뽑아 관리자 폼에서 카드 선택 UI 로 노출.
   좌석 배치가 실제로 존재하는 공연장만 이벤트에 사용 가능하도록 강제한다.
   ───────────────────────────────────────────────────────── */

/**
 * venue.zones 를 순회해 실제 예매 가능한 좌석 총합을 계산.
 * seatRows.seatCount 합. standing 등 seatRows 없는 구역은 0.
 * 관리자 폼·미리보기에서 "오픈 좌석수" 로 노출.
 */
export function computeBookableSeats(venue: VenueConfig): number {
  return venue.zones.reduce((sum, z) => {
    if (!z.seatRows) return sum;
    return sum + z.seatRows.reduce((s, r) => s + r.seatCount, 0);
  }, 0);
}

export interface AdminVenueOption {
  /** 백엔드 참조용 venue.id — 예: 'kspo-dome-v1' */
  venueId: string;
  /** 표시명 — 예: 'KSPO돔 (올림픽공원 체조경기장)' */
  name: string;
  /** 실제 예매 가능한 좌석 총합 (venue.zones 순회 계산). */
  totalSeats: number;
  /** 좌석 배치 layout 라벨 — 미리보기 부제로 노출 */
  layout?: string;
  /** 미리 만들어진 공연장 대표 이미지 (LIVE_EVENTS.posterImage). 폼 미리보기 배경. */
  posterImage: string;
  /** 폼 진입/venue 선택 시 자동 채워지는 기본 제목 (LIVE_EVENTS.title). */
  defaultTitle: string;
  /** 폼 진입/venue 선택 시 자동 세팅되는 기본 카테고리. */
  defaultCategory: string;
}

export const AVAILABLE_VENUES: AdminVenueOption[] = (() => {
  const seen = new Set<string>();
  const out: AdminVenueOption[] = [];
  for (const ev of LIVE_EVENTS) {
    if (seen.has(ev.venue.id)) continue;
    seen.add(ev.venue.id);
    out.push({
      venueId: ev.venue.id,
      name: ev.venue.name,
      totalSeats: computeBookableSeats(ev.venue),
      layout: ev.venue.layout,
      posterImage: ev.posterImage,
      defaultTitle: ev.title,
      defaultCategory: ev.category,
    });
  }
  return out;
})();

/** venueId 로 공연장 옵션 조회. 없으면 null. */
export function getAdminVenueOption(venueId: string): AdminVenueOption | null {
  return AVAILABLE_VENUES.find((v) => v.venueId === venueId) ?? null;
}
