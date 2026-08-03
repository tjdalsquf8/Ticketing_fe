'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// metadata는 Server Component에서만 export 가능 — 'use client' 파일에서는 head 태그 직접 사용 불가.
// 페이지 타이틀은 layout.tsx의 template를 통해 자동 적용됨.

export default function LoginPage() {
  const router  = useRouter();
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [pending,  setPending]  = useState(false);

  const validate = (): string | null => {
    if (!email.trim())    return '이메일을 입력해 주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 형식이 아닙니다.';
    if (!password)        return '비밀번호를 입력해 주세요.';
    if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    try {
      await login(email.trim(), password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-sm">

        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text">로그인</h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              회원가입
            </Link>
          </p>
        </div>

        {/* 카드 */}
        <div className="card p-7 space-y-5">

          {/* 오류 메시지 */}
          {error && (
            <div
              role="alert"
              className="text-sm text-danger-text bg-danger-bg border border-danger-border rounded-lg px-4 py-3"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* 이메일 */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-text">
                이메일
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-text placeholder:text-text-tertiary
                           bg-white outline-none
                           focus:ring-2 focus:ring-primary focus:border-primary
                           transition-shadow"
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-text">
                  비밀번호
                </label>
                {/* TODO: 비밀번호 찾기 페이지 구현 시 href 연결 */}
                <span className="text-xs text-text-tertiary cursor-not-allowed select-none">
                  비밀번호 찾기
                </span>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm text-text placeholder:text-text-tertiary
                           bg-white outline-none
                           focus:ring-2 focus:ring-primary focus:border-primary
                           transition-shadow"
              />
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={pending}
              className="btn btn-solid btn-lg w-full mt-2"
            >
              {pending ? '로그인 중...' : '로그인'}
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}
