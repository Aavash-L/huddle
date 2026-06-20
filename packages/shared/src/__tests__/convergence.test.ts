// ============================================================
// Tests: Convergence max-overlap algorithm
// Run: pnpm --filter @huddle/shared test
// ============================================================

import { describe, it, expect } from 'vitest';

// ─── Pure convergence algorithm (extracted for unit testing) ──
// This mirrors the logic in supabase/functions/convergence/index.ts

interface TimeWindow {
  date: string;
  slot: string;
}

interface AvailabilityRow {
  user_id: string | null;
  response_token: string | null;
  time_window: TimeWindow;
  available: boolean;
}

interface SlotData {
  time_window: TimeWindow;
  available_user_ids: string[];
  available_tokens: string[];
  total_available: number;
}

function findBestSlots(rows: AvailabilityRow[]): SlotData[] {
  const slotMap = new Map<string, SlotData>();

  for (const row of rows) {
    if (!row.available) continue;
    const key = `${row.time_window.date}::${row.time_window.slot}`;

    if (!slotMap.has(key)) {
      slotMap.set(key, {
        time_window: row.time_window,
        available_user_ids: [],
        available_tokens: [],
        total_available: 0,
      });
    }

    const slot = slotMap.get(key)!;
    if (row.user_id && !slot.available_user_ids.includes(row.user_id)) {
      slot.available_user_ids.push(row.user_id);
      slot.total_available++;
    } else if (row.response_token && !slot.available_tokens.includes(row.response_token)) {
      slot.available_tokens.push(row.response_token);
      slot.total_available++;
    }
  }

  return Array.from(slotMap.values()).sort((a, b) => b.total_available - a.total_available);
}

// ─── Tests ───────────────────────────────────────────────────

describe('Convergence: findBestSlots', () => {
  it('returns empty array when no availability rows', () => {
    expect(findBestSlots([])).toEqual([]);
  });

  it('finds the single best slot when all users agree', () => {
    const rows: AvailabilityRow[] = [
      { user_id: 'user1', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
      { user_id: 'user2', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
      { user_id: 'user3', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
    ];

    const slots = findBestSlots(rows);
    expect(slots).toHaveLength(1);
    expect(slots[0].total_available).toBe(3);
    expect(slots[0].time_window).toEqual({ date: '2026-06-27', slot: 'evening' });
  });

  it('ranks slots by total availability descending', () => {
    const rows: AvailabilityRow[] = [
      { user_id: 'user1', response_token: null, time_window: { date: '2026-06-27', slot: 'morning' }, available: true },
      { user_id: 'user1', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
      { user_id: 'user2', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
      { user_id: 'user3', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
    ];

    const slots = findBestSlots(rows);
    expect(slots[0].time_window.slot).toBe('evening');
    expect(slots[0].total_available).toBe(3);
    expect(slots[1].time_window.slot).toBe('morning');
    expect(slots[1].total_available).toBe(1);
  });

  it('counts anonymous token-based responders correctly', () => {
    const rows: AvailabilityRow[] = [
      { user_id: 'user1', response_token: null, time_window: { date: '2026-06-28', slot: 'afternoon' }, available: true },
      { user_id: null, response_token: 'token-abc', time_window: { date: '2026-06-28', slot: 'afternoon' }, available: true },
      { user_id: null, response_token: 'token-xyz', time_window: { date: '2026-06-28', slot: 'afternoon' }, available: true },
    ];

    const slots = findBestSlots(rows);
    expect(slots[0].total_available).toBe(3);
    expect(slots[0].available_user_ids).toEqual(['user1']);
    expect(slots[0].available_tokens).toHaveLength(2);
  });

  it('deduplicates the same user responding twice', () => {
    const rows: AvailabilityRow[] = [
      { user_id: 'user1', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
      { user_id: 'user1', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
    ];

    const slots = findBestSlots(rows);
    expect(slots[0].total_available).toBe(1);
    expect(slots[0].available_user_ids).toEqual(['user1']);
  });

  it('ignores available=false rows', () => {
    const rows: AvailabilityRow[] = [
      { user_id: 'user1', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: false },
      { user_id: 'user2', response_token: null, time_window: { date: '2026-06-27', slot: 'morning' }, available: true },
    ];

    const slots = findBestSlots(rows);
    expect(slots).toHaveLength(1);
    expect(slots[0].time_window.slot).toBe('morning');
  });

  it('handles mixed available/unavailable for the same slot', () => {
    const rows: AvailabilityRow[] = [
      { user_id: 'user1', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
      { user_id: 'user2', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: false },
      { user_id: 'user3', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
    ];

    const slots = findBestSlots(rows);
    expect(slots[0].total_available).toBe(2);
    expect(slots[0].available_user_ids).toContain('user1');
    expect(slots[0].available_user_ids).toContain('user3');
    expect(slots[0].available_user_ids).not.toContain('user2');
  });

  it('correctly identifies who would miss the best slot', () => {
    const rows: AvailabilityRow[] = [
      { user_id: 'user1', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
      { user_id: 'user2', response_token: null, time_window: { date: '2026-06-27', slot: 'evening' }, available: true },
      { user_id: 'user3', response_token: null, time_window: { date: '2026-06-28', slot: 'evening' }, available: true },
    ];

    const inviteeIds = ['user1', 'user2', 'user3'];
    const slots = findBestSlots(rows);
    const bestSlot = slots[0];
    const wouldMiss = inviteeIds.filter((id) => !bestSlot.available_user_ids.includes(id));

    expect(bestSlot.time_window.date).toBe('2026-06-27');
    expect(wouldMiss).toEqual(['user3']);
  });
});

// ─── Reliability score logic tests ───────────────────────────

describe('Reliability: score update logic', () => {
  function updateScore(current: number, attended: boolean): number {
    if (attended) return Math.min(100, current + 5);
    return Math.max(0, current - 15);
  }

  function updateStreak(current: number, attended: boolean): number {
    if (attended) return current + 1;
    return 0;
  }

  it('increments streak and score when user attends', () => {
    expect(updateScore(90, true)).toBe(95);
    expect(updateStreak(5, true)).toBe(6);
  });

  it('resets streak and decrements score when user bails', () => {
    expect(updateScore(90, false)).toBe(75);
    expect(updateStreak(12, false)).toBe(0);
  });

  it('caps score at 100', () => {
    expect(updateScore(98, true)).toBe(100);
    expect(updateScore(100, true)).toBe(100);
  });

  it('floors score at 0', () => {
    expect(updateScore(10, false)).toBe(0);
    expect(updateScore(0, false)).toBe(0);
  });
});
