import { View, Text, TouchableOpacity, Linking } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { Suggestion, ActivitySuggestionPayload } from '@huddle/shared';

interface SuggestionCardProps {
  suggestion: Suggestion;
  rank: number;
  onVote: () => void;
  onCancelVote: () => void;
  onAttach: () => void;
  hasVoted?: boolean;
}

const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

export default function SuggestionCard({
  suggestion,
  rank,
  onVote,
  onCancelVote,
  onAttach,
  hasVoted = false,
}: SuggestionCardProps) {
  const payload = suggestion.payload as ActivitySuggestionPayload;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleVote = () => {
    scale.value = withSpring(1.04, { damping: 8, stiffness: 300 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 8 });
    }, 150);

    if (hasVoted) {
      onCancelVote();
    } else {
      onVote();
    }
  };

  const handleBooking = () => {
    if (payload.booking_url) {
      Linking.openURL(payload.booking_url).catch(console.error);
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <View
        className="bg-white/5 rounded-3xl overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: hasVoted ? '#667EEA' : 'rgba(255,255,255,0.08)',
        }}
      >
        {/* Rank badge + vote button */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <Text className="text-2xl">{RANK_EMOJIS[rank - 1] ?? '⭐'}</Text>

          <View className="flex-row items-center gap-3">
            <Text className="text-white/40 text-sm">
              {suggestion.votes} {suggestion.votes === 1 ? 'vote' : 'votes'}
            </Text>

            <TouchableOpacity
              onPress={handleVote}
              className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
                hasVoted ? 'bg-[#667EEA]' : 'bg-white/10'
              }`}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 14 }}>👍</Text>
              <Text
                className={`text-sm font-semibold ${hasVoted ? 'text-white' : 'text-white/60'}`}
              >
                {hasVoted ? 'Voted' : 'Vote'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View className="px-4 pb-4">
          <Text className="text-white text-xl font-bold mb-2">{payload.name}</Text>

          <Text className="text-white/70 text-sm leading-5 mb-4">
            {payload.why_it_fits}
          </Text>

          {/* Meta chips */}
          <View className="flex-row flex-wrap gap-2 mb-4">
            {payload.rough_cost && (
              <View className="bg-green-500/15 rounded-full px-3 py-1 flex-row items-center gap-1">
                <Text style={{ fontSize: 12 }}>💰</Text>
                <Text className="text-green-300 text-xs font-medium">{payload.rough_cost}</Text>
              </View>
            )}
            {payload.distance_description && (
              <View className="bg-blue-500/15 rounded-full px-3 py-1 flex-row items-center gap-1">
                <Text style={{ fontSize: 12 }}>📍</Text>
                <Text className="text-blue-300 text-xs font-medium">{payload.distance_description}</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-2">
            {payload.booking_url && (
              <TouchableOpacity
                onPress={handleBooking}
                className="flex-1 bg-white/10 rounded-xl py-2.5 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white/70 text-sm font-medium">🔗 Book</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onAttach}
              className="flex-1 bg-[#667EEA] rounded-xl py-2.5 items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white text-sm font-bold">✓ Pick This</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
