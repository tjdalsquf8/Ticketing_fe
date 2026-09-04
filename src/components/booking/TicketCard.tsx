'use client';

/* ─────────────────────────────────────────────
   TicketCard — 가로형 콘서트 티켓 (순수 마크업)
   TicketModal 이 오버레이로, /my/tickets/[id] 상세가 인라인으로 재사용.
   ───────────────────────────────────────────── */

export interface TicketData {
  eventTitle:     string;
  seat:           string;
  nickname:       string;
  elapsedMs:      number;
  /** false면 다른 게스트가 먼저 사용한 닉네임이라 랭킹 미반영. rank 필드는 모두 null. */
  ranked:         boolean;
  rankNumber:     number | null;
  totalCount:     number | null;
  rankPercentile: number | null;
  serial:         string;
  issuedAt:       Date;
}

interface Props extends TicketData {
  /** 좌측 상단 캡션. 기본 'PRACTICE MODE'. */
  mode?: 'practice' | 'live' | 'event';
  /**
   * 오버레이(모달) 사용 시 노치를 배경 컬러(rgba(0,0,0,0.85))로 파낸다.
   * 인라인 사용 시 배경이 white 이므로 페이지 배경색으로 지정 (기본).
   */
  notchColor?: string;
}

function fmt(d: Date) {
  const z = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}.${z(d.getMonth()+1)}.${z(d.getDate())}  ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}.${z(d.getMilliseconds(),3)}`;
}

/* 장식 SVG (추상 원·선) */
function Deco() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 220" fill="none" preserveAspectRatio="xMidYMid slice">
      <circle cx="60" cy="170" r="110" stroke="#E85D00" strokeWidth="1.5" strokeOpacity="0.18" />
      <circle cx="60" cy="170" r="80"  stroke="#FF2D78" strokeWidth="1"   strokeOpacity="0.12" />
      <circle cx="230" cy="30" r="70"  stroke="#00D4FF" strokeWidth="1"   strokeOpacity="0.1" />
      <path d="M0 140 Q80 80 180 130 T280 100" stroke="#00D4FF" strokeWidth="1" strokeOpacity="0.15" />
      <path d="M0 160 Q90 100 190 150 T280 120" stroke="#FF2D78" strokeWidth="0.8" strokeOpacity="0.12" />
      <path d="M20 200 Q100 140 200 180" stroke="#E85D00" strokeWidth="1" strokeOpacity="0.2" />
      <circle cx="200" cy="40"  r="3" fill="#00D4FF" fillOpacity="0.3" />
      <circle cx="220" cy="60"  r="2" fill="#FF2D78" fillOpacity="0.3" />
      <circle cx="240" cy="30"  r="4" fill="#E85D00" fillOpacity="0.2" />
    </svg>
  );
}

/* 바코드 */
function Barcode() {
  const bars = [3,1,2,1,3,2,1,3,1,2,1,1,3,1,2,3,1,2,1,3,1,1,2,3,1,2];
  return (
    <div className="flex items-stretch mt-2" style={{ height: 56, gap: 1.2 }}>
      {bars.map((w, i) => (
        <div key={i} style={{
          width: w * 2,
          background: i % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'transparent',
          borderRadius: 1,
        }} />
      ))}
    </div>
  );
}

/* 필드 */
function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p style={{ color: '#555', fontSize: 8, fontWeight: 700, letterSpacing: '0.2em' }}>{label}</p>
      <p style={{ color: accent ? '#E85D00' : '#FFFFFF', fontSize: 13, fontWeight: 700, marginTop: 3 }}>
        {value}
      </p>
    </div>
  );
}

export default function TicketCard(props: Props) {
  const { eventTitle, seat, nickname,
          elapsedMs, ranked, rankNumber, totalCount, rankPercentile,
          serial, issuedAt,
          mode = 'practice',
          notchColor = '#FFFFFF' } = props;
  const hasRank = ranked && rankNumber !== null && totalCount !== null && rankPercentile !== null;
  const caption =
    mode === 'event'
      ? 'EVENT MODE'
      : mode === 'live'
        ? 'LIVE MODE'
        : 'PRACTICE MODE';
  const stub = (serial.split('-')[2] ?? '00000').padStart(7, '0');
  const timeStr = (elapsedMs / 1000).toFixed(3) + 's';

  // rankPercentile 이 null (집계 전) 인 경우 "집계 중" 표시
  const isRankPending = ranked && rankNumber !== null && rankPercentile === null;

  return (
    <div
      className="relative flex w-full rounded-2xl overflow-hidden shadow-2xl"
      style={{ maxWidth: 700, minHeight: 220, fontFamily: '"Courier New", Courier, monospace' }}
    >
      {/* 왼쪽 노치 */}
      <div className="absolute left-[calc(38%-10px)] top-0 z-20 flex flex-col justify-between h-full pointer-events-none" style={{ width: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: notchColor, marginTop: -1, marginLeft: -10 }} />
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: notchColor, marginBottom: -1, marginLeft: -10 }} />
      </div>

      {/* ── 왼쪽 장식 영역 (38%) ── */}
      <div className="relative overflow-hidden" style={{ width: '38%', background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0d18 60%, #0d0d0d 100%)' }}>
        <Deco />

        {/* SUCCESS 각인 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: 'rotate(-20deg)' }}>
          <p style={{ color: '#E85D00', fontSize: 52, fontWeight: 900, opacity: 0.06, letterSpacing: '0.15em', userSelect: 'none' }}>
            SUCCESS
          </p>
        </div>

        {/* 텍스트 */}
        <div className="relative z-10 flex flex-col justify-between h-full px-6 py-5">
          <div>
            <p style={{ color: '#E85D00', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em' }}>TICKET  RUSH</p>
            <p style={{ color: '#555', fontSize: 8, marginTop: 2, letterSpacing: '0.15em' }}>
              {caption}
            </p>
          </div>
          <div>
            <p
              className="font-black truncate"
              style={{ color: '#FFFFFF', fontSize: 16, letterSpacing: '-0.01em', lineHeight: 1.3 }}
            >
              {eventTitle}
            </p>
            <p style={{ color: '#777', fontSize: 10, marginTop: 8 }}>
              {issuedAt.getFullYear()}.{String(issuedAt.getMonth()+1).padStart(2,'0')}.{String(issuedAt.getDate()).padStart(2,'0')}
            </p>
          </div>
          <p style={{ color: '#444', fontSize: 9 }}>{serial}</p>
        </div>
      </div>

      {/* ── 절취선 ── */}
      <div className="relative z-10 flex-shrink-0" style={{ width: 0 }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0,
          borderLeft: '2px dashed #2A2A2A',
        }} />
      </div>

      {/* ── 중앙 정보 영역 (40%) ── */}
      <div
        className="flex flex-col justify-between"
        style={{ width: '40%', background: '#0D0D0D', padding: '20px 24px' }}
      >
        <div className="space-y-3">
          <div>
            <p style={{ color: '#555', fontSize: 8, fontWeight: 700, letterSpacing: '0.2em' }}>PASSENGER</p>
            <p style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 900, marginTop: 2 }}>{nickname}</p>
          </div>
          <div>
            <p style={{ color: '#555', fontSize: 8, fontWeight: 700, letterSpacing: '0.2em' }}>ISSUED AT</p>
            <p style={{ color: '#888', fontSize: 10, fontWeight: 700, marginTop: 2 }}>{fmt(issuedAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="SEAT" value={seat} />
          <Field label="TIME" value={timeStr} accent />
          <Field label="RANK" value={hasRank ? `${rankNumber} / ${totalCount}` : '—'} />
          <Field
            label="TOP"
            value={hasRank ? `${rankPercentile!.toFixed(1)}%` : isRankPending ? '집계 중' : '—'}
            accent
          />
        </div>

        {!ranked && (
          <p style={{ color: '#FFB020', fontSize: 9, marginTop: 4 }}>
            ⚠ 다른 게스트가 먼저 사용한 닉네임이라 랭킹에 반영되지 않았습니다.
          </p>
        )}

        <p style={{ color: '#333', fontSize: 9 }}>
          본 티켓은 <strong style={{ color: '#555' }}>{nickname}</strong>님 전용이며 양도 시 효력이 없습니다.
        </p>
      </div>

      {/* ── 절취선 ── */}
      <div className="relative z-10 flex-shrink-0" style={{ width: 0 }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0,
          borderLeft: '2px dashed #2A2A2A',
        }} />
      </div>

      {/* 오른쪽 노치 */}
      <div className="absolute right-[calc(22%-10px)] top-0 z-20 flex flex-col justify-between h-full pointer-events-none" style={{ width: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: notchColor, marginTop: -1, marginLeft: -10 }} />
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: notchColor, marginBottom: -1, marginLeft: -10 }} />
      </div>

      {/* ── 스텁 (22%) ── */}
      <div
        className="flex flex-col items-center justify-between py-5 px-3 flex-shrink-0"
        style={{ width: '22%', background: '#080810' }}
      >
        <p style={{
          color: '#333', fontSize: 8, fontWeight: 900, letterSpacing: '0.4em',
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        }}>
          TICKET NUMBER
        </p>
        <p style={{
          color: '#CCCCCC', fontSize: 15, fontWeight: 900, letterSpacing: '0.2em',
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        }}>
          {stub}
        </p>
        <Barcode />
      </div>
    </div>
  );
}
