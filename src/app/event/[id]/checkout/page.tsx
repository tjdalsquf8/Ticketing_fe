import { redirect } from 'next/navigation';

/* ──────────────────────────────────────────
   /event/[id]/checkout — 결제 확인 페이지 (deprecated)
   ─ 실 API에서는 상세 페이지의 신청 모달로 500P 결제가 처리됨.
   ─ 진입 시 상세 페이지로 즉시 리다이렉트.
   ────────────────────────────────────────── */

export default async function CheckoutRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/event/${id}`);
}
