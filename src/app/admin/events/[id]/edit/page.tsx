'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BE_CATEGORY_MAP,
  KR_CATEGORY_MAP,
  EVENT_CATEGORIES,
  LIMITS,
  snapOpensAtToHour,
  validateEventForm,
  hasErrors,
  type EventCategory,
  type EventFormErrors,
} from '@/lib/adminEventValidation';
import { AVAILABLE_VENUES, getAdminVenueOption } from '@/data/live';
import {
  adminCancelEvent,
  adminUpdateEvent,
  getAdminEventStats,
  getEvent,
  type EventDetail,
  type EventStatus,
} from '@/lib/events';
import { ApiError } from '@/lib/errors';
import EventCancelModal from '@/components/admin/EventCancelModal';
import StatsSummaryCard from '@/components/admin/StatsSummaryCard';

/* ──────────────────────────────────────────
   /admin/events/[id]/edit — 이벤트 수정 (실 API)
   ─ GET /api/events/:id 로 로드 (관리자용 GET /api/admin/events/:id 는 명세 미제공 → public 조회 재사용)
   ─ PATCH /api/admin/events/:id 로 저장
   ─ 취소: POST /api/admin/events/:id/cancel
   ────────────────────────────────────────── */

const STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: '오픈 예정',
  open: '진행 중',
  closed: '종료',
  cancelled: '취소',
};

