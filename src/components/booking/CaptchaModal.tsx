'use client';

import { useState, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────
   CAPTCHA Modal — 부정예매 방지 문자 인증
   ───────────────────────────────────────────────────────── */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const gen = () => Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

interface Props {
  onConfirm: () => void;
  onCancel:  () => void;
  cancelLabel?: string;
}

export default function CaptchaModal({ onConfirm, onCancel, cancelLabel = '날짜 다시 선택' }: Props) {
  const [code,  setCode]  = useState(gen);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    setCode(gen());
    setInput('');
    setError(false);
  }, []);

  const handleConfirm = () => {
    if (input.trim().toUpperCase() === code) {
      onConfirm();
    } else {
      setCode(gen());
      setInput('');
      setError(true);
    }
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-bg-surface border border-border rounded-xl shadow-lg w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <span className="badge badge-primary text-sm px-3 py-1">안심예매</span>
          <h2 className="text-xl font-bold text-text mt-3">문자를 입력해주세요</h2>
          <p className="text-sm text-text-secondary mt-1.5">
            부정예매방지를 위해 아래의 문자를 입력해주세요.<br />
            인증 후 좌석을 선택할 수 있습니다.
          </p>
        </div>

        {/* CAPTCHA display */}
        <div className="px-6">
          <div className="flex items-center gap-2">
            <div
              className="relative flex-1 rounded-lg border border-border bg-bg-subtle flex items-center justify-center overflow-hidden"
              style={{ height: 72 }}
            >
              {/* 배경 노이즈 패턴 */}
              <div className="absolute inset-0 opacity-10"
                   style={{
                     backgroundImage: 'repeating-linear-gradient(45deg, var(--bd) 0, var(--bd) 1px, transparent 0, transparent 50%)',
                     backgroundSize: '6px 6px',
                   }} />
              {/* CAPTCHA 문자 */}
              <span
                className="relative font-mono-tabular font-bold text-3xl tracking-[0.25em] select-none"
                style={{
                  color: '#2563EB',
                  textShadow: '1px 1px 0 rgba(37,99,235,0.2), -1px -1px 0 rgba(37,99,235,0.15)',
                  transform: 'skewX(-4deg)',
                  letterSpacing: '0.28em',
                }}
              >
                {code}
              </span>
            </div>
            {/* 새로고침 */}
            <button
              onClick={refresh}
              className="p-2 rounded-lg border border-border bg-bg-surface hover:bg-bg-subtle transition-colors"
              title="새 문자 생성"
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* 입력 필드 */}
          <input
            type="text"
            maxLength={6}
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            placeholder="문자를 입력해주세요"
            className={[
              'mt-3 w-full rounded-lg border px-4 py-3 text-sm text-text font-mono-tabular tracking-widest bg-bg-surface',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              error ? 'border-danger-border' : 'border-border',
            ].join(' ')}
            autoFocus
          />
          {error && (
            <p className="mt-1.5 text-xs text-danger-text">문자가 일치하지 않습니다. 새 문자가 생성되었습니다.</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-6 py-5 mt-2">
          <button onClick={onCancel}  className="btn btn-neutral flex-1">{cancelLabel}</button>
          <button onClick={handleConfirm} className="btn btn-solid flex-1">입력완료</button>
        </div>

      </div>
    </div>
  );
}
