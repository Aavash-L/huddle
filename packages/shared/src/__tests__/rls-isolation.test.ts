// ============================================================
// Tests: RLS isolation proof (logic layer)
// ============================================================
// These tests validate the RLS POLICY LOGIC — not the SQL itself.
// For full DB-layer RLS tests, run against a live Supabase instance.
// The logic mirrors what the SQL policies enforce.
// ============================================================

import { describe, it, expect } from 'vitest';

// ─── Mirror plan access logic ─────────────────────────────────

interface PlanInvitee {
  plan_id: string;
  user_id: string | null;
  response_token: string;
}

function canReadPlan(
  planId: string,
  creatorId: string,
  invitees: PlanInvitee[],
  requestingUserId: string | null,
  requestingToken: string | null
): boolean {
  // Policy: plans_select_involved
  if (requestingUserId !== null) {
    if (creatorId === requestingUserId) return true;
    if (invitees.some((i) => i.plan_id === planId && i.user_id === requestingUserId)) return true;
  }
  // Policy: plans_select_by_token (migration 003)
  if (requestingToken !== null) {
    if (invitees.some((i) => i.plan_id === planId && i.response_token === requestingToken)) return true;
  }
  return false;
}

function canReadAvailability(
  planId: string,
  availabilityUserId: string | null,
  availabilityToken: string | null,
  requestingUserId: string | null,
  requestingToken: string | null,
  planCreatorId: string,
  invitees: PlanInvitee[]
): boolean {
  if (requestingUserId !== null) {
    if (availabilityUserId === requestingUserId) return true;
    if (invitees.some((i) => i.plan_id === planId && i.user_id === requestingUserId)) return true;
    if (planCreatorId === requestingUserId) return true;
  }
  if (requestingToken !== null && availabilityToken === requestingToken) return true;
  return false;
}

// ─── Tests ───────────────────────────────────────────────────

const PLAN_A = 'plan-a';
const PLAN_B = 'plan-b';
const USER_1 = 'user-1'; // creator of plan A
const USER_2 = 'user-2'; // invited to plan A
const USER_3 = 'user-3'; // has nothing to do with plan A
const TOKEN_A = 'token-for-plan-a';
const TOKEN_OTHER = 'token-not-in-any-plan';

const inviteesA: PlanInvitee[] = [
  { plan_id: PLAN_A, user_id: USER_2, response_token: 'different-token' },
  { plan_id: PLAN_A, user_id: null, response_token: TOKEN_A },
];

describe('RLS: Plan read isolation', () => {
  it('creator can read their own plan', () => {
    expect(canReadPlan(PLAN_A, USER_1, inviteesA, USER_1, null)).toBe(true);
  });

  it('invited user can read the plan', () => {
    expect(canReadPlan(PLAN_A, USER_1, inviteesA, USER_2, null)).toBe(true);
  });

  it('uninvited user cannot read the plan', () => {
    expect(canReadPlan(PLAN_A, USER_1, inviteesA, USER_3, null)).toBe(false);
  });

  it('anonymous user with valid response_token can read the plan', () => {
    expect(canReadPlan(PLAN_A, USER_1, inviteesA, null, TOKEN_A)).toBe(true);
  });

  it('anonymous user with WRONG token cannot read the plan', () => {
    expect(canReadPlan(PLAN_A, USER_1, inviteesA, null, TOKEN_OTHER)).toBe(false);
  });

  it('token for plan A cannot read plan B', () => {
    const inviteesB: PlanInvitee[] = [
      { plan_id: PLAN_B, user_id: USER_3, response_token: 'token-for-plan-b' },
    ];
    expect(canReadPlan(PLAN_B, USER_3, inviteesB, null, TOKEN_A)).toBe(false);
  });

  it('null user with null token cannot read anything', () => {
    expect(canReadPlan(PLAN_A, USER_1, inviteesA, null, null)).toBe(false);
  });
});

describe('RLS: Availability read isolation', () => {
  it('plan creator can read all availability for their plan', () => {
    expect(canReadAvailability(PLAN_A, USER_2, null, USER_1, null, USER_1, inviteesA)).toBe(true);
  });

  it('invited user can read availability for their plan', () => {
    expect(canReadAvailability(PLAN_A, USER_3, null, USER_2, null, USER_1, inviteesA)).toBe(true);
  });

  it('uninvited user cannot read availability', () => {
    expect(canReadAvailability(PLAN_A, USER_2, null, USER_3, null, USER_1, inviteesA)).toBe(false);
  });

  it('token holder can read their own availability row', () => {
    expect(canReadAvailability(PLAN_A, null, TOKEN_A, null, TOKEN_A, USER_1, inviteesA)).toBe(true);
  });

  it('token holder cannot read other users availability rows', () => {
    expect(canReadAvailability(PLAN_A, USER_2, null, null, TOKEN_A, USER_1, inviteesA)).toBe(false);
  });
});

describe('RLS: Cross-plan isolation', () => {
  it('a token for plan A cannot be used to access plan B data', () => {
    const inviteesB: PlanInvitee[] = [
      { plan_id: PLAN_B, user_id: USER_2, response_token: 'plan-b-token' },
    ];
    // Attempt to read plan B with plan A's token
    expect(canReadPlan(PLAN_B, USER_3, inviteesB, null, TOKEN_A)).toBe(false);
  });

  it('user from plan A cannot read plan B they are not in', () => {
    const inviteesB: PlanInvitee[] = [
      { plan_id: PLAN_B, user_id: USER_3, response_token: 'plan-b-token' },
    ];
    expect(canReadPlan(PLAN_B, USER_3, inviteesB, USER_2, null)).toBe(false);
  });
});
