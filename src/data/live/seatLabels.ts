import type { VenueConfig } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   deriveLiveSeatLabels
   실시간 미니게임 회차에 사용할 좌석 라벨 배열을 venue에서 자동 생성.

   규칙 (구역별 균등 분배):
   - venue.zones의 seated + seatRows 있는 모든 구역에서
     각 구역의 앞쪽 좌석부터 `perZoneCount`개씩 뽑는다.
   - 총 라이브 좌석 = seated 구역 수 × perZoneCount.
   - 라벨 포맷: "{zoneId}-{rowLabel}-{seat}"

   왜 이렇게 분배하나:
   - 라이브 미니게임은 유저가 어느 구역을 골라도 참여 기회가 균등해야 함.
   - 특정 구역에 몰아두면 UX가 불공평 (좋은 자리 아는 유저만 유리).

   백엔드 defaultSeatLabels 스펙 준수:
   - 최대 2000개, 각 원소 1~32자, `[A-Za-z0-9가-힣_-]+`, 중복 금지
   - zone.id·row.label을 위 정규식에 맞게 venue 정의 단계에서 관리
   ───────────────────────────────────────────────────────── */

const MAX_SEAT_LABELS = 2000;
const LABEL_REGEX = /^[A-Za-z0-9가-힣_-]{1,32}$/;

export function deriveLiveSeatLabels(venue: VenueConfig, perZoneCount: number): string[] {
  if (perZoneCount < 1) return [];
  const labels: string[] = [];

  for (const zone of venue.zones) {
    if (zone.type !== 'seated' || !zone.seatRows) continue;

    let takenInZone = 0;
    for (const row of zone.seatRows) {
      for (let seat = 1; seat <= row.seatCount; seat++) {
        const label = `${zone.id}-${row.label}-${seat}`;
        if (!LABEL_REGEX.test(label)) {
          throw new Error(
            `[deriveLiveSeatLabels] "${label}"이(가) 백엔드 라벨 규칙(1~32자 [A-Za-z0-9가-힣_-])을 위반합니다. ` +
            `venue "${venue.id}"의 zone.id·row.label을 확인해 주세요.`,
          );
        }
        labels.push(label);
        takenInZone += 1;
        if (labels.length >= MAX_SEAT_LABELS) return labels;
        if (takenInZone >= perZoneCount) break;
      }
      if (takenInZone >= perZoneCount) break;
    }
  }

  return labels;
}

/**
 * 라이브 좌석 라벨을 zone/row/seat 3-tuple로 되돌린다.
 * 라이브 좌석맵에서 클릭한 라벨을 venue 좌표로 매핑할 때 사용.
 */
export function parseLiveSeatLabel(label: string): { zoneId: string; rowLabel: string; seat: number } | null {
  const parts = label.split('-');
  if (parts.length < 3) return null;
  const seat = Number(parts[parts.length - 1]);
  if (!Number.isInteger(seat) || seat < 1) return null;
  const rowLabel = parts[parts.length - 2];
  const zoneId = parts.slice(0, -2).join('-');
  return { zoneId, rowLabel, seat };
}
