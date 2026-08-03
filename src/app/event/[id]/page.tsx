'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BLUE = '#1D4ED8';

const EVENT = {
  id: 'e001',
  title: '싸이홈빽쇼 SUMMERSWAG2026 - 수원',
  subtitle: '콘서트 주간 19위',
  venue: '수원월드컵경기장 보조경기장',
  period: '2026.08.01 ~2026.08.02',
  ageLimit: '전체관람가',
  prices: [
    { tier: '스탠딩SR', price: 185_000 },
    { tier: '스탠딩R',  price: 175_000 },
    { tier: '지정석',   price: 185_000 },
  ],
  availableDates: ['2026-08-01', '2026-08-02'],
  sessions: {
    '2026-08-01': [
      { label: '1회 18:00', time: '18시 00분' },
    ],
    '2026-08-02': [
      { label: '1회 18:00', time: '18시 00분' },
    ],
  } as Record<string, { label: string; time: string }[]>,
  relatedShows: [
    { title: '싸이홈빽쇼 SUMMERSWAG2026 - 광주', date: '2026.08.08' },
  ],
};

const CAL_YEAR  = 2026;
const CAL_MONTH = 8;
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function buildCalendar(year: number, month: number) {
  const first   = new Date(year, month - 1, 1).getDay();
  const daysInM = new Date(year, month, 0).getDate();
  return { first, daysInM };
}

