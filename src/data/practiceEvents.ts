import type { VenueConfig } from '@/types/ticketing';
import { CONCERT_HALL } from './concertHall';

export interface PracticeEvent {
  id: string;
  eventId: number;     // 백엔드 eventId (랭킹/세션 API 파라미터)
  title: string;
  venueName: string;
  period: string;
  posterBg: string;
  posterAccent: string;
  posterImage: string;
  sessions: { label: string; time: string }[];
  venue: VenueConfig;
}

/* ── 이벤트 2: 소규모 클럽 ── */
const CLUB_STAGE: VenueConfig = {
  id: 'club-stage-v1',
  name: '홍대 클럽 스테이지',
  tiers: {
    standard: { label: '전석', price: 0, color: '#16A34A', bg: '#F0FDF4' },
  },
  zones: [
    {
      id: 'A', name: 'A', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 10 },
        { label: '2', seatCount: 10 },
        { label: '3', seatCount: 10 },
      ],
    },
    {
      id: 'B', name: 'B', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 10 },
        { label: '2', seatCount: 10 },
        { label: '3', seatCount: 10 },
      ],
    },
    {
      id: 'C', name: 'C', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 8 },
        { label: '2', seatCount: 8 },
        { label: '3', seatCount: 8 },
      ],
    },
    {
      id: 'D', name: 'D', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 8 },
        { label: '2', seatCount: 8 },
        { label: '3', seatCount: 8 },
      ],
    },
  ],
  mapGrid: [
    [
      { type: 'label', text: '2F' },
      { type: 'stage', colSpan: 2 },
      { type: 'label', text: '2F' },
    ],
    [
      { type: 'zone', zoneId: 'A' },
      { type: 'zone', zoneId: 'B' },
      { type: 'empty' },
      { type: 'empty' },
    ],
    [
      { type: 'zone', zoneId: 'C' },
      { type: 'zone', zoneId: 'D' },
      { type: 'empty' },
      { type: 'empty' },
    ],
    [
      { type: 'empty' },
      { type: 'label', text: 'FLOOR', colSpan: 2 },
      { type: 'empty' },
    ],
  ],
};

/* ── 이벤트 3: 대규모 아레나 ── */
const ARENA: VenueConfig = {
  id: 'arena-v1',
  name: '잠실 보조경기장',
  tiers: {
    vip:     { label: 'VIP석', price: 0, color: '#DC2626', bg: '#FEF2F2' },
    general: { label: '일반석', price: 0, color: '#2563EB', bg: '#EFF6FF' },
  },
  zones: [
    {
      id: 'VIP-L', name: 'VIP-L', tier: 'vip', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 10 },
        { label: '2', seatCount: 10 },
        { label: '3', seatCount: 10 },
        { label: '4', seatCount: 10 },
      ],
    },
    {
      id: 'VIP-R', name: 'VIP-R', tier: 'vip', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 10 },
        { label: '2', seatCount: 10 },
        { label: '3', seatCount: 10 },
        { label: '4', seatCount: 10 },
      ],
    },
    {
      id: 'A', name: 'A', tier: 'general', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 15 },
        { label: '2', seatCount: 15 },
        { label: '3', seatCount: 15 },
        { label: '4', seatCount: 15 },
      ],
    },
    {
      id: 'B', name: 'B', tier: 'general', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 15 },
        { label: '2', seatCount: 15 },
        { label: '3', seatCount: 15 },
        { label: '4', seatCount: 15 },
      ],
    },
    {
      id: 'C', name: 'C', tier: 'general', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 12 },
        { label: '2', seatCount: 12 },
        { label: '3', seatCount: 12 },
        { label: '4', seatCount: 12 },
      ],
    },
    {
      id: 'D', name: 'D', tier: 'general', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 12 },
        { label: '2', seatCount: 12 },
        { label: '3', seatCount: 12 },
        { label: '4', seatCount: 12 },
      ],
    },
  ],
  mapGrid: [
    [
      { type: 'label', text: 'VIP' },
      { type: 'stage', colSpan: 2 },
      { type: 'label', text: 'VIP' },
    ],
    [
      { type: 'zone', zoneId: 'VIP-L' },
      { type: 'zone', zoneId: 'A' },
      { type: 'zone', zoneId: 'B' },
      { type: 'zone', zoneId: 'VIP-R' },
    ],
    [
      { type: 'empty' },
      { type: 'zone', zoneId: 'C' },
      { type: 'zone', zoneId: 'D' },
      { type: 'empty' },
    ],
    [
      { type: 'empty' },
      { type: 'label', text: 'FLOOR', colSpan: 2 },
      { type: 'empty' },
    ],
  ],
};

export const PRACTICE_EVENTS: PracticeEvent[] = [
  {
    id: 'hall-a',
    eventId: 1,
    title: '[연습] 티켓팅 마스터 클래스 - 서울',
    venueName: '프랫티켓홀',
    period: '2026.08.01 ~ 2026.08.31',
    posterBg: '#0B1628',
    posterAccent: '#3B6BCC',
    posterImage: '/Img/1.png',
    sessions: [
      { label: '1회 18:00', time: '18시 00분' },
      { label: '2회 21:00', time: '21시 00분' },
    ],
    venue: CONCERT_HALL,
  },
  {
    id: 'club-b',
    eventId: 2,
    title: '[연습] 인디 뮤직 페스티벌 - 홍대',
    venueName: '홍대 클럽 스테이지',
    period: '2026.08.05 ~ 2026.08.10',
    posterBg: '#0A1A12',
    posterAccent: '#2D7A4F',
    posterImage: '/Img/2.png',
    sessions: [
      { label: '1회 20:00', time: '20시 00분' },
    ],
    venue: CLUB_STAGE,
  },
  {
    id: 'arena-c',
    eventId: 3,
    title: '[연습] 서머 팝 콘서트 - 잠실',
    venueName: '잠실 보조경기장',
    period: '2026.08.15 ~ 2026.08.16',
    posterBg: '#180A04',
    posterAccent: '#C14B1A',
    posterImage: '/Img/3.png',
    sessions: [
      { label: '1회 17:00', time: '17시 00분' },
      { label: '2회 20:00', time: '20시 00분' },
    ],
    venue: ARENA,
  },
];
