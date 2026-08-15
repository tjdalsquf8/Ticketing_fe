import type { VenueConfig } from '@/types/ticketing';

export const CONCERT_HALL: VenueConfig = {
  id: 'concert-hall-v1',
  name: '프랫티켓홀',
  tiers: {
    standard: { label: '전석', price: 0, color: '#5558D9', bg: '#ECEEFF' },
  },
  zones: [
    { id: 'A', name: 'A', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 20 }, { label: '2', seatCount: 20 },
        { label: '3', seatCount: 20 }, { label: '4', seatCount: 20 },
      ] },
    { id: 'B', name: 'B', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 20 }, { label: '2', seatCount: 20 },
        { label: '3', seatCount: 20 }, { label: '4', seatCount: 20 },
      ] },
    { id: 'C', name: 'C', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 20 }, { label: '2', seatCount: 20 },
        { label: '3', seatCount: 20 }, { label: '4', seatCount: 20 },
      ] },
    { id: 'D', name: 'D', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 20 }, { label: '2', seatCount: 20 },
        { label: '3', seatCount: 20 }, { label: '4', seatCount: 20 },
      ] },
    { id: 'E', name: 'E', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 15 }, { label: '2', seatCount: 15 },
        { label: '3', seatCount: 15 }, { label: '4', seatCount: 15 },
        { label: '5', seatCount: 15 }, { label: '6', seatCount: 15 },
      ] },
    { id: 'F', name: 'F', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 15 }, { label: '2', seatCount: 15 },
        { label: '3', seatCount: 15 }, { label: '4', seatCount: 15 },
        { label: '5', seatCount: 15 }, { label: '6', seatCount: 15 },
      ] },
    { id: 'G', name: 'G', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 15 }, { label: '2', seatCount: 15 },
        { label: '3', seatCount: 15 }, { label: '4', seatCount: 15 },
      ] },
    { id: 'H', name: 'H', tier: 'standard', type: 'seated',
      seatRows: [
        { label: '1', seatCount: 15 }, { label: '2', seatCount: 15 },
        { label: '3', seatCount: 15 }, { label: '4', seatCount: 15 },
      ] },
  ],
  mapGrid: [
    [
      { type: 'label', text: '2F' },
      { type: 'stage', colSpan: 2 },
      { type: 'label', text: '2F' },
    ],
    [
      { type: 'zone', zoneId: 'E' },
      { type: 'zone', zoneId: 'A' },
      { type: 'zone', zoneId: 'B' },
      { type: 'zone', zoneId: 'F' },
    ],
    [
      { type: 'zone', zoneId: 'G' },
      { type: 'zone', zoneId: 'C' },
      { type: 'zone', zoneId: 'D' },
      { type: 'zone', zoneId: 'H' },
    ],
    [
      { type: 'empty' },
      { type: 'label', text: 'FLOOR', colSpan: 2 },
      { type: 'empty' },
    ],
    [
      { type: 'empty' },
      { type: 'label', text: 'CONSOLE', colSpan: 2 },
      { type: 'empty' },
    ],
  ],
};
