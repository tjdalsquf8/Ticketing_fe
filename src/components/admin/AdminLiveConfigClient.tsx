'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getLiveConfig,
  putLiveEventConfig,
  putLiveScheduleConfig,
  type LiveConfig,
} from '@/lib/adminLive';
import { LIVE_EVENTS, type LiveEvent } from '@/data/live';
import { deriveLiveSeatLabels } from '@/data/live/seatLabels';
import { ApiError } from '@/lib/errors';
import AdminVenuePreviewMap from './AdminVenuePreviewMap';

/* ──────────────────────────────────────────
   /admin/live/config — 실시간 라이브 공연 설정
   ─ 매시 정각 자동 생성될 회차에 어떤 공연을 배치할지 결정
   ─ 좌석 라벨은 venue config에서 결정적으로 파생 (공연별 liveSeatsPerZone × zone 수)
   ─ GET /api/admin/live/config              : 현재 세팅 조회 (양쪽 통합)
   ─ PUT /api/admin/live/config/event        : 공연 배치만 저장
   ─ PUT /api/admin/live/config/schedule     : 회차 제외 시간대만 저장
   ─ 두 설정은 완전 독립. 각 카드에 개별 저장 버튼.
   ────────────────────────────────────────── */

function findLiveEventByBackendId(backendEventId: number): LiveEvent | undefined {
  return LIVE_EVENTS.find((e) => e.eventId === backendEventId);
}

