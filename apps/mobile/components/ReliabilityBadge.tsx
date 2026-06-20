import { View, Text } from 'react-native';

interface ReliabilityBadgeProps {
  score: number; // 0-100
  streak: number;
  large?: boolean;
}

function getScoreLabel(score: number): { label: string; emoji: string; color: string } {
  if (score >= 90) return { label: 'Legendary', emoji: '🏆', color: '#F59E0B' };
  if (score >= 80) return { label: 'Rock Solid', emoji: '💎', color: '#6366F1' };
  if (score >= 70) return { label: 'Pretty Good', emoji: '⭐', color: '#22C55E' };
  if (score >= 60) return { label: 'Improving', emoji: '📈', color: '#3B82F6' };
  if (score >= 40) return { label: 'Getting There', emoji: '🌱', color: '#EAB308' };
  return { label: 'Flakey', emoji: '😬', color: '#EF4444' };
}

export default function ReliabilityBadge({ score, streak, large = false }: ReliabilityBadgeProps) {
  const { label, emoji, color } = getScoreLabel(score);

  const containerSize = large ? 'p-5' : 'p-4';
  const titleSize = large ? 'text-lg' : 'text-sm';
  const scoreSize = large ? 'text-4xl' : 'text-2xl';
  const subtitleSize = large ? 'text-sm' : 'text-xs';

  return (
    <View className={`bg-white/5 rounded-3xl ${containerSize}`}>
      <View className="flex-row items-center gap-3">
        {/* Score ring */}
        <View
          style={{
            width: large ? 72 : 56,
            height: large ? 72 : 56,
            borderRadius: 36,
            borderWidth: 3,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${color}15`,
          }}
        >
          <Text style={{ color, fontSize: large ? 22 : 18, fontWeight: '800' }}>
            {score}
          </Text>
        </View>

        {/* Labels */}
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text style={{ fontSize: large ? 20 : 16 }}>{emoji}</Text>
            <Text className={`text-white font-bold ${titleSize}`}>{label}</Text>
          </View>
          <Text className={`text-white/50 ${subtitleSize} mt-0.5`}>
            Shows up {score}% of the time
          </Text>
          {streak > 0 && (
            <Text className={`text-white/70 ${subtitleSize} mt-1 font-semibold`}>
              🔥 Never-Bails Streak: {streak}
            </Text>
          )}
        </View>
      </View>

      {/* Score bar */}
      <View className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
        <View
          style={{
            width: `${score}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}