export default function EventDetailPage() {
  const router = useRouter();
  const [selectedDate,    setSelectedDate]    = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [calOpen,         setCalOpen]         = useState(true);
  const [sessionOpen,     setSessionOpen]     = useState(true);

  const { first, daysInM } = buildCalendar(CAL_YEAR, CAL_MONTH);
  const sessions = selectedDate ? (EVENT.sessions[selectedDate] ?? []) : [];

  const handleBooking = () => {
    if (!selectedDate || selectedSession === null) return;
    const sess = sessions[selectedSession];
    router.push(
      `/event/${EVENT.id}/wait?date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(sess.time)}`
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 bg-white">
      {/* 배지 */}
      <div className="flex gap-2 mb-3">
        <span className="inline-flex items-center gap-1 border border-[#1D4ED8] text-[#1D4ED8] text-xs px-2 py-0.5 rounded-sm font-medium">
          단독판매
        </span>
        <span className="inline-flex items-center gap-1 border border-[#94A3B8] text-[#64748B] text-xs px-2 py-0.5 rounded-sm">
          안심예매 ⓘ
        </span>
      </div>

      <h1 className="text-2xl font-bold text-[#111827]">{EVENT.title}</h1>
      <p className="text-sm text-[#6B7280] mt-1">{EVENT.subtitle}</p>

      <div className="mt-5 flex flex-col lg:flex-row gap-6">
        {/* ── 왼쪽: 포스터 + 이벤트 정보 ── */}
        <div className="flex-1 flex flex-col sm:flex-row gap-6">
          {/* 포스터 */}
          <div
            className="shrink-0 rounded border border-[#E5E7EB] bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] text-xs"
            style={{ width: 220, height: 280 }}
          >
            포스터 이미지
          </div>

          {/* 메타 정보 */}
          <div className="flex-1 space-y-3 text-sm">
            {/* 장소 */}
            <div className="flex gap-4 py-2 border-b border-[#F3F4F6]">
              <span className="w-20 shrink-0 text-[#6B7280]">장소</span>
              <button className="text-[#111827] hover:underline text-left">
                {EVENT.venue}▶
              </button>
            </div>

            {/* 공연기간 */}
            <div className="flex gap-4 py-2 border-b border-[#F3F4F6]">
              <span className="w-20 shrink-0 text-[#6B7280]">공연기간</span>
              <span className="text-[#111827]">{EVENT.period}</span>
            </div>

            {/* 관람연령 */}
            <div className="flex gap-4 py-2 border-b border-[#F3F4F6]">
              <span className="w-20 shrink-0 text-[#6B7280]">관람연령</span>
              <span className="text-[#111827]">{EVENT.ageLimit}</span>
            </div>

            {/* 가격 */}
            <div className="flex gap-4 py-2 border-b border-[#F3F4F6]">
              <span className="w-20 shrink-0 text-[#6B7280]">가격</span>
              <div className="space-y-1">
                <button className="text-[#1D4ED8] text-xs hover:underline font-medium">
                  전체가격보기 ▶
                </button>
                {EVENT.prices.map(p => (
                  <p key={p.tier} className="text-[#111827]">
                    <strong className="font-medium">{p.tier}</strong>{' '}
                    {p.price.toLocaleString('ko-KR')}원
                  </p>
                ))}
              </div>
            </div>

            {/* 혜택 */}
            <div className="flex gap-4 py-2 border-b border-[#F3F4F6]">
              <span className="w-20 shrink-0 text-[#6B7280]">혜택</span>
              <div className="space-y-1">
                <button className="text-[#111827] text-sm hover:underline">무이자할부▶</button>
                <div>
                  <button className="text-[#1D4ED8] text-xs hover:underline block text-left">
                    <span className="text-[#E91E63] font-bold">NOL</span>카드 8만원 할인 쿠폰+2만원 캐시백 ▶
                  </button>
                </div>
                <div>
                  <button className="text-[#1D4ED8] text-xs hover:underline block text-left">
                    <span className="text-[#FF6B00] font-bold">t</span>oping 가입하고 중복할인 쿠폰받기 ▶
                  </button>
                </div>
              </div>
            </div>

            {/* 배송 */}
            <div className="flex gap-4 py-2">
              <span className="w-20 shrink-0 text-[#6B7280]">배송</span>
              <div className="text-[#111827] text-sm space-y-0.5">
                <p>일괄배송: 7월 09일(목) ~ 7월 15일(수), 5일간</p>
                <button className="text-[#1D4ED8] text-xs hover:underline">배송주소 확인 ▶</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 관람일 + 회차 + 버튼 ── */}
        <div className="lg:w-[290px] shrink-0 space-y-2">
          <div className="border border-[#E5E7EB] rounded">
            {/* 관람일 */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm text-[#111827]">관람일</span>
                <button
                  onClick={() => setCalOpen(v => !v)}
                  className="text-[#9CA3AF] text-base leading-none"
                >
                  {calOpen ? '∧' : '∨'}
                </button>
              </div>

              {calOpen && (
                <>
                  {/* 월 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <button className="text-[#6B7280] px-1 hover:text-[#111827]">‹</button>
                    <span className="text-sm font-semibold text-[#111827]">
                      {CAL_YEAR}. {String(CAL_MONTH).padStart(2, '0')}
                    </span>
                    <button className="text-[#6B7280] px-1 hover:text-[#111827]">›</button>
                  </div>

                  {/* 요일 헤더 */}
                  <div className="grid grid-cols-7 text-center mb-1">
                    {DAY_LABELS.map((d, i) => (
                      <span
                        key={d}
                        className={[
                          'text-xs font-medium',
                          i === 0 ? 'text-[#DC2626]' :
                          i === 6 ? 'text-[#1D4ED8]' :
                                    'text-[#9CA3AF]',
                        ].join(' ')}
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* 날짜 그리드 */}
                  <div className="grid grid-cols-7 gap-y-1 text-center">
                    {Array.from({ length: first }).map((_, i) => (
                      <div key={`e${i}`} />
                    ))}
                    {Array.from({ length: daysInM }, (_, i) => {
                      const d   = i + 1;
                      const key = `${CAL_YEAR}-${String(CAL_MONTH).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                      const avail = EVENT.availableDates.includes(key);
                      const sel   = selectedDate === key;
                      const dow   = (first + i) % 7;
                      return (
                        <button
                          key={d}
                          disabled={!avail}
                          onClick={() => { setSelectedDate(key); setSelectedSession(null); }}
                          className={[
                            'text-xs py-1 rounded-full mx-auto w-7 h-7 flex items-center justify-center font-medium transition-colors',
                            sel
                              ? 'text-white'
                              : avail
                              ? 'font-semibold hover:bg-blue-50'
                              : 'cursor-not-allowed opacity-40',
                            !sel && dow === 0 ? 'text-[#DC2626]' :
                            !sel && dow === 6 ? 'text-[#1D4ED8]' :
                            !sel             ? 'text-[#111827]'  : '',
                          ].join(' ')}
                          style={sel ? { backgroundColor: BLUE } : undefined}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* 회차 */}
            {selectedDate && (
              <>
                <div className="border-t border-[#E5E7EB]" />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm text-[#111827]">회차</span>
                    <button
                      onClick={() => setSessionOpen(v => !v)}
                      className="text-[#9CA3AF] text-base leading-none"
                    >
                      {sessionOpen ? '∧' : '∨'}
                    </button>
                  </div>

                  {sessionOpen && (
                    <div className="space-y-2">
                      {sessions.map((s, i) => {
                        const sel = selectedSession === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedSession(i)}
                            className="w-full rounded border px-3 py-2.5 text-left transition-colors"
                            style={{
                              borderColor: sel ? BLUE : '#E5E7EB',
                              backgroundColor: sel ? '#EFF6FF' : '#FFFFFF',
                            }}
                          >
                            <p
                              className="text-sm font-semibold"
                              style={{ color: sel ? BLUE : '#111827' }}
                            >
                              {s.label}
                            </p>
                            <p className="text-xs text-[#9CA3AF] mt-0.5">
                              스탠딩SR 0석 / 스탠딩R 0석 / 지정석 0석
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 예매하기 */}
          <button
            onClick={handleBooking}
            disabled={!selectedDate || selectedSession === null}
            className="w-full py-3.5 rounded font-bold text-base text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: BLUE }}
          >
            예매하기
          </button>

          {/* BOOKING / 外國語 */}
          <button
            className="w-full py-3 rounded border font-bold text-sm transition-colors hover:bg-blue-50"
            style={{ borderColor: BLUE, color: BLUE }}
          >
            BOOKING / 外國語
          </button>
        </div>
      </div>

      {/* 관련공연 */}
      {EVENT.relatedShows.length > 0 && (
        <div className="mt-8 border-t border-[#E5E7EB] pt-4">
          <p className="text-sm font-semibold text-[#111827] mb-3">관련공연</p>
          <div className="space-y-2">
            {EVENT.relatedShows.map((show, i) => (
              <div key={i} className="border border-[#E5E7EB] rounded px-4 py-3">
                <p className="text-sm text-[#111827]">{show.title}</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">{show.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
