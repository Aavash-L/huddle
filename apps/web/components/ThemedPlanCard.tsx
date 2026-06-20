import { THEMES, PLAN_TYPES, PLAN_STATUSES } from '@huddle/shared';
import type { Plan, CrewTheme } from '@huddle/shared';

interface ThemedPlanCardProps {
  plan: Partial<Plan> & {
    title: string;
    theme: string;
    type: string;
    status: string;
  };
  inCount?: number;
  inviteeCount?: number;
  creatorName?: string;
}

export default function ThemedPlanCard({
  plan,
  inCount = 0,
  inviteeCount = 0,
  creatorName,
}: ThemedPlanCardProps) {
  const theme = THEMES[(plan.theme as CrewTheme)] ?? THEMES.ocean;
  const planType = PLAN_TYPES[(plan.type as keyof typeof PLAN_TYPES)] ?? PLAN_TYPES.hangout;
  const statusMeta = PLAN_STATUSES[(plan.status as keyof typeof PLAN_STATUSES)];

  const gradientStyle = {
    background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[theme.gradient.length - 1]})`,
  };

  return (
    <div className="rounded-3xl overflow-hidden shadow-xl" style={gradientStyle}>
      <div className="p-5">
        {/* Type + Status row */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{planType.emoji}</span>
          {statusMeta && (
            <span
              className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: 'rgba(0,0,0,0.2)',
                color: theme.textColor,
              }}
            >
              {statusMeta.emoji} {statusMeta.label}
            </span>
          )}
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold leading-tight mb-1"
          style={{ color: theme.textColor }}
        >
          {plan.title}
        </h2>

        {/* Creator */}
        {creatorName && (
          <p className="text-sm mb-3" style={{ color: `${theme.textColor}80` }}>
            by {creatorName}
          </p>
        )}

        {/* Stats */}
        <div
          className="flex items-center gap-2 mt-3 px-3 py-2 rounded-2xl"
          style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
        >
          <span className="text-sm font-semibold" style={{ color: theme.textColor }}>
            {inCount} of {inviteeCount} in 🔥
          </span>
        </div>
      </div>
    </div>
  );
}