function toDatetimeLocal(iso: string): string {
  // 브라우저 로컬 타임존 기준으로 datetime-local 값 생성
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AdminEventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('콘서트');
  const [venueId, setVenueId] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [prize, setPrize] = useState('');
  const [posterColor, setPosterColor] = useState('#1E3A8A');
  const [posterInitial, setPosterInitial] = useState('');
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const detail = await getEvent(id);
      setEvent(detail);
      setTitle(detail.title);
      setCategory(KR_CATEGORY_MAP[detail.category]);
      setVenueId(detail.venueId);
      setOpensAt(toDatetimeLocal(detail.opensAt));
      setTotalSeats(String(detail.totalSeats));
      setPrize(detail.prize);
      setPosterColor(detail.posterColor);
      setPosterInitial(detail.posterInitial ?? '');
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : '이벤트를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const status: EventStatus = event?.status ?? 'scheduled';
  const canDelete = status === 'scheduled';
  const selectedVenue = useMemo(() => getAdminVenueOption(venueId), [venueId]);
  const isReadOnly = status === 'closed' || status === 'cancelled';

  function handleVenueSelect(nextVenueId: string) {
    setVenueId(nextVenueId);
    const opt = getAdminVenueOption(nextVenueId);
    if (opt) {
      setTotalSeats(String(opt.totalSeats));
      setTitle(opt.defaultTitle);
      setCategory(opt.defaultCategory as EventCategory);
    } else {
      setTotalSeats('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!event) return;
    const found = validateEventForm({
      title, category, venueId, opensAt, totalSeats,
      prize,
    });
    if (opensAt === toDatetimeLocal(event.opensAt)) delete found.opensAt;
    setErrors(found);
    if (hasErrors(found)) return;

    setPending(true);
    try {
      await adminUpdateEvent(event.eventId, {
        title: title.trim(),
        category: BE_CATEGORY_MAP[category],
        venueId,
        opensAt: new Date(opensAt).toISOString(),
        prize: prize.trim(),
        posterColor,
        ...(posterInitial ? { posterInitial } : {}),
      });
      router.push('/admin/events');
    } catch (err) {
      if (err instanceof ApiError) setSubmitError(err.message);
      else setSubmitError('이벤트 수정 중 오류가 발생했습니다.');
    } finally {
      setPending(false);
    }
  }

  function openCancelModal() {
    if (!event) return;
    setCancelError(null);
    setCancelOpen(true);
  }

  function closeCancelModal() {
    if (cancelPending) return;
    setCancelOpen(false);
    setCancelError(null);
  }

  async function handleConfirmCancel(reason: string) {
    if (!event) return;
    setCancelPending(true);
    setCancelError(null);
    try {
      await adminCancelEvent(event.eventId, reason);
      router.push('/admin/events');
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : '이벤트 취소 중 오류가 발생했습니다.');
    } finally {
      setCancelPending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-bg-subtle rounded animate-pulse" />
        <div className="card p-8 space-y-3">
          <div className="h-4 w-1/2 bg-bg-subtle rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-bg-subtle rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="card p-8 text-center space-y-3">
        <p className="text-sm text-danger-text">
          {loadError ?? '이벤트를 찾을 수 없습니다.'}
        </p>
        <Link href="/admin/events" className="btn btn-outline btn-sm">
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-text-tertiary mb-1">
            <Link href="/admin/events" className="hover:text-text-secondary">
              이벤트 관리
            </Link>
            {' / '}
            <span>수정</span>
          </p>
          <h1 className="text-2xl font-bold text-text">이벤트 수정</h1>
          <p className="mt-1 text-xs text-text-tertiary font-mono-tabular">
            #{event.eventId}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {canDelete && (
            <button
              type="button"
              onClick={openCancelModal}
              disabled={pending || cancelPending}
              className="btn btn-danger btn-sm"
            >
              이벤트 취소
            </button>
          )}
        </div>
      </div>

      <StatsSummaryCard
        title={event.title}
        loader={() => getAdminEventStats(event.eventId)}
        showRevenue
      />

      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text"
        >
          {submitError}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <form className="card p-6 space-y-6" onSubmit={handleSubmit} noValidate>
          <Field label="제목" required error={errors.title}>
            <TextInput value={title} onChange={setTitle} maxLength={LIMITS.title.max} />
          </Field>

          <Field
            label="카테고리"
            required
            error={errors.category}
            hint={status === 'open' ? '진행 중이라 수정 불가' : undefined}
          >
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              disabled={status === 'open' || isReadOnly}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-bg-subtle disabled:cursor-not-allowed"
            >
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field
            label="공연장"
            required
            hint={status === 'open' ? '진행 중이라 수정 불가' : '등록된 공연장만 선택 가능'}
            error={errors.venueId}
          >
            <div
              role="radiogroup"
              aria-label="공연장 선택"
              className="flex flex-wrap gap-2"
            >
              {AVAILABLE_VENUES.map((v) => {
                const active = v.venueId === venueId;
                return (
                  <button
                    key={v.venueId}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={status === 'open' || isReadOnly}
                    onClick={() => handleVenueSelect(v.venueId)}
                    className={[
                      'flex-1 min-w-[160px] text-left border rounded-lg px-3 py-2.5 transition-colors',
                      active
                        ? 'border-primary bg-primary-subtle'
                        : 'border-border bg-bg-surface hover:border-border-strong',
                      status === 'open' || isReadOnly
                        ? 'opacity-60 cursor-not-allowed'
                        : '',
                    ].join(' ')}
                  >
                    <p className="text-sm font-semibold text-text truncate">{v.name}</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5 font-mono-tabular">
                      오픈 {v.totalSeats.toLocaleString()}석
                    </p>
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="오픈 시각" required hint="정각(HH:00)만" error={errors.opensAt}>
              <input
                type="datetime-local"
                step={3600}
                value={opensAt}
                onChange={(e) => setOpensAt(snapOpensAtToHour(e.target.value))}
                disabled={status === 'open' || isReadOnly}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-bg-subtle disabled:cursor-not-allowed"
              />
            </Field>
            <Field label="오픈 좌석 수" required error={errors.totalSeats}>
              <input
                type="number"
                value={totalSeats}
                readOnly
                disabled
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-subtle text-text font-mono-tabular disabled:cursor-not-allowed"
              />
            </Field>
          </div>

          <Field label="상품" required error={errors.prize}>
            <TextInput value={prize} onChange={setPrize} maxLength={LIMITS.prize.max} />
          </Field>

          <div className="flex gap-2 pt-4 border-t border-border">
            <Link href="/admin/events" className="btn btn-neutral flex-1">
              취소
            </Link>
            <button
              type="submit"
              disabled={pending || isReadOnly}
              className="btn btn-solid flex-1"
            >
              {pending ? '저장 중…' : '변경 저장'}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold text-text-tertiary tracking-wider uppercase">
              현재 상태
            </p>
            <div>
              <span
                className={[
                  'badge',
                  status === 'scheduled'
                    ? 'badge-info'
                    : status === 'open'
                      ? 'badge-danger'
                      : 'badge-neutral',
                ].join(' ')}
              >
                {STATUS_LABEL[status]}
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              {status === 'scheduled'
                ? '오픈 전까지 전 필드 수정·취소 가능'
                : status === 'open'
                  ? '진행 중: 제목·포스터·상품만 수정 가능'
                  : '종료·취소 이벤트는 수정 불가'}
            </p>
          </div>

          <div className="card p-5 space-y-2">
            <p className="text-xs font-semibold text-text-tertiary tracking-wider uppercase">
              지표
            </p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary">신청자</span>
                <span className="font-mono-tabular font-semibold text-text">
                  {event.registeredCount}명
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">총 좌석</span>
                <span className="font-mono-tabular font-semibold text-text">
                  {event.totalSeats.toLocaleString()}석
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <EventCancelModal
        open={cancelOpen}
        eventTitle={event.title}
        registeredCount={event.registeredCount}
        pending={cancelPending}
        errorMessage={cancelError}
        onConfirm={handleConfirmCancel}
        onClose={closeCancelModal}
      />
    </div>
  );
}

function Field({
  label, required, hint, error, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  // 헤더는 항상 label 한 줄로 유지 → grid 열끼리 input 세로 위치 자동 일치.
  // hint 는 input 아래 헬퍼 텍스트로 배치.
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-semibold text-text-secondary truncate">
        {label}
        {required && <span className="text-danger-text ml-0.5">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="block text-[11px] text-text-tertiary">{hint}</span>
      )}
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
