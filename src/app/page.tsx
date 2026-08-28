import HomeWelcomeHero from './HomeWelcomeHero';
import HomeAnnouncements from './HomeAnnouncements';
import HomePersonalStrip from './HomePersonalStrip';
import HomeOpenBanner from './HomeOpenBanner';
import HomeUpcomingList from './HomeUpcomingList';
import HomeLiveHero from './HomeLiveHero';
import HomeLatestResults from './HomeLatestResults';
import HomeActivityStats from './HomeActivityStats';
import HomeModesIntro from './HomeModesIntro';
import HomeOnboarding from './HomeOnboarding';

/* ──────────────────────────────────────────
   홈 — 오밀조밀 · 스크롤 최소.
   섹션 간격 tight, 히어로 다음부터 정보 밀도 최대.
   ────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      <HomeWelcomeHero />
      <HomeAnnouncements />
      <HomePersonalStrip />
      <HomeOpenBanner />
      <HomeUpcomingList />
      <HomeLiveHero />
      <HomeLatestResults />
      <HomeActivityStats />
      <HomeModesIntro />
      <HomeOnboarding />
    </div>
  );
}
