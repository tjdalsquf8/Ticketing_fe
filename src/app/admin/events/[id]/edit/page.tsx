'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import {
  EVENT_CATEGORIES,
  LIMITS,
  isHexColor,
  normalizePosterInitial,
  validateEventForm,
  hasErrors,
  type EventCategory,
  type EventType,
  type EventFormErrors,
} from '@/lib/adminEventValidation';

/* ──────────────────────────────────────────
   /admin/events/[id]/edit — 이벤트 수정
   ─ 뼈대: 초기값은 mock. 실제로는 GET /admin/events/:id 로 로드
   ─ PUT /admin/events/:id 로 저장 (미연결)
   ────────────────────────────────────────── */

const IS_DEV = process.env.NODE_ENV !== 'production';

// 뼈대 초기값
const INITIAL = {
  type: 'paid' as EventType,
  title: '아이유 The Golden Hour 앙코르',
  category: '콘서트' as EventCategory,
  venue: '고척스카이돔',
  posterColor: '#DB2777',
  posterInitial: 'IU',
  opensAt: '2026-08-15T20:00',
  totalSeats: '8000',
  entryFeePoints: '500',
  entryFeeTickets: '5',
  prize: '스타벅스 30,000원 상품권 × TOP 3',
  status: 'scheduled' as 'scheduled' | 'open' | 'closed',
};

