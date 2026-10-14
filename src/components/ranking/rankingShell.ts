/**
 * 랭킹 테이블 껍데기 공용 클래스.
 *
 * 참여자가 수천 명이면 목록이 페이지를 통째로 늘려서, 하단 고정 "내 순위" 행을
 * 보려면 끝까지 스크롤해야 한다. 목록만 고정 높이 스크롤 영역에 넣고 헤더는
 * 위, 내 순위 행은 아래에 붙여 둔다.
 */

/** 목록 스크롤 영역 높이 (모바일 먼저, sm 이상에서 확장). */
export const RANK_SCROLL_HEIGHT = 'max-h-[24rem] sm:max-h-[32rem]';

/**
 * 스크롤 영역 안에서 상단 고정되는 thead 셀 클래스.
 * border-collapse 테이블에서는 sticky 셀의 border 가 사라지므로 inset shadow 로 그린다.
 */
export const RANK_HEAD_CELL =
  'sticky top-0 z-20 bg-bg-subtle shadow-[inset_0_-1px_0_var(--bd)]';
