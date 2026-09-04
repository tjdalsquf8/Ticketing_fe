import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-lg font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-text-tertiary">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/"
        className="text-sm text-primary underline underline-offset-4"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