export default function AdminLiveConfigClient() {
  const [initial, setInitial] = useState<LiveConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // ── 공연 배치 설정 (독립) ──
  const [selectedLiveId, setSelectedLiveId] = useState<string>(LIVE_EVENTS[0]?.id ?? '');
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSavedAt, setEventSavedAt] = useState<Date | null>(null);

  // ── 스케줄(회차 제외 시간대) 설정 (독립) ──
  const [excludedHours, setExcludedHours] = useState<Set<number>>(new Set());
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSavedAt, setScheduleSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    getLiveConfig()
      .then((cfg) => {
        if (!alive) return;
        setInitial(cfg);
        if (cfg) {
          const matched = findLiveEventByBackendId(cfg.defaultEventId);
          if (matched) setSelectedLiveId(matched.id);
          setExcludedHours(new Set(cfg.excludedHours ?? []));
        }
        setLoadError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setLoadError(e instanceof ApiError ? e.message : '공연 설정을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [reloadTick]);

  const selected = LIVE_EVENTS.find((e) => e.id === selectedLiveId);
  const appliedEvent = initial ? findLiveEventByBackendId(initial.defaultEventId) : null;
  const initialExcludedSet = new Set(initial?.excludedHours ?? []);

  const eventDirty =
    !!selected && (!initial || initial.defaultEventId !== selected.eventId);
  const scheduleDirty =
    excludedHours.size !== initialExcludedSet.size ||
    Array.from(excludedHours).some((h) => !initialExcludedSet.has(h));

  function toggleHour(h: number) {
    setExcludedHours((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  function clearAllHours() {
    setExcludedHours(new Set());
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    setEventError(null);
    if (!selected) {
      setEventError('공연을 선택해 주세요.');
      return;
    }
    let seatLabels: string[];
    try {
      seatLabels = deriveLiveSeatLabels(selected.venue, selected.liveSeatsPerZone);
    } catch (err) {
      setEventError(err instanceof Error ? err.message : '좌석 라벨 생성 실패');
      return;
    }
    if (seatLabels.length === 0) {
      setEventError('선택한 공연의 venue에서 좌석 라벨을 생성할 수 없습니다. seated 구역과 seatRows 정의를 확인해 주세요.');
      return;
    }

    setSavingEvent(true);
    try {
      await putLiveEventConfig({
        defaultEventId: selected.eventId,
        defaultSeatLabels: seatLabels,
      });
      setEventSavedAt(new Date());
      // 응답 단독을 initial에 넣으면 스케줄 저장이 병렬로 발생했을 때
      // 서로의 최신 값을 덮어쓸 수 있음. 저장 후에는 항상 서버 상태를 재조회한다.
      setReloadTick((n) => n + 1);
    } catch (err) {
      setEventError(err instanceof ApiError ? err.message : '저장 실패');
    } finally {
      setSavingEvent(false);
    }
  }

  function validateExcludedHours(hours: number[]): string | null {
    if (hours.some((h) => !Number.isInteger(h) || h < 0 || h > 23)) {
      return '제외 시간은 0~23 정수여야 합니다.';
    }
    if (hours.length >= 24) {
      return '24개 시간 모두 제외하면 하루 회차가 0회가 됩니다. 최소 1개는 유지해 주세요.';
    }
    return null;
  }

  async function saveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setScheduleError(null);
    const excludedHoursArr = Array.from(excludedHours).sort((a, b) => a - b);
    const validationError = validateExcludedHours(excludedHoursArr);
    if (validationError) {
      setScheduleError(validationError);
      return;
    }
    // 20시간 이상 제외 → 서비스가 사실상 중단 상태이므로 명시적 재확인.
    if (excludedHoursArr.length >= 20) {
      const remaining = 24 - excludedHoursArr.length;
      if (!confirm(`제외 시간이 ${excludedHoursArr.length}개입니다. 하루 ${remaining}회차만 운영됩니다. 계속하시겠습니까?`)) {
        return;
      }
    }
    setSavingSchedule(true);
    try {
      await putLiveScheduleConfig({ excludedHours: excludedHoursArr });
      setScheduleSavedAt(new Date());
      setReloadTick((n) => n + 1);
    } catch (err) {
      setScheduleError(err instanceof ApiError ? err.message : '저장 실패');
    } finally {
      setSavingSchedule(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-text-tertiary mb-1">
            <Link href="/admin/live" className="hover:text-text-secondary">실시간 관리</Link>
            {' / '}
            <span>공연 설정</span>
          </p>
          <h1 className="text-2xl font-bold text-text">라이브 공연 설정</h1>
          <p className="mt-1 text-sm text-text-secondary">
            매시 정각 자동 오픈되는 실시간 회차에 어떤 공연을 배치할지 지정합니다. 아래 두 설정은 독립적으로 저장됩니다.
          </p>
        </div>
        <Link href="/admin/live" className="btn btn-neutral shrink-0">
          돌아가기
        </Link>
      </div>

      {loadError && (
        <div className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 flex items-center justify-between gap-3">
          <p className="text-xs text-danger-text">{loadError}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); setReloadTick((n) => n + 1); }}
            className="btn btn-ghost btn-sm"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* ── 카드 1: 공연 배치 (독립 저장) ── */}
      <form onSubmit={saveEvent} className="card p-6 space-y-5">
        <div>
          <p className="text-[11px] font-semibold text-text-tertiary tracking-wider uppercase">공연 배치</p>
          <h2 className="text-base font-bold text-text mt-0.5">공연 선택</h2>
          <p className="text-xs text-text-tertiary mt-1">
            변경 저장 시 <strong className="text-text-secondary">다음 정각 회차부터</strong> 새 공연이 적용됩니다. 이미 생성된 미래 회차는 스냅샷을 유지합니다.
          </p>
        </div>

        <label className="block">
          <span className="block text-xs font-semibold text-text-secondary mb-1.5">공연</span>
          <select
            value={selectedLiveId}
            onChange={(e) => setSelectedLiveId(e.target.value)}
            disabled={loading || savingEvent}
            className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {LIVE_EVENTS.length === 0 ? (
              <option value="">등록된 라이브 공연이 없습니다</option>
            ) : (
              LIVE_EVENTS.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))
            )}
          </select>
        </label>

        {selected && <SelectedPreview event={selected} />}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="min-w-0 flex-1">
            {eventError ? (
              <p className="text-xs text-danger-text">{eventError}</p>
            ) : eventSavedAt ? (
              <p className="text-xs text-success-text">
                공연 배치 저장 완료 · {eventSavedAt.toLocaleTimeString('ko-KR')} — 다음 정각 회차부터 적용됩니다.
              </p>
            ) : (
              <p className="text-[11px] text-text-tertiary">
                공연 배치만 저장됩니다. 스케줄 설정은 아래 카드에서 별도로 저장하세요.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-solid shrink-0"
            disabled={savingEvent || loading || !eventDirty || !selected || LIVE_EVENTS.length === 0}
          >
            {savingEvent ? '저장 중…' : LIVE_EVENTS.length === 0 ? '공연 없음' : eventDirty ? '공연 배치 저장' : '변경 없음'}
          </button>
        </div>
      </form>

      {/* ── 카드 2: 스케줄 (독립 저장) ── */}
      <form onSubmit={saveSchedule} className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-text-tertiary tracking-wider uppercase">스케줄</p>
            <h2 className="text-base font-bold text-text mt-0.5">회차 제외 시간대</h2>
            <p className="text-xs text-text-tertiary mt-1">
              매일 00시 스케줄러가 24개 회차를 생성할 때, 여기서 <strong className="text-text-secondary">선택한 시간</strong>은 건너뜁니다.
              <span className="ml-1">(다음 날 00시부터 적용, 이미 만들어진 오늘 회차에는 영향 없음)</span>
            </p>
          </div>
          {excludedHours.size > 0 && (
            <button
              type="button"
              onClick={clearAllHours}
              disabled={loading || savingSchedule}
              className="btn btn-ghost btn-sm shrink-0"
            >
              모두 해제
            </button>
          )}
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
          {Array.from({ length: 24 }, (_, h) => {
            const excluded = excludedHours.has(h);
            return (
              <button
                key={h}
                type="button"
                onClick={() => toggleHour(h)}
                disabled={loading || savingSchedule}
                aria-pressed={excluded}
                className={[
                  'rounded-md border px-2 py-2 text-xs font-mono-tabular transition-colors',
                  excluded
                    ? 'border-danger-border bg-danger-bg text-danger-text font-bold'
                    : 'border-border bg-bg-surface text-text-secondary hover:border-border-strong',
                ].join(' ')}
                title={excluded ? `${String(h).padStart(2, '0')}시 회차 제외` : `${String(h).padStart(2, '0')}시 회차 생성`}
              >
                {String(h).padStart(2, '0')}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-text-tertiary">
          {excludedHours.size === 0 ? (
            <>제외 시간 없음 · 하루 <strong className="text-text-secondary">24회차</strong> 자동 생성</>
          ) : (
            <>
              제외 <strong className="text-danger-text font-mono-tabular">{excludedHours.size}시간</strong>
              {' · '}
              <span className="font-mono-tabular text-text-secondary">
                {Array.from(excludedHours).sort((a, b) => a - b).map((h) => `${String(h).padStart(2, '0')}시`).join(', ')}
              </span>
              {' → '}
              하루 <strong className="text-text-secondary">{24 - excludedHours.size}회차</strong> 자동 생성
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="min-w-0 flex-1">
            {scheduleError ? (
              <p className="text-xs text-danger-text">{scheduleError}</p>
            ) : scheduleSavedAt ? (
              <p className="text-xs text-success-text">
                스케줄 저장 완료 · {scheduleSavedAt.toLocaleTimeString('ko-KR')} — 다음 날 00시부터 적용됩니다.
              </p>
            ) : (
              <p className="text-[11px] text-text-tertiary">
                스케줄만 저장됩니다. 공연 배치는 위 카드에서 별도로 저장하세요.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-solid shrink-0"
            disabled={savingSchedule || loading || !scheduleDirty}
          >
            {savingSchedule ? '저장 중…' : scheduleDirty ? '스케줄 저장' : '변경 없음'}
          </button>
        </div>
      </form>

      {/* 현재 적용 요약 */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-text-tertiary tracking-wider uppercase">현재 적용 중</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              다음 정각에 새로 생성될 회차에 사용될 값입니다.
            </p>
          </div>
        </div>
        {loading ? (
          <p className="text-xs text-text-tertiary">불러오는 중…</p>
        ) : !initial ? (
          <p className="text-sm text-text-secondary">
            아직 세팅된 값이 없습니다. 위에서 저장하면 다음 정각부터 적용됩니다.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <MetaRow
              label="공연"
              value={appliedEvent?.title ?? `event #${initial.defaultEventId} (미등록 공연)`}
              strong
            />
            <MetaRow label="이벤트 ID"   value={`#${initial.defaultEventId}`} mono />
            <MetaRow label="회차당 좌석" value={`${initial.defaultSeatLabels.length}석`} mono />
            <MetaRow
              label="하루 회차 수"
              value={`${24 - (initial.excludedHours?.length ?? 0)}회 (제외 ${initial.excludedHours?.length ?? 0}시간)`}
              mono
            />
            <MetaRow label="마지막 수정" value={new Date(initial.updatedAt).toLocaleString('ko-KR')} />
          </div>
        )}
      </div>
    </div>
  );
}

function SelectedPreview({ event }: { event: LiveEvent }) {
  const [showMap, setShowMap] = useState(false);
  let labels: string[] = [];
  let deriveError: string | null = null;
  try {
    labels = deriveLiveSeatLabels(event.venue, event.liveSeatsPerZone);
  } catch (e) {
    deriveError = e instanceof Error ? e.message : '좌석 라벨 생성 실패';
  }
  const seatedZoneCount = event.venue.zones.filter(
    (z) => z.type === 'seated' && z.seatRows,
  ).length;
  const totalLiveSeats = labels.length;

  return (
    <>
      <div className="rounded-lg border border-border bg-bg-subtle p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-md bg-bg-muted shrink-0 flex items-center justify-center text-[11px] font-bold text-text-secondary">
            {event.category}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text truncate">{event.title}</p>
            <p className="text-xs text-text-secondary truncate mt-0.5">{event.venueName}</p>
          </div>
          <p className="text-[11px] text-text-tertiary font-mono-tabular shrink-0">
            event #{event.eventId}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <MetaRow label="회차당 총 좌석" value={`${totalLiveSeats.toLocaleString()}석`} strong />
          <MetaRow label="구역당" value={`${event.liveSeatsPerZone}석 × ${seatedZoneCount}구역`} />
          <MetaRow label="실 공연장" value={`${event.totalSeats.toLocaleString()}석`} />
        </div>

        {deriveError ? (
          <p className="text-xs text-danger-text">{deriveError}</p>
        ) : (
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-text-tertiary">
                자동 생성될 좌석 라벨 (전 구역 앞줄부터 각 {event.liveSeatsPerZone}석씩 총 {totalLiveSeats}개)
              </p>
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="btn btn-ghost btn-sm shrink-0"
              >
                좌석 상세보기
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {labels.slice(0, 16).map((l) => (
                <span key={l} className="px-2 py-0.5 rounded-md bg-bg-surface border border-border text-[11px] font-mono-tabular text-text-secondary">
                  {l}
                </span>
              ))}
              {labels.length > 16 && (
                <span className="text-[11px] text-text-tertiary self-center">
                  … +{labels.length - 16}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {showMap && !deriveError && (
        <VenuePreviewModal event={event} seatLabels={labels} onClose={() => setShowMap(false)} />
      )}
    </>
  );
}

function VenuePreviewModal({
  event, seatLabels, onClose,
}: {
  event: LiveEvent;
  seatLabels: string[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-bg-surface z-10">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-text-tertiary tracking-wider uppercase">좌석 미리보기</p>
            <h2 className="text-base font-bold text-text truncate">{event.title}</h2>
            <p className="text-[11px] text-text-tertiary truncate">{event.venueName}</p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">닫기</button>
        </div>
        <div className="p-5">
          <AdminVenuePreviewMap venue={event.venue} seatLabels={seatLabels} />
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label, value, strong, mono,
}: {
  label: string; value: string; strong?: boolean; mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-text-tertiary">{label}</p>
      <p className={[
        'mt-0.5 text-sm',
        strong ? 'font-semibold text-text' : 'text-text-secondary',
        mono ? 'font-mono-tabular' : '',
      ].join(' ')}>
        {value}
      </p>
    </div>
  );
}
