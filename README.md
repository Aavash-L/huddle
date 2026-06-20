# Huddle

> Plans go to die in the group chat. Huddle is where they actually happen.

Huddle is a production-quality mobile-first social planning app that turns "we should hang out sometime" into actual locked plans with real commitment.

## Monorepo Structure

```
huddle/
├── apps/
│   ├── mobile/          # Expo React Native app (iOS + Android)
│   └── web/             # Next.js 15 no-account web responder
├── packages/
│   └── shared/          # Shared TypeScript types & constants
└── supabase/
    ├── migrations/      # Database schema + RLS policies
    └── functions/       # Supabase Edge Functions
```

## Tech Stack

- **Mobile:** React Native + Expo SDK 52, Expo Router, NativeWind, Reanimated, Expo Notifications
- **Backend:** Supabase (Postgres + RLS + Realtime + Edge Functions)
- **Auth:** Supabase phone OTP
- **Web:** Next.js 15 App Router, Tailwind CSS 4
- **AI:** Anthropic Claude (`claude-sonnet-4-6`) for activity suggestions + trip itineraries
- **Payments:** RevenueCat for mobile IAP
- **Analytics:** PostHog
- **Monorepo:** pnpm workspaces + Turborepo

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Supabase CLI
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator (or physical device with Expo Go)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure Supabase

```bash
# Start local Supabase
supabase start

# Run migrations
supabase db push

# Generate TypeScript types
pnpm db:generate-types
```

### 3. Set environment variables

```bash
# Mobile app
cp apps/mobile/.env.example apps/mobile/.env

# Web app
cp apps/web/.env.example apps/web/.env.local
```

Fill in the required values in each `.env` file.

### 4. Start development

```bash
# Start everything
pnpm dev

# Or individually:
pnpm mobile    # Expo dev server
pnpm web       # Next.js dev server
```

## Key Features

- **Huddle creation** — create plans with themes, invite by phone number
- **Availability polling** — tap-to-select time grid with live avatar overlays
- **AI suggestions** — Claude-powered activity ideas optimized for group consensus
- **Commitment tracking** — in / wavering / out with reliability scoring
- **Lock It In** — celebratory confetti + haptics when the plan is real
- **No-account web flow** — invitees respond via link without installing the app
- **Trip Mode** — multi-day itinerary planning with cost splitting
- **Smart reminders** — loss-framed push notifications at key moments
- **Reliability score** — track who shows up. Never-bail streak.

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for the full schema.

Key tables:
- `users` — profiles with reliability scores
- `crews` — recurring friend groups
- `plans` — the core planning unit
- `plan_invitees` — invited users + response tokens for no-account flow
- `availability` — time slot selections
- `commitments` — in/wavering/out status
- `suggestions` — AI-generated + voted activity ideas
- `trips` — Trip Mode extension
- `messages` — per-plan chat

## Edge Functions

- `send-reminders` — scheduled notification engine with loss-framed copy
- `ai-suggestions` — Claude activity suggestions optimized for consensus
- `ai-trip-planner` — Claude multi-day trip itinerary generation
- `convergence` — finds optimal time slot from availability data

## Environment Variables

### Mobile (`apps/mobile/.env`)
See `apps/mobile/.env.example`

### Web (`apps/web/.env.local`)
See `apps/web/.env.example`

## Subscription Tiers

- **Free:** Up to 3 huddles/month, basic features
- **Pro ($7.99/mo or $49.99/yr):** Unlimited huddles, Trip Mode, AI suggestions, priority reminders
- **Trip Pass ($4.99):** One-time purchase for a single trip
