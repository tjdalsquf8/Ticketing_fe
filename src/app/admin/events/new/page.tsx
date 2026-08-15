'use client';

import { useState } from 'react';
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
   /admin/events/new — 이벤트 생성 폼
   ─ 타입(live/paid)에 따라 조건부 필드
   ─ 뼈대: 실제로는 POST /admin/events (미연결)
   ────────────────────────────────────────── */

const IS_DEV = process.env.NODE_ENV !== 'production';

export default function AdminEventNewPage() {
  const [type, setType] = useState<EventType>('live');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('콘서트');
  const [venue, setVenue] = useState('');
  const [posterColor, setPosterColor] = useState('#1E3A8A');
  const [posterInitial, setPosterInitial] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [totalSeats, setTotalSeats] = useState('1000');
  const [entryFeePoints, setEntryFeePoints] = useState('500');
  const [entryFeeTickets, setEntryFeeTickets] = useState('5');
  const [prize, setPrize] = useState('');
  const [errors, setErrors] = useState<EventFormErrors>({});

  const isPaid = type === 'paid';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateEventForm({
      type, title, category, venue, posterColor,
      posterInitial, opensAt, totalSeats,
      entryFeePoints, entryFeeTickets, prize,
    });
    setErrors(found);
    if (hasErrors(found)) return;

    // API 미연결 상태. 프로덕션 빌드에서는 저장 성공으로 오인되지 않도록
    // 명시적으로 차단하고, 개발 환경에서만 뼈대 확인 로그를 출력한다.
    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.info('[admin/events/new] 검증 통과 (API 미연결)', {
        type, title, category, venue, posterColor,
        posterInitial, opensAt, totalSeats,
        entryFeePoints, entryFeeTickets, prize,
      });
    }
  }

  return (
    <div className="space-y-8">

      {/* 헤더 */}
      <div>
        <p className="text-xs text-text-tertiary mb-1">
          <Link href="/admin/events" className="hover:text-text-secondary">이벤트 관리</Link>
          {' / '}
          <span>새 이벤트</span>
        </p>
        <h1 className="text-2xl font-bold text-text">새 이벤트 생성</h1>
      </div>

      {/* 미연결 배너 — 배포 사고 방지용 상시 표시 */}
      <div className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-text">
        <p className="font-semibold">API 미연결</p>
        <p className="text-xs mt-0.5 opacity-90">
          이 폼은 아직 백엔드에 연결되어 있지 않습니다. 저장 버튼을 눌러도 실제로 저장되지 않으니
          검증만 참고해 주세요.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* 폼 */}
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
                  <p className="text-xs text-text-secondary mt-0.5">
                    {t === 'live' ? '매시간 정시 오픈 · TOP 10 티켓' : '관리자 지정 · TOP 3 기프티콘'}
                  </p>
                </label>
              ))}
            </div>
          </Field>

          {/* 제목 */}
          <Field label="제목" required error={errors.title}>
            <TextInput
              value={title}
              onChange={setTitle}
              placeholder="예: 아이유 The Golden Hour 앙코르"
              maxLength={LIMITS.title.max}
            />
          </Field>

          {/* 카테고리 */}
          <Field label="카테고리" required error={errors.category}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          {/* 공연장 */}
          <Field label="공연장" required error={errors.venue}>
            <TextInput
              value={venue}
              onChange={setVenue}
              placeholder="예: 고척스카이돔"
              maxLength={LIMITS.venue.max}
            />
          </Field>

          {/* 포스터 */}
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="포스터 이니셜" error={errors.posterInitial}>
              <TextInput
                value={posterInitial}
                onChange={(v) => setPosterInitial(normalizePosterInitial(v))}
                placeholder="예: IU"
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

          {/* 오픈 시각 & 좌석 */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="오픈 시각" required hint="종료는 오픈 후 5분 자동" error={errors.opensAt}>
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

          {/* 유료 전용 */}
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
                <Field label="참여비 (티켓)" required hint="티켓으로도 참여 가능한 경우" error={errors.entryFeeTickets}>
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

              <Field label="상품" required hint="TOP 3 지급 상품 설명" error={errors.prize}>
                <TextInput
                  value={prize}
                  onChange={setPrize}
                  placeholder="예: 스타벅스 30,000원 상품권 × TOP 3"
                  maxLength={LIMITS.prize.max}
                />
              </Field>
            </>
          )}

          {/* 액션 */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Link href="/admin/events" className="btn btn-neutral flex-1">
              취소
            </Link>
            <button type="submit" className="btn btn-solid flex-1">
              이벤트 생성
            </button>
          </div>
        </form>

        {/* 미리보기 */}
        <aside className="space-y-3">
          <p className="text-xs font-semibold text-text-tertiary tracking-wider uppercase">미리보기</p>
          <div className="card overflow-hidden sticky top-20">
            <div
              className="aspect-[3/4] flex items-center justify-center relative"
              style={{ backgroundColor: isHexColor(posterColor) ? posterColor : '#94A3B8' }}
            >
              <span className="text-5xl font-black text-white/90 tracking-tight">
                {posterInitial || '?'}
              </span>
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-sm text-[10px] font-semibold text-white">
                {category}
              </div>
              <div className="absolute top-2 right-2">
                <span className={`badge ${isPaid ? 'badge-primary' : 'badge-danger'}`}>
                  {isPaid ? '유료' : '라이브'}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-1.5">
              <p className="text-sm font-bold text-text truncate">
                {title || '(제목 미입력)'}
              </p>
              <p className="text-xs text-text-secondary truncate">{venue || '(공연장 미입력)'}</p>
              <p className="text-xs text-text-tertiary pt-1">
                {opensAt ? new Date(opensAt).toLocaleString('ko-KR') : '(오픈 시각 미설정)'}
              </p>
              <p className="text-xs text-text-tertiary">
                좌석 {Number(totalSeats || 0).toLocaleString()}석
              </p>
              {isPaid && (
                <p className="text-xs text-primary font-semibold pt-1">
                  참여비 {Number(entryFeePoints || 0).toLocaleString()}P · {prize || '(상품 미입력)'}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}

// ── 하위 컴포넌트 ────────────────────────────────────

function Field({
  label, required, hint, error, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline gap-2 text-xs font-semibold text-text-secondary">
        <span>
          {label}
          {required && <span className="text-danger-text ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[11px] font-normal text-text-tertiary">— {hint}</span>}
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
