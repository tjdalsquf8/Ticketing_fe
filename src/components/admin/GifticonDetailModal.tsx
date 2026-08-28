'use client';

import { useEffect, useRef, useState } from 'react';
import {
  deleteGifticon,
  getGifticonDetail,
  updateGifticon,
  type GifticonCategory,
  type GifticonDetail,
  type UpdateGifticonBody,
} from '@/lib/gifticons';
import { ApiError } from '@/lib/errors';
import { formatKstDateTime } from '@/lib/kst';

/* ──────────────────────────────────────────
   GifticonDetailModal
   ─ 상세 조회(코드 원본은 이 시점에만 페칭) + 등록 정정(부분 수정) + 삭제
   ─ 코드는 기본 마스킹, "코드 확인" 클릭 전엔 어떤 편집 state에도 담기지 않음(ref에만 보관)
   ─ 저장 시 코드는 실제로 확인(reveal)한 경우에만 요청 바디에 포함 — 열람하지 않았으면 재전송 안 함
   ─ available 상태가 아니면 수정 폼 전체 비활성화 (지급·사용 이력 보존)
   ────────────────────────────────────────── */

interface Props {
  gifticonId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_LABEL: Record<GifticonDetail['status'], { text: string; cls: string }> = {
  available: { text: '사용 가능', cls: 'badge-success' },
  issued: { text: '지급 완료', cls: 'badge-info' },
  redeemed: { text: '사용 완료', cls: 'badge-neutral' },
  expired: { text: '만료', cls: 'badge-danger' },
};

const CATEGORY_OPTIONS: { value: GifticonCategory; label: string }[] = [
  { value: 'coffee', label: '커피' },
  { value: 'food', label: '음식' },
  { value: 'convenience', label: '편의점' },
  { value: 'beauty', label: '뷰티' },
  { value: 'etc', label: '기타' },
];

const CATEGORY_LABEL: Record<GifticonCategory, string> = {
  coffee: '커피',
  food: '음식',
  convenience: '편의점',
  beauty: '뷰티',
  etc: '기타',
};

export default function GifticonDetailModal({ gifticonId, onClose, onChanged }: Props) {
  const open = gifticonId !== null;

  const [detail, setDetail] = useState<GifticonDetail | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [codeRevealed, setCodeRevealed] = useState(false);
  // 원본 바코드는 여기 ref에만 잠깐 보관 — "코드 확인" 클릭 전엔 편집용 code state로 옮기지 않는다.
  const rawCodeRef = useRef('');

  const [category, setCategory] = useState<GifticonCategory>('coffee');
  const [productName, setProductName] = useState('');
  const [faceValue, setFaceValue] = useState('');
  const [code, setCode] = useState('');
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!gifticonId) {
      setDetail(null);
      setCodeRevealed(false);
      setCode('');
      setProductName('');
      setFaceValue('');
      setCategory('coffee');
      rawCodeRef.current = '';
      setLoadError(null);
      setSaveError(null);
      setDeleteError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setCodeRevealed(false);
    setCode('');
    rawCodeRef.current = '';
    getGifticonDetail(gifticonId)
      .then((d) => {
        rawCodeRef.current = d.code;
        // 원본 코드는 detail state에도 남기지 않는다 — "코드 확인" 전엔 어떤 편집 가능 state에도 없어야 함.
        setDetail({ ...d, code: '' });
        setCategory(d.category);
        setProductName(d.productName);
        setFaceValue(String(d.faceValue));
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof ApiError ? e.message : '상세 정보를 불러올 수 없습니다.');
      })
      .finally(() => setLoading(false));
  }, [gifticonId]);

  function handleRevealCode() {
    setCode(rawCodeRef.current);
    setCodeRevealed(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savePending && !deletePending) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, savePending, deletePending, onClose]);

  if (!open) return null;

  const pending = savePending || deletePending;
  const isEditable = detail?.status === 'available';

  const faceValueNumber = Number(faceValue);
  const isValid =
    productName.trim().length > 0 &&
    Number.isFinite(faceValueNumber) &&
    faceValueNumber > 0 &&
    (!codeRevealed || code.trim().length > 0);

  async function handleSave() {
    if (!detail || savePending || !isEditable) return;
    setSavePending(true);
    setSaveError(null);
    try {
      // 코드는 확인(reveal)한 경우에만 body에 포함 — 열어보지 않았으면 원본을 그대로 재전송하지 않는다.
      const body: UpdateGifticonBody = {
        productName: productName.trim(),
        faceValue: faceValueNumber,
      };
      if (codeRevealed) {
        body.code = code.trim();
        rawCodeRef.current = code.trim();
      }
      const updated = await updateGifticon(detail.id, body);
      setDetail((prev) => (prev ? { ...prev, ...updated, code: prev.code } : prev));
      onChanged();
      onClose();
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : '수정 중 오류가 발생했습니다.');
    } finally {
      setSavePending(false);
    }
  }

  async function handleDelete() {
    if (!detail || deletePending) return;
    if (!confirm(`[${CATEGORY_LABEL[detail.category]}] ${detail.productName} 재고를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      await deleteGifticon(detail.id);
      onChanged();
      onClose();
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 gdm-backdrop"
      onClick={pending ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="기프티콘 상세"
    >
      <style>{`
        @keyframes gdmBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gdmCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .gdm-backdrop { animation: gdmBackdropIn 150ms ease-out both; }
        .gdm-card { animation: gdmCardIn 200ms ease-out both; }
      `}</style>
      <div
        className="w-full max-w-lg bg-bg-surface rounded-2xl border border-border shadow-lg gdm-card max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border">
          <p className="text-[11px] font-semibold text-primary tracking-wider uppercase">기프티콘 상세</p>
          <h3 className="mt-1 text-lg font-bold text-text">
            {detail ? `${CATEGORY_LABEL[detail.category]} · ${detail.productName}` : gifticonId}
          </h3>
        </div>

        <div className="p-5 space-y-4 text-sm">
          {isLoading && (
            <p className="text-sm text-text-secondary py-8 text-center">불러오는 중…</p>
          )}

          {loadError && (
            <p
              role="alert"
              className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-md px-3 py-2"
            >
              {loadError}
            </p>
          )}

          {detail && !isLoading && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-text-tertiary">상태</p>
                  <span className={`badge ${STATUS_LABEL[detail.status].cls} mt-1 inline-block`}>
                    {STATUS_LABEL[detail.status].text}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">등록일</p>
                  <p className="mt-1 font-mono-tabular text-text-secondary text-xs">{formatKstDateTime(detail.createdAt)}</p>
                </div>
              </div>

              {!isEditable && (
                <p className="text-xs text-text-secondary bg-bg-subtle border border-border rounded-md px-3 py-2">
                  지급/사용된 재고는 수정할 수 없습니다.
                </p>
              )}

              {/* 수정 폼 — 등록 실수 정정용. available 상태에서만 활성화 */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <label htmlFor="gdm-category" className="block text-xs font-semibold text-text-secondary">
                    카테고리
                  </label>
                  <select
                    id="gdm-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GifticonCategory)}
                    disabled={!isEditable || savePending}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="gdm-facevalue" className="block text-xs font-semibold text-text-secondary">
                    액면가(원)
                  </label>
                  <input
                    id="gdm-facevalue"
                    type="number"
                    min={1}
                    value={faceValue}
                    onChange={(e) => setFaceValue(e.target.value)}
                    disabled={!isEditable || savePending}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm font-mono-tabular focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label htmlFor="gdm-product" className="block text-xs font-semibold text-text-secondary">
                    상품명
                  </label>
                  <input
                    id="gdm-product"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    disabled={!isEditable || savePending}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label htmlFor="gdm-code" className="block text-xs font-semibold text-text-secondary">
                    바코드 번호
                  </label>
                  {codeRevealed ? (
                    <input
                      id="gdm-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={!isEditable || savePending}
                      autoComplete="off"
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm font-mono-tabular focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={handleRevealCode}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg-subtle text-text-tertiary text-sm tracking-widest text-left"
                    >
                      ●●●●●●●●●● — 코드 확인
                    </button>
                  )}
                </div>
              </div>

              {saveError && (
                <p
                  role="alert"
                  className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-md px-3 py-2"
                >
                  {saveError}
                </p>
              )}

              {isEditable && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isValid || savePending}
                  className="btn btn-solid btn-sm w-full disabled:opacity-50"
                >
                  {savePending ? '저장 중…' : '변경사항 저장'}
                </button>
              )}

              {deleteError && (
                <p
                  role="alert"
                  className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-md px-3 py-2"
                >
                  {deleteError}
                </p>
              )}
            </>
          )}
        </div>

        <div className="p-5 pt-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-neutral flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            닫기
          </button>
          {isEditable && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePending}
              className="btn flex-1 border border-danger-border bg-bg-surface text-danger-text hover:bg-danger-bg disabled:opacity-50"
            >
              {deletePending ? '삭제 중…' : '이 재고 삭제'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
