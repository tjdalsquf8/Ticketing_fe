'use client';

import { useEffect, useRef, useState } from 'react';
import { createGifticon, type GifticonCategory } from '@/lib/gifticons';
import { ApiError } from '@/lib/errors';

/* ──────────────────────────────────────────
   GifticonCreateModal
   ─ 관리자 재고 등록 모달
   ─ POST /admin/gifticons — 1건 등록(바코드 1개당 재고 1건)
   ────────────────────────────────────────── */

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CATEGORY_OPTIONS: { value: GifticonCategory; label: string }[] = [
  { value: 'coffee', label: '커피' },
  { value: 'food', label: '음식' },
  { value: 'convenience', label: '편의점' },
  { value: 'beauty', label: '뷰티' },
  { value: 'etc', label: '기타' },
];

export default function GifticonCreateModal({ open, onClose, onCreated }: Props) {
  const [category, setCategory] = useState<GifticonCategory>('coffee');
  const [productName, setProductName] = useState('');
  const [faceValue, setFaceValue] = useState('');
  const [code, setCode] = useState('');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstFieldRef = useRef<HTMLSelectElement>(null);

  const faceValueNumber = Number(faceValue);
  const isValid =
    productName.trim().length > 0 &&
    Number.isFinite(faceValueNumber) &&
    faceValueNumber > 0 &&
    code.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setCategory('coffee');
      setProductName('');
      setFaceValue('');
      setCode('');
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, pending, onClose]);

  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    if (!isValid || pending) return;
    setPending(true);
    setError(null);
    try {
      await createGifticon({
        category,
        productName: productName.trim(),
        faceValue: faceValueNumber,
        code: code.trim(),
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '등록 중 오류가 발생했습니다.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 gcm-backdrop"
      onClick={pending ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="기프티콘 재고 등록"
    >
      <style>{`
        @keyframes gcmBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gcmCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .gcm-backdrop { animation: gcmBackdropIn 150ms ease-out both; }
        .gcm-card { animation: gcmCardIn 200ms ease-out both; }
      `}</style>
      <div
        className="w-full max-w-lg bg-bg-surface rounded-2xl border border-border shadow-lg gcm-card max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border">
          <p className="text-[11px] font-semibold text-primary tracking-wider uppercase">신규 재고</p>
          <h3 className="mt-1 text-lg font-bold text-text">기프티콘 재고 등록</h3>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="gc-category" className="block text-xs font-semibold text-text-secondary">
                카테고리 <span className="text-danger-text">*</span>
              </label>
              <select
                id="gc-category"
                ref={firstFieldRef}
                value={category}
                onChange={(e) => setCategory(e.target.value as GifticonCategory)}
                disabled={pending}
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
              <label htmlFor="gc-facevalue" className="block text-xs font-semibold text-text-secondary">
                액면가(원) <span className="text-danger-text">*</span>
              </label>
              <input
                id="gc-facevalue"
                type="number"
                min={1}
                value={faceValue}
                onChange={(e) => setFaceValue(e.target.value)}
                placeholder="4500"
                disabled={pending}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm font-mono-tabular focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="gc-product" className="block text-xs font-semibold text-text-secondary">
              상품명 <span className="text-danger-text">*</span>
            </label>
            <input
              id="gc-product"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예: 스타벅스 아메리카노 T"
              disabled={pending}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <p className="text-[11px] text-text-tertiary">브랜드명은 상품명에 포함해서 입력해 주세요.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="gc-code" className="block text-xs font-semibold text-text-secondary">
              바코드 번호 <span className="text-danger-text">*</span>
            </label>
            <input
              id="gc-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="3010293848219930"
              disabled={pending}
              autoComplete="off"
              className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm font-mono-tabular focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-md px-3 py-2"
            >
              {error}
            </p>
          )}
        </div>

        <div className="p-5 pt-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-neutral flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || pending}
            className="btn btn-solid flex-1 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {pending ? (
              <svg
                role="status"
                aria-label="처리 중"
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 animate-spin"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="4"
                />
                <path
                  d="M22 12a10 10 0 0 0-10-10"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              '등록'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
