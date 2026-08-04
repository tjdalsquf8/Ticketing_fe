'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface FieldErrors {
  name?:            string;
  email?:           string;
  password?:        string;
  passwordConfirm?: string;
}

function validateFields(
  name: string,
  email: string,
  password: string,
  passwordConfirm: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = '이름을 입력해 주세요.';
  } else if (name.trim().length < 2) {
    errors.name = '이름은 2자 이상이어야 합니다.';
  }

  if (!email.trim()) {
    errors.email = '이메일을 입력해 주세요.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = '올바른 이메일 형식이 아닙니다.';
  }

  if (!password) {
    errors.password = '비밀번호를 입력해 주세요.';
  } else if (password.length < 8) {
    errors.password = '비밀번호는 8자 이상이어야 합니다.';
  } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = '비밀번호는 영문과 숫자를 포함해야 합니다.';
  }

  if (!passwordConfirm) {
    errors.passwordConfirm = '비밀번호 확인을 입력해 주세요.';
  } else if (password !== passwordConfirm) {
    errors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
  }

  return errors;
}

export default function SignupPage() {
  const router   = useRouter();
  const { signup } = useAuth();

  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors,     setFieldErrors]     = useState<FieldErrors>({});
  const [submitError,     setSubmitError]     = useState('');
  const [pending,         setPending]         = useState(false);

  // 필드 단위 실시간 오류 제거 (입력 시작하면 해당 에러 클리어)
  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError('');

    const errors = validateFields(name, email, password, passwordConfirm);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setPending(true);
    try {
      await signup(email.trim(), password, name.trim());
      router.push('/');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : '회원가입에 실패했습니다. 다시 시도해 주세요.',
      );
    } finally {
      setPending(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    [
      'w-full rounded-lg border px-3.5 py-2.5 text-sm text-text placeholder:text-text-tertiary',
      'bg-white outline-none transition-shadow',
      hasError
        ? 'border-danger-border focus:ring-2 focus:ring-danger-border'
        : 'border-border focus:ring-2 focus:ring-primary focus:border-primary',
    ].join(' ');

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-sm">

        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text">회원가입</h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              로그인
            </Link>
          </p>
        </div>

        {/* 카드 */}
        <div className="card p-7 space-y-5">

          {/* 서버 오류 */}
          {submitError && (
            <div
              role="alert"
              className="text-sm text-danger-text bg-danger-bg border border-danger-border rounded-lg px-4 py-3"
            >
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* 이름 */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-text">
                이름
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
                placeholder="홍길동"
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                aria-invalid={!!fieldErrors.name}
                className={inputClass(!!fieldErrors.name)}
              />
              {fieldErrors.name && (
                <p id="name-error" role="alert" className="text-xs text-danger-text">
                  {fieldErrors.name}
                </p>
              )}
            </div>

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
                onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                placeholder="you@example.com"
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                aria-invalid={!!fieldErrors.email}
                className={inputClass(!!fieldErrors.email)}
              />
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="text-xs text-danger-text">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-text">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                placeholder="영문+숫자 8자 이상"
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                aria-invalid={!!fieldErrors.password}
                className={inputClass(!!fieldErrors.password)}
              />
              {fieldErrors.password && (
                <p id="password-error" role="alert" className="text-xs text-danger-text">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div className="space-y-1.5">
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-text">
                비밀번호 확인
              </label>
              <input
                id="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                value={passwordConfirm}
                onChange={(e) => { setPasswordConfirm(e.target.value); clearFieldError('passwordConfirm'); }}
                placeholder="비밀번호 재입력"
                aria-describedby={fieldErrors.passwordConfirm ? 'passwordConfirm-error' : undefined}
                aria-invalid={!!fieldErrors.passwordConfirm}
                className={inputClass(!!fieldErrors.passwordConfirm)}
              />
              {fieldErrors.passwordConfirm && (
                <p id="passwordConfirm-error" role="alert" className="text-xs text-danger-text">
                  {fieldErrors.passwordConfirm}
                </p>
              )}
            </div>

            {/* 약관 동의 안내 */}
            <p className="text-xs text-text-tertiary leading-relaxed">
              가입 시{' '}
              <span className="text-text-secondary font-medium">이용약관</span> 및{' '}
              <span className="text-text-secondary font-medium">개인정보처리방침</span>에
              동의하는 것으로 간주됩니다.
            </p>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={pending}
              className="btn btn-solid btn-lg w-full"
            >
              {pending ? '처리 중...' : '회원가입'}
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}