export default function AdminEventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [type, setType] = useState<EventType>(INITIAL.type);
  const [title, setTitle] = useState(INITIAL.title);
  const [category, setCategory] = useState<EventCategory>(INITIAL.category);
  const [venue, setVenue] = useState(INITIAL.venue);
  const [posterColor, setPosterColor] = useState(INITIAL.posterColor);
  const [posterInitial, setPosterInitial] = useState(INITIAL.posterInitial);
  const [opensAt, setOpensAt] = useState(INITIAL.opensAt);
  const [totalSeats, setTotalSeats] = useState(INITIAL.totalSeats);
  const [entryFeePoints, setEntryFeePoints] = useState(INITIAL.entryFeePoints);
  const [entryFeeTickets, setEntryFeeTickets] = useState(INITIAL.entryFeeTickets);
  const [prize, setPrize] = useState(INITIAL.prize);
  const [errors, setErrors] = useState<EventFormErrors>({});

  const isPaid = type === 'paid';
  const canDelete = INITIAL.status === 'scheduled';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // 수정 폼은 과거의 opensAt를 그대로 유지하는 케이스가 있어
    // opensAt만 예외적으로 검증에서 제외한다(값을 바꾼 경우에만 검증하고 싶다면
    // 별도 dirty flag 필요 — 백엔드 연결 시 정리).
    const found = validateEventForm({
      type, title, category, venue, posterColor,
      posterInitial, opensAt, totalSeats,
      entryFeePoints, entryFeeTickets, prize,
    });
    // opensAt이 초기값 그대로면 검증 오류 무시(과거 시각 허용).
    if (opensAt === INITIAL.opensAt) delete found.opensAt;
    setErrors(found);
    if (hasErrors(found)) return;

    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.info(`[admin/events/${id}/edit] 검증 통과 (API 미연결)`, {
        type, title, category, venue, posterColor,
        posterInitial, opensAt, totalSeats,
        entryFeePoints, entryFeeTickets, prize,
      });
    }
  }

  return (
    <div className="space-y-8">

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-text-tertiary mb-1">
            <Link href="/admin/events" className="hover:text-text-secondary">이벤트 관리</Link>
            {' / '}
            <span>수정</span>
          </p>
          <h1 className="text-2xl font-bold text-text">이벤트 수정</h1>
          <p className="mt-1 text-xs text-text-tertiary font-mono-tabular">#{id}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {INITIAL.status === 'open' && (
            <button type="button" className="btn btn-outline btn-sm">강제 정산</button>
          )}
          {canDelete && (
            <button type="button" className="btn btn-danger btn-sm">삭제</button>
          )}
        </div>
      </div>

      {/* 미연결 배너 */}
      <div className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-text">
        <p className="font-semibold">API 미연결</p>
        <p className="text-xs mt-0.5 opacity-90">
          이 폼은 아직 백엔드에 연결되어 있지 않습니다. 저장 버튼을 눌러도 실제로 저장되지 않으니
          검증만 참고해 주세요.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <form className="card p-6 space-y-6" onSubmit={handleSubmit} noValidate>
          {/* 타입 */}
          <Field label="이벤트 타입" required error={errors.type}>
            <div className="flex gap-2">
              {(['live', 'paid'] as EventType[]).map((t) => (
                <label
                  key={t}
                  className={[
                    'flex-1 border rounded-lg px-4 py-3 cursor-pointer transition-colors',
                    t === type ? 'border-primary bg-primary-subtle' : 'border-border hover:border-border-strong',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={t === type}
                    onChange={() => setType(t)}
                    className="sr-only"
                  />
                  <p className="font-semibold text-text">{t === 'live' ? '라이브 (무료)' : '유료'}</p>
                </label>
              ))}
            </div>
          </Field>

          <Field label="제목" required error={errors.title}>
            <TextInput value={title} onChange={setTitle} maxLength={LIMITS.title.max} />
          </Field>

          <Field label="카테고리" required error={errors.category}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="공연장" required error={errors.venue}>
            <TextInput value={venue} onChange={setVenue} maxLength={LIMITS.venue.max} />
          </Field>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="포스터 이니셜" error={errors.posterInitial}>
              <TextInput
                value={posterInitial}
                onChange={(v) => setPosterInitial(normalizePosterInitial(v))}
                maxLength={LIMITS.posterInitial.max}
              />
            </Field>
            <Field label="배경 색상" error={errors.posterColor}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={isHexColor(posterColor) ? posterColor : '#000000'}
                  onChange={(e) => setPosterColor(e.target.value)}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={posterColor}
                  onChange={(e) => setPosterColor(e.target.value)}
                  maxLength={7}
                  pattern="^#[0-9a-fA-F]{6}$"
                  className="flex-1 min-w-0 px-2 py-2 rounded-md border border-border bg-bg-surface text-text text-sm font-mono-tabular focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="오픈 시각" required error={errors.opensAt}>
              <input
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="총 좌석 수" required error={errors.totalSeats}>
              <input
                type="number"
                inputMode="numeric"
                min={LIMITS.totalSeats.min}
                max={LIMITS.totalSeats.max}
                step={1}
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text font-mono-tabular focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
          </div>

          {isPaid && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="참여비 (포인트)" required error={errors.entryFeePoints}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={LIMITS.entryFeePoints.min}
                    max={LIMITS.entryFeePoints.max}
                    step={1}
                    value={entryFeePoints}
                    onChange={(e) => setEntryFeePoints(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text font-mono-tabular focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </Field>
                <Field label="참여비 (티켓)" required error={errors.entryFeeTickets}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={LIMITS.entryFeeTickets.min}
                    max={LIMITS.entryFeeTickets.max}
                    step={1}
                    value={entryFeeTickets}
                    onChange={(e) => setEntryFeeTickets(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text font-mono-tabular focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </Field>
              </div>

              <Field label="상품" required error={errors.prize}>
                <TextInput value={prize} onChange={setPrize} maxLength={LIMITS.prize.max} />
              </Field>
            </>
          )}

          <div className="flex gap-2 pt-4 border-t border-border">
            <Link href="/admin/events" className="btn btn-neutral flex-1">
              취소
            </Link>
            <button type="submit" className="btn btn-solid flex-1">
              변경 저장
            </button>
          </div>
        </form>

        {/* 상태·이벤트 요약 사이드 */}
        <aside className="space-y-4">
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold text-text-tertiary tracking-wider uppercase">현재 상태</p>
            <div>
              <span className={[
                'badge',
                INITIAL.status === 'scheduled' ? 'badge-info' : INITIAL.status === 'open' ? 'badge-danger' : 'badge-neutral',
              ].join(' ')}>
                {INITIAL.status === 'scheduled' ? '오픈 예정' : INITIAL.status === 'open' ? '진행 중' : '종료'}
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              {INITIAL.status === 'scheduled'
                ? '오픈 전까지 수정·삭제 가능합니다.'
                : INITIAL.status === 'open'
                ? '진행 중 이벤트는 강제 정산으로 즉시 종료할 수 있습니다.'
                : '종료된 이벤트는 참고용으로만 열람됩니다.'}
            </p>
          </div>

          <div className="card p-5 space-y-2">
            <p className="text-xs font-semibold text-text-tertiary tracking-wider uppercase">지표</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary">참여 신청</span>
                <span className="font-mono-tabular font-semibold text-text">342명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">누적 수익</span>
                <span className="font-mono-tabular font-semibold text-text">171,000P</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}

// ── 하위 컴포넌트 ────────────────────────────────────

function Field({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-text-secondary">
        {label}
        {required && <span className="text-danger-text ml-0.5">*</span>}
      </span>
      {children}
      {error && (
        <span className="block text-xs text-danger-text" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}
