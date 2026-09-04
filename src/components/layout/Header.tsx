'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  NICKNAME_MAX,
  formatCooldownRemaining,
  validateNickname,
} from '@/lib/errors';

const NAV = [
  { href: '/',         label: '홈'       },
  { href: '/live',     label: '실시간'   },
  { href: '/event',    label: '이벤트'   },
  { href: '/practice', label: '연습'     },
  { href: '/ranking',  label: '랭킹'     },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 라우트 이동 시 모바일 메뉴 자동 닫기 — 렌더 중 상태 조정(React 권장 패턴), effect 미사용
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-bg-surface border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="text-lg font-extrabold text-brand shrink-0">
          TICKET RUSH
        </Link>

        {/* GNB */}
        <nav className="hidden sm:flex items-center gap-0.5 flex-1">
          {NAV.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'text-primary bg-primary-subtle'
                    : 'text-text-secondary hover:text-text hover:bg-bg-subtle',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 모바일 메뉴 토글 — 로그인·회원가입·닉네임 등 계정 컨트롤은 모바일에선 전부 여기로 모임 */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="sm:hidden p-1.5 -mr-1 text-text-secondary hover:text-text"
            aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
              </svg>
            )}
          </button>

          {/* 데스크톱 전용 계정 컨트롤 */}
          <div className="hidden sm:flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/my/points"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-subtle border border-primary-border text-xs font-semibold text-primary hover:bg-primary-subtle/70 transition-colors"
                  title="포인트 충전"
                >
                  <span className="font-mono-tabular">
                    {user.points !== undefined ? user.points.toLocaleString() : '-'}
                  </span>
                  <span>P</span>
                </Link>
                <Link href="/my" className="btn btn-neutral btn-sm">
                  마이페이지
                </Link>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm" type="button">
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <GuestNicknameControl />
                <Link href="/login" className="btn btn-neutral btn-sm">
                  로그인
                </Link>
                <Link href="/signup" className="btn btn-solid btn-sm">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>

      </div>

      {/* 모바일 메뉴 패널 */}
      {mobileOpen && (
        <nav className="sm:hidden border-t border-border bg-bg-surface px-4 py-2">
          {NAV.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'block px-2 py-2.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'text-primary bg-primary-subtle'
                    : 'text-text-secondary hover:text-text hover:bg-bg-subtle',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
          <div className="my-1.5 border-t border-border" />
          {user ? (
            <>
              <Link
                href="/my/points"
                className="flex items-center justify-between px-2 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-subtle"
              >
                <span>포인트</span>
                <span className="font-mono-tabular text-primary font-semibold">
                  {user.points !== undefined ? user.points.toLocaleString() : '-'}P
                </span>
              </Link>
              <Link
                href="/my"
                className="block px-2 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-subtle"
              >
                마이페이지
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full text-left px-2 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-subtle"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <GuestNicknameControl variant="row" />
              <Link
                href="/login"
                className="block px-2 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-subtle"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="block px-2 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-subtle"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

/* ──────────────────────────────────────────
   GuestNicknameControl
   ─ 헤더(데스크톱)와 모바일 메뉴 패널 양쪽에 동시에 마운트될 수 있어
     Header의 상태를 공유하지 않고 자체 state를 갖는 독립 컴포넌트로 분리.
   ─ variant='inline': 데스크톱 헤더용 (기존 pill 버튼)
   ─ variant='row':    모바일 메뉴 리스트 항목용 (풀폭)
   ────────────────────────────────────────── */

function GuestNicknameControl({ variant = 'inline' }: { variant?: 'inline' | 'row' }) {
  const { guestNickname, guestNicknameCooldownUntil, setGuestNickname } = useAuth();
  const isRow = variant === 'row';

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [nickError, setNickError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 남은 시간 표시가 실시간으로 줄어들도록 현재 시각을 상태로 관리 (쿨다운 활성 시 30초 tick).
  // 렌더 함수에서 Date.now() 직접 호출은 impure이므로 상태로 뺀다.
  const [now, setNow] = useState(0);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
    if (guestNicknameCooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [guestNicknameCooldownUntil]);

  const isLocked = now > 0 && guestNicknameCooldownUntil > now;
  const remainingText = isLocked
    ? formatCooldownRemaining(guestNicknameCooldownUntil - now)
    : '';

  function startEdit() {
    // 쿨다운 중이면 편집 모드 진입 자체를 막고 경고 문구만 노출
    if (isLocked) {
      setNickError(`닉네임은 1시간에 한 번만 변경할 수 있습니다. ${remainingText} 후 가능합니다.`);
      return;
    }
    setDraft(guestNickname);
    setNickError(null);
    setEditing(true);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // 에러 메시지 3초 후 자동 소멸 (편집 중이 아닐 때만 — 편집 중이면 사용자가 계속 보고 있어야 함)
  useEffect(() => {
    if (!nickError || editing) return;
    const id = setTimeout(() => setNickError(null), 3000);
    return () => clearTimeout(id);
  }, [nickError, editing]);

  async function commitEdit() {
    if (committing) return; // onBlur + Enter 동시 발화 방어
    const trimmed = draft.trim();
    // 동일 값이면 그냥 편집 종료 (변경 없음)
    if (trimmed === guestNickname) {
      setNickError(null);
      setEditing(false);
      return;
    }
    // 빈 값 삭제 시도든 새 값이든 규칙 검사
    if (trimmed) {
      const err = validateNickname(trimmed);
      if (err) {
        setNickError(err);
        return;
      }
    }
    setCommitting(true);
    try {
      // 서버 DELETE 호출이 포함될 수 있으므로 await
      await setGuestNickname(trimmed);
      setNickError(null);
      setEditing(false);
    } catch (e) {
      setNickError(e instanceof Error ? e.message : '변경에 실패했습니다.');
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="relative">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => {
            setDraft(e.target.value.slice(0, NICKNAME_MAX));
            if (nickError) setNickError(null);
          }}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') { setNickError(null); setEditing(false); }
          }}
          placeholder="닉네임 입력"
          aria-invalid={!!nickError}
          className={[
            'text-sm border rounded-md px-2 py-1 focus:outline-none focus:ring-1 bg-bg-surface text-text',
            isRow ? 'w-full' : 'w-28',
            nickError ? 'border-danger-border focus:ring-danger-border' : 'border-border focus:ring-primary',
          ].join(' ')}
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className={
            isRow
              ? 'flex items-center justify-between w-full px-2 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors'
              : 'flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors'
          }
          title={isLocked ? `${remainingText} 후 변경 가능` : '닉네임 설정'}
        >
          <span className={guestNickname ? 'font-medium text-text' : 'text-text-tertiary'}>
            {guestNickname || '닉네임 설정'}
          </span>
          {isLocked ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
          )}
        </button>
      )}
      {nickError && (
        <p
          role="alert"
          className={
            isRow
              ? 'px-2 pt-1 text-[11px] text-danger-text'
              : 'absolute left-0 top-full mt-1 text-[11px] text-danger-text whitespace-nowrap'
          }
        >
          {nickError}
        </p>
      )}
    </div>
  );
}
