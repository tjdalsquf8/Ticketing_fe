/**
 * SVG · canvas · 외부 라이브러리(Chart.js 등)처럼
 * CSS 변수를 직접 소비할 수 없는 곳에서만 사용.
 * Tailwind 클래스로 처리 가능한 경우는 클래스를 직접 사용할 것.
 */

/** 브랜드 고정 색상 (라이트/다크 모드 무관) */
export const brand = {
  primary:      '#E85D00',
  primaryHover: '#C24E00',
} as const;

/** 런타임 CSS 변수 참조 — 라이트/다크 자동 대응 */
export const color = {
  bg: {
    page:    'var(--bg-page)',
    surface: 'var(--bg-surface)',
    subtle:  'var(--bg-subtle)',
    muted:   'var(--bg-muted)',
  },
  border: {
    default: 'var(--bd)',
    subtle:  'var(--bd-subtle)',
    strong:  'var(--bd-strong)',
  },
  text: {
    default:   'var(--tx)',
    secondary: 'var(--tx-secondary)',
    tertiary:  'var(--tx-tertiary)',
    disabled:  'var(--tx-disabled)',
  },
  success: { text: 'var(--success-tx)', bg: 'var(--success-bg)', border: 'var(--success-bd)' },
  danger:  { text: 'var(--danger-tx)',  bg: 'var(--danger-bg)',  border: 'var(--danger-bd)'  },
  warning: { text: 'var(--warning-tx)', bg: 'var(--warning-bg)', border: 'var(--warning-bd)' },
  info:    { text: 'var(--info-tx)',    bg: 'var(--info-bg)',    border: 'var(--info-bd)'    },
} as const;

export const shadow = {
  xs: 'var(--shadow-xs)',
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
} as const;

export const duration = {
  fast:   'var(--duration-fast)',
  normal: 'var(--duration-normal)',
  slow:   'var(--duration-slow)',
} as const;
