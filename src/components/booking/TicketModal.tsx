'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ─────────────────────────────────────────────
   TicketModal — 가로형 콘서트 티켓
   ───────────────────────────────────────────── */

export interface TicketData {
  eventTitle:     string;
  seat:           string;
  nickname:       string;
  isGuest:        boolean;
  elapsedMs:      number;
  rankNumber:     number;
  totalCount:     number;
  rankPercentile: number;
  serial:         string;
  issuedAt:       Date;
}

interface Props extends TicketData {
  onClose:  () => void;
  onRetry:  () => void;
}

function fmt(d: Date) {
  const z = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}.${z(d.getMonth()+1)}.${z(d.getDate())}  ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}.${z(d.getMilliseconds(),3)}`;
}

/* 장식 SVG (추상 원·선) */
function Deco() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 220" fill="none" preserveAspectRatio="xMidYMid slice">
      {/* 큰 원 */}
      <circle cx="60" cy="170" r="110" stroke="#E85D00" strokeWidth="1.5" strokeOpacity="0.18" />
      <circle cx="60" cy="170" r="80"  stroke="#FF2D78" strokeWidth="1"   strokeOpacity="0.12" />
      <circle cx="230" cy="30" r="70"  stroke="#00D4FF" strokeWidth="1"   strokeOpacity="0.1" />
      {/* 곡선 라인 */}
      <path d="M0 140 Q80 80 180 130 T280 100" stroke="#00D4FF" strokeWidth="1" strokeOpacity="0.15" />
      <path d="M0 160 Q90 100 190 150 T280 120" stroke="#FF2D78" strokeWidth="0.8" strokeOpacity="0.12" />
      <path d="M20 200 Q100 140 200 180" stroke="#E85D00" strokeWidth="1" strokeOpacity="0.2" />
      {/* 점 */}
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

export default function TicketModal(props: Props) {
  const { eventTitle, seat, nickname, isGuest,
          elapsedMs, rankNumber, totalCount, rankPercentile,
          serial, issuedAt, onClose, onRetry } = props;

  const [saved, setSaved] = useState(false);
  const stub = (serial.split('-')[2] ?? '00000').padStart(7, '0');
  const timeStr = (elapsedMs / 1000).toFixed(3) + 's';

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 닫기 */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: 700 }}>
        <div />
        <button onClick={onClose} className="text-white/40 hover:text-white text-sm transition-colors">
          닫기 ✕
        </button>
      </div>

      {/* ── 티켓 카드 (가로형) ── */}
      <div
        className="relative flex w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxWidth: 700, minHeight: 220, fontFamily: '"Courier New", Courier, monospace' }}
      >
        {/* 왼쪽 노치 */}
        <div className="absolute left-[calc(38%-10px)] top-0 z-20 flex flex-col justify-between h-full pointer-events-none" style={{ width: 0 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.85)', marginTop: -1, marginLeft: -10 }} />
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.85)', marginBottom: -1, marginLeft: -10 }} />
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
              <p style={{ color: '#555', fontSize: 8, marginTop: 2, letterSpacing: '0.15em' }}>PRACTICE MODE</p>
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
            <Field label="RANK" value={`${rankNumber} / ${totalCount}`} />
            <Field label="TOP"  value={`${rankPercentile.toFixed(1)}%`} accent />
          </div>

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
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.85)', marginTop: -1, marginLeft: -10 }} />
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.85)', marginBottom: -1, marginLeft: -10 }} />
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

      {/* ── 하단 버튼 줄 ── */}
      <div className="flex items-center gap-3 w-full" style={{ maxWidth: 700 }}>
        {/* 다시하기 */}
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          다시하기
        </button>

        {/* 순위보러가기 */}
        <Link
          href="/ranking"
          onClick={onClose}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          순위 보러가기
        </Link>

        {/* 저장 (로그인 유저만) */}
        {!isGuest && (
          <button
            onClick={() => setSaved(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ml-auto"
            style={saved
              ? { background: '#166534', color: '#86EFAC', border: '1px solid #166534' }
              : { background: '#E85D00', color: '#FFFFFF', border: '1px solid #E85D00' }
            }
          >
            {saved ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                저장됨
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                티켓함에 저장
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
