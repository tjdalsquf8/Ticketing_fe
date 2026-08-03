import Link from 'next/link';

/* ──────────────────────────────────────────
   홈 — 이벤트 안내 + 카운트다운
   ────────────────────────────────────────── */

const UPCOMING_EVENT = {
  id: 'e001',
  title: '스타벅스 아메리카노 이벤트',
  openAt: '2026.08.01 12:00',
  stock: 100,
  countdown: { h: '00', m: '08', s: '42' },
};

const EVENT_LIST = [
  { id: 'e002', title: '투썸 딸기케이크 이벤트',  openAt: '2026.08.02 18:00', stock: 50,  status: 'upcoming' as const },
  { id: 'e003', title: '메가커피 1+1 이벤트',      openAt: '2026.08.03 12:00', stock: 200, status: 'upcoming' as const },
  { id: 'e001', title: '스타벅스 아메리카노 이벤트', openAt: '2026.07.31 12:00', stock: 0,  status: 'closed'   as const },
];

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  live:     { text: '진행 중',   cls: 'badge-danger'  },
  upcoming: { text: '오픈 예정', cls: 'badge-info'    },
  closed:   { text: '종료',      cls: 'badge-neutral' },
};

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-14">

      {/* ── Hero: 다음 이벤트 카운트다운 ── */}
      <section className="card p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
        <div className="space-y-3">
          <span className="badge badge-danger">곧 오픈</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            {UPCOMING_EVENT.title}
          </h1>
          <p className="text-sm text-text-secondary">
            오픈 일시: <strong className="text-text">{UPCOMING_EVENT.openAt}</strong>
            &nbsp;·&nbsp;선착순 <strong className="text-text">{UPCOMING_EVENT.stock}명</strong>
          </p>
          <div className="pt-2">
            <Link href={`/event/${UPCOMING_EVENT.id}`} className="btn btn-solid">
              이벤트 보러가기
            </Link>
          </div>
        </div>

        {/* 카운트다운 */}
        <div className="shrink-0">
          <p className="text-xs text-text-tertiary mb-3 text-center">오픈까지</p>
          <div className="flex items-end gap-1">
            {[
              { val: UPCOMING_EVENT.countdown.h, unit: '시간' },
              { val: UPCOMING_EVENT.countdown.m, unit: '분'   },
              { val: UPCOMING_EVENT.countdown.s, unit: '초'   },
            ].map(({ val, unit }, i) => (
              <div key={i} className="flex items-end gap-1">
                {i > 0 && (
                  <span className="text-2xl font-light text-text-tertiary mb-1">:</span>
                )}
                <div className="text-center min-w-[3rem]">
                  <span className="font-mono-tabular text-4xl font-bold text-text">{val}</span>
                  <p className="text-xs text-text-tertiary mt-0.5">{unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 이벤트 목록 ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text">이벤트 목록</h2>
        </div>
        <div className="space-y-3">
          {EVENT_LIST.map((ev) => {
            const st = STATUS_LABEL[ev.status];
            return (
              <Link
                key={ev.id + ev.openAt}
                href={`/event/${ev.id}`}
                className="card p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-border-strong transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className={`badge ${st.cls} shrink-0`}>{st.text}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate group-hover:text-primary transition-colors">
                      {ev.title}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">{ev.openAt}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-text-tertiary">
                    {ev.status === 'closed' ? '종료' : `선착순 ${ev.stock}명`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 서비스 소개 ── */}
      <section>
        <h2 className="text-lg font-bold text-text mb-5">어떻게 동작하나요?</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              step: '01',
              title: '연습 모드로 손 풀기',
              desc: '상시 개방된 모의 티켓팅으로 클릭 반응속도와 예매 플로우를 익히세요.',
            },
            {
              step: '02',
              title: '실전 이벤트 선착순 도전',
              desc: '매일 정해진 시간에 오픈되는 실전 이벤트에서 선착순 성공을 노리세요.',
            },
            {
              step: '03',
              title: '티켓 모아서 리워드 교환',
              desc: '성공할 때마다 발급되는 티켓을 10매 모으면 기프티콘으로 교환하세요.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="card p-5 space-y-2">
              <span className="text-xs font-bold text-primary font-mono-tabular">{step}</span>
              <p className="text-sm font-semibold text-text">{title}</p>
              <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
