'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BE_CATEGORY_MAP,
  EVENT_CATEGORIES,
  LIMITS,
  snapOpensAtToHour,
  validateEventForm,
  hasErrors,
  type EventCategory,
  type EventFormErrors,
} from '@/lib/adminEventValidation';
import { AVAILABLE_VENUES, getAdminVenueOption } from '@/data/live';
import { adminCreateEvent } from '@/lib/events';
import { ApiError } from '@/lib/errors';

/* ──────────────────────────────────────────
   /admin/events/new — 이벤트 생성 (실 API)
   ─ POST /api/admin/events
   ─ opensAt: HTML datetime-local (로컬시각) → ISO 문자열로 변환하여 전송
   ─ 카테고리는 FE 한글 → BE 영문 매핑
   ────────────────────────────────────────── */

// BE 스펙(POST /admin/events) 은 posterColor 필수, posterInitial 선택.
// 프론트 UI 에서는 노출하지 않고 고정값으로 전송한다. 실제 미리보기는 venue.posterImage 로 렌더.
const DEFAULT_POSTER_COLOR = '#1E3A8A';

export default function AdminEventNewPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('콘서트');
  const [venueId, setVenueId] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [prize, setPrize] = useState('');
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedVenue = useMemo(() => getAdminVenueOption(venueId), [venueId]);

  useEffect(() => {
    if (venueId) return;
    const first = AVAILABLE_VENUES[0];
    if (!first) return;
    setVenueId(first.venueId);
    setTotalSeats(String(first.totalSeats));
    setTitle(first.defaultTitle);
    setCategory(first.defaultCategory as EventCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleVenueSelect(nextVenueId: string) {
    setVenueId(nextVenueId);
    const opt = getAdminVenueOption(nextVenueId);
    setTotalSeats(opt ? String(opt.totalSeats) : '');
    if (opt) {
      setTitle(opt.defaultTitle);
      setCategory(opt.defaultCategory as EventCategory);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const found = validateEventForm({
      title, category, venueId, opensAt, totalSeats,
      prize,
    });
    setErrors(found);
    if (hasErrors(found)) return;

    setPending(true);
    try {
      await adminCreateEvent({
        title: title.trim(),
        category: BE_CATEGORY_MAP[category],
        venueId,
        opensAt: new Date(opensAt).toISOString(),
        entryFeePoints: 0,
        prize: prize.trim(),
        posterColor: DEFAULT_POSTER_COLOR,
      });
      router.push('/admin/events');
    } catch (err) {
      if (err instanceof ApiError) setSubmitError(err.message);
      else setSubmitError('이벤트 생성 중 오류가 발생했습니다.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-text-tertiary mb-1">
          <Link href="/admin/events" className="hover:text-text-secondary">
            이벤트 관리
          </Link>
          {' / '}
          <span>새 이벤트</span>
        </p>
        <h1 className="text-2xl font-bold text-text">새 이벤트 생성</h1>
      </div>

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
            <TextInput
              value={title}
              onChange={setTitle}
              placeholder="예: 아이유 The Golden Hour 앙코르"
              maxLength={LIMITS.title.max}
            />
          </Field>

          <Field label="카테고리" required error={errors.category}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field
            label="공연장"
            required
            hint="등록된 좌석 배치가 있는 공연장만 선택 가능"
            error={errors.venueId}
          >
            {AVAILABLE_VENUES.length === 0 ? (
              <p className="text-sm text-text-tertiary px-3 py-4 rounded-md border border-border bg-bg-subtle">
                공연장 미등록. 먼저 venue 데이터를 등록해 주세요.
              </p>
            ) : (
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
                      onClick={() => handleVenueSelect(v.venueId)}
                      className={[
                        'flex-1 min-w-[160px] text-left border rounded-lg px-3 py-2.5 transition-colors',
                        active
                          ? 'border-primary bg-primary-subtle'
                          : 'border-border bg-bg-surface hover:border-border-strong',
                      ].join(' ')}
                    >
                      <p className="text-sm font-semibold text-text truncate">{v.name}</p>
                      <p className="text-[11px] text-text-tertiary mt-0.5 font-mono-tabular">
                        오픈 {v.totalSeats.toLocaleString()}석
                        {v.layout ? ` · layout=${v.layout}` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="오픈 시각" required hint="정각(HH:00)만 · 최대 1년 이내" error={errors.opensAt}>
              <input
                type="datetime-local"
                step={3600}
                value={opensAt}
                onChange={(e) => setOpensAt(snapOpensAtToHour(e.target.value))}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field
              label="오픈 좌석 수"
              required
              hint={selectedVenue ? '공연장 선택으로 자동 설정' : '공연장을 먼저 선택하세요'}
              error={errors.totalSeats}
            >
              <input
                type="number"
                inputMode="numeric"
                value={totalSeats}
                readOnly
                disabled={!selectedVenue}
                placeholder={selectedVenue ? '' : '공연장 선택 필요'}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-subtle text-text font-mono-tabular disabled:text-text-disabled disabled:cursor-not-allowed"
              />
            </Field>
          </div>

          <Field label="상품" required hint="TOP 지급 상품 설명" error={errors.prize}>
            <TextInput
              value={prize}
              onChange={setPrize}
              placeholder="예: 스타벅스 30,000원 상품권 × TOP 3"
              maxLength={LIMITS.prize.max}
            />
          </Field>

          <div className="flex gap-2 pt-4 border-t border-border">
            <Link href="/admin/events" className="btn btn-neutral flex-1">
              취소
            </Link>
            <button type="submit" disabled={pending} className="btn btn-solid flex-1">
              {pending ? '생성 중…' : '이벤트 생성'}
            </button>
          </div>
        </form>

        <aside className="space-y-3">
          <p className="text-xs font-semibold text-text-tertiary tracking-wider uppercase">
            미리보기
          </p>
          <div className="card overflow-hidden sticky top-20">
            <div className="aspect-[3/4] relative bg-bg-subtle">
              {selectedVenue?.posterImage ? (
                <Image
                  src={selectedVenue.posterImage}
                  alt={selectedVenue.name}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-text-tertiary text-sm">
                  공연장 선택 시 이미지 표시
                </div>
              )}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-[10px] font-semibold text-white z-10">
                {category}
              </div>
            </div>
            <div className="p-4 space-y-1.5">
              <p className="text-sm font-bold text-text truncate">
                {title || '(제목 미입력)'}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {selectedVenue?.name ?? '(공연장 미선택)'}
              </p>
              <p className="text-xs text-text-tertiary pt-1">
                {opensAt ? new Date(opensAt).toLocaleString('ko-KR') : '(오픈 시각 미설정)'}
              </p>
              <p className="text-xs text-primary font-semibold pt-1">
                {prize || '(상품 미입력)'}
              </p>
            </div>
          </div>
        </aside>
      </div>
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
  // hint 는 input 아래 헬퍼 텍스트로 배치 (Toss/Linear 관행).
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
