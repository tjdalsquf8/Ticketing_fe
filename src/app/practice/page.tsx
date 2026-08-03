import type { Metadata } from 'next';
import PracticeClient from './PracticeClient';

export const metadata: Metadata = { title: '연습 모드' };

export default function PracticePage() {
  return <PracticeClient />;
}
