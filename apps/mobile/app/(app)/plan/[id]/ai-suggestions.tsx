import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usePlan } from '@/hooks/usePlan';
import { usePro } from '@/hooks/usePro';
import { useAuth } from '@/hooks/useAuth';
import SuggestionCard from '@/components/SuggestionCard';
import VibePicker from '@/components/VibePicker';
import { THEMES } from '@huddle/shared';
import type { CrewTheme, ActivitySuggestionPayload, VibeChipId } from '@huddle/shared';
import { trackAISuggestionRequested } from '@/lib/posthog';
import { supabase } from '@/lib/supabase';

export default function AISuggestionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { plan, suggestions, loading: planLoading, voteForSuggestion, cancelVote } = usePlan(id ?? '');
  const { requireFeature } = usePro();

  const [vibes, setVibes] = useState<VibeChipId[]>([]);
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(suggestions.length === 0);

  const theme = plan ? (THEMES[plan.theme as CrewTheme] ?? THEMES.ocean) : THEMES.ocean;

  // Filter to activity suggestions only
  const activitySuggestions = suggestions.filter((s) => s.kind === 'activity');

  const handleGenerate = useCallback(async () => {
    const hasAccess = await requireFeature('ai_suggestions', 'ai_activity_suggestions');
    if (!hasAccess) return;

    if (!location.trim()) {
      Alert.alert('Add a location', 'Where are you hanging out? City or neighborhood works.');
      return;
    }

    setGenerating(true);
    trackAISuggestionRequested({
      plan_id: id ?? '',
      vibe_chips: vibes,
      location,
      group_size: 4, // TODO: use actual invitee count
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ANON_KEY}`,
        },
        body: JSON.stringify({
          plan_id: id,
          group_size: 4,
          location,
          vibe: vibes,
          budget: budget || 'moderate',
          time_of_day: 'evening',
          rejected_activities: [],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? 'Failed to generate suggestions');
      }

      setShowForm(false);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to generate suggestions. Try again.');
    } finally {
      setGenerating(false);
    }
  }, [id, vibes, location, budget, requireFeature]);

  return (
    <View className="flex-1 bg-[#0F1117]">
      <LinearGradient
        colors={theme.gradient as [string, string]}
        className="pt-14 pb-6 px-4"
      >
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-white/80">← Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">🤖 AI Activity Ideas</Text>
        <Text className="text-white/70 text-sm mt-1">
          Claude picks activities your whole group will actually agree on
        </Text>
      </LinearGradient>

      <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Input form */}
        {showForm && (
          <Animated.View entering={FadeInDown.springify()} className="mb-6">
            <Text className="text-white font-semibold mb-3">Where are you hanging?</Text>
            <View className="bg-white/10 rounded-xl px-4 py-3 mb-4">
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Brooklyn, Lower East Side NYC, Austin TX..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ color: 'white', fontSize: 16 }}
                autoFocus
              />
            </View>

            <Text className="text-white font-semibold mb-3">Budget per person</Text>
            <View className="bg-white/10 rounded-xl px-4 py-3 mb-4">
              <TextInput
                value={budget}
                onChangeText={setBudget}
                placeholder="e.g. under $20, $50, splurge..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ color: 'white', fontSize: 16 }}
              />
            </View>

            <Text className="text-white font-semibold mb-3">What's the vibe?</Text>
            <VibePicker selected={vibes} onToggle={(v) => {
              setVibes((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
              );
            }} />

            <TouchableOpacity
              onPress={handleGenerate}
              disabled={generating || !location.trim()}
              className={`mt-6 rounded-2xl py-4 items-center ${location.trim() ? 'bg-[#667EEA]' : 'bg-white/10'}`}
              activeOpacity={0.85}
            >
              {generating ? (
                <View className="flex-row gap-2 items-center">
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-bold">Asking Claude...</Text>
                </View>
              ) : (
                <Text className={`font-bold text-lg ${location.trim() ? 'text-white' : 'text-white/40'}`}>
                  ✨ Get Ideas
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Suggestions list */}
        {activitySuggestions.length > 0 && (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white font-semibold">3 ideas for your group</Text>
              <TouchableOpacity onPress={() => setShowForm(true)}>
                <Text className="text-[#667EEA] text-sm">Refresh →</Text>
              </TouchableOpacity>
            </View>

            {activitySuggestions.map((suggestion, index) => (
              <Animated.View
                key={suggestion.id}
                entering={FadeInDown.delay(index * 100).springify()}
                className="mb-4"
              >
                <SuggestionCard
                  suggestion={suggestion}
                  rank={index + 1}
                  onVote={() => voteForSuggestion(suggestion.id)}
                  onCancelVote={() => cancelVote(suggestion.id)}
                  onAttach={() => {
                    // TODO: Attach winning suggestion to plan
                    Alert.alert(
                      'Attach Activity',
                      `Set "${(suggestion.payload as ActivitySuggestionPayload).name}" as the plan activity?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Attach',
                          onPress: async () => {
                            await supabase
                              .from('plans')
                              .update({ activity: (suggestion.payload as ActivitySuggestionPayload).name })
                              .eq('id', id);
                            router.back();
                          },
                        },
                      ]
                    );
                  }}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {!showForm && activitySuggestions.length === 0 && !generating && (
          <View className="items-center py-12">
            <Text className="text-4xl mb-4">🤖</Text>
            <Text className="text-white/50 text-center">
              Fill out the form above to get AI-powered activity ideas
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
