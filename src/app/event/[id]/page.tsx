import type { Metadata } from 'next';
import Link from 'next/link';
import { getMockEvent, getEventStatus, getEventClosesAt } from '@/data/mockEvents';

export const metadata: Metadata = { title: '이벤트 상세' };

/* ──────────────────────────────────────────
   /event/[id] — 이벤트 상세 (무료·유료 공용)
   ─ type=live: "대기실 입장"
   ─ type=paid: 미참여 → "참여 신청 (500P)" · 참여 완료 → "대기실 입장"
   ────────────────────────────────────────── */

const STATUS_BADGE: Record<'scheduled' | 'open' | 'closed', { text: string; cls: string }> = {
  scheduled: { text: '오픈 예정', cls: 'badge-info' },
  open:      { text: '진행 중',   cls: 'badge-danger' },
  closed:    { text: '종료',      cls: 'badge-neutral' },
};

function formatDateTime(d: Date): string {
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

// 뼈대: 실제로는 GET /events/:id/entries/me
const MOCK_ALREADY_ENTERED = false;

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = getMockEvent(id);
  const opensAt = event.opensAtFn();
  const closesAt = getEventClosesAt(opensAt);
  const status = getEventStatus(opensAt);
  const st = STATUS_BADGE[status];

  const isPaid = event.type === 'paid';
  const isClosed = status === 'closed';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">

      {/* 헤더 */}
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary">{event.category}</span>
          <span className={`badge ${st.cls}`}>{st.text}</span>
          <span className="text-xs text-text-tertiary font-mono-tabular">#{event.id}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text leading-tight">
          {event.title}
        </h1>
        <p className="text-sm text-text-secondary">{event.venue}</p>
      </header>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* 포스터 */}
        <div
          className="aspect-[3/4] rounded-xl flex items-center justify-center relative"
          style={{ backgroundColor: event.posterColor }}
        >
          <span className="text-6xl font-black text-white/90 tracking-tight select-none">
            {event.posterInitial}
          </span>
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm text-[11px] font-medium text-white">
            POSTER
          </div>
        </div>

        {/* 정보 + CTA */}
        <div className="space-y-6">
          {/* 이벤트 정보 */}
          <div className="card p-5 space-y-3 text-sm">
            <InfoRow label="공연장" value={event.venue} />
            <InfoRow label="오픈"   value={formatDateTime(opensAt)} mono />
            <InfoRow label="종료"   value={formatDateTime(closesAt)} mono />
            <InfoRow label="좌석"   value={`${event.totalSeats.toLocaleString()}석`} mono />
            <InfoRow label="진행"   value="오픈 후 5분간" />
            {isPaid && (
              <>
                <InfoRow label="참여비" value={`${event.entryFeePoints!.toLocaleString()}P (또는 티켓 ${event.entryFeeTickets}매)`} mono />
                <InfoRow label="상품"   value={event.prize!} />
              </>
            )}
          </div>

          {/* 참여 CTA */}
          <div className="card p-5 space-y-3">
            <CTASection
              event={event}
              status={status}
              alreadyEntered={MOCK_ALREADY_ENTERED}
            />
          </div>

          {/* 규칙 요약 */}
          <div className="card p-5 space-y-2 bg-bg-subtle">
            <h3 className="text-sm font-semibold text-text">참여 규칙</h3>
            <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
              <li>이벤트는 오픈 시각부터 <strong className="text-text">5분간</strong> 진행됩니다.</li>
              {event.type === 'live' ? (
                <>
                  <li>성공한 사람 중 소요 시간 <strong className="text-text">TOP 10 회원</strong>에게 티켓 1매가 지급됩니다.</li>
                  <li>게스트도 참여 가능하지만 티켓 지급 대상은 회원 전용입니다.</li>
                </>
              ) : (
                <>
                  <li>성공한 사람 중 소요 시간 <strong className="text-text">TOP 3</strong>에게 기프티콘이 즉시 지급됩니다.</li>
                  <li>참여비는 오픈 전까지 취소 시 전액 환불됩니다.</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {isClosed && (
        <div className="card p-5 text-center text-sm text-text-secondary">
          이 이벤트는 종료되었습니다. <Link href={`/event/${id}/result`} className="text-primary font-semibold hover:underline">결과 보기 →</Link>
        </div>
      )}
    </div>
  );
}

// ── 컴포넌트 ────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-4 py-1.5">
      <span className="w-16 shrink-0 text-text-tertiary text-xs">{label}</span>
      <span className={['text-text flex-1', mono ? 'font-mono-tabular' : ''].join(' ')}>{value}</span>
    </div>
  );
}

function CTASection({
  event,
  status,
  alreadyEntered,
}: {
  event: ReturnType<typeof getMockEvent>;
  status: 'scheduled' | 'open' | 'closed';
  alreadyEntered: boolean;
}) {
  const isPaid = event.type === 'paid';

  // 종료된 이벤트
  if (status === 'closed') {
    return (
      <Link href={`/event/${event.id}/result`} className="btn btn-neutral btn-lg w-full">
        결과 보기
      </Link>
    );
  }

  // 유료 미참여
  if (isPaid && !alreadyEntered) {
    return (
      <>
        <Link href={`/event/${event.id}/checkout`} className="btn btn-solid btn-lg w-full">
          참여 신청 ({event.entryFeePoints!.toLocaleString()}P)
        </Link>
        <p className="text-[11px] text-text-tertiary text-center">
          로그인이 필요합니다. 참여비는 오픈 전까지 전액 환불됩니다.
        </p>
      </>
    );
  }

  // 무료 or 유료 참여 완료 → 대기실
  return (
    <>
      <Link href={`/event/${event.id}/wait`} className="btn btn-solid btn-lg w-full">
        {status === 'open' ? '지금 입장하기' : '대기실 입장'}
      </Link>
      {isPaid && alreadyEntered && (
        <p className="text-[11px] text-success-text text-center font-medium">
          ✓ 참여 신청 완료 · 오픈 시각에 대기실이 자동으로 열립니다
        </p>
      )}
    </>
  );
}
