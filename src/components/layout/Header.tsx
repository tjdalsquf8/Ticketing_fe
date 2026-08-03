'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { href: '/',         label: '홈'       },
  { href: '/practice', label: '연습 모드' },
  { href: '/ranking',  label: '랭킹'     },
  { href: '/rewards',  label: '리워드'   },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, guestNickname, setGuestNickname } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(guestNickname);
    setEditing(true);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitEdit() {
    setGuestNickname(draft);
    setEditing(false);
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
          {user ? (
            <>
              <Link
                href="/my"
                className="btn btn-neutral btn-sm hidden sm:inline-flex"
              >
                마이페이지
              </Link>
              <button
                onClick={handleLogout}
                className="btn btn-ghost btn-sm"
                type="button"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              {/* 게스트 닉네임 */}
              {editing ? (
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value.slice(0, 10))}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
                  placeholder="닉네임 입력"
                  className="text-sm border border-border rounded-md px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-primary bg-bg-surface text-text"
                />
              ) : (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors"
                  title="닉네임 설정"
                >
                  <span className={guestNickname ? 'font-medium text-text' : 'text-text-tertiary'}>
                    {guestNickname || '닉네임 설정'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                  </svg>
                </button>
              )}
              <Link href="/login" className="btn btn-neutral btn-sm hidden sm:inline-flex">
                로그인
              </Link>
              <Link href="/signup" className="btn btn-solid btn-sm">
                회원가입
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
