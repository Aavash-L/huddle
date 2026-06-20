import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/hooks/useAuth';
import TimeGrid from '@/components/TimeGrid';
import { THEMES } from '@huddle/shared';
import type { CrewTheme } from '@huddle/shared';
import { trackAvailabilitySubmitted } from '@/lib/posthog';

export default function AvailabilityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { plan, availability, loading, submitAvailability } = usePlan(id ?? '');
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; slot: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const theme = plan ? (THEMES[plan.theme as CrewTheme] ?? THEMES.ocean) : THEMES.ocean;

  // Build date range: next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const TIME_SLOTS = ['morning', 'afternoon', 'evening'];

  const toggleSlot = useCallback((date: string, slot: string) => {
    const key = `${date}::${slot}`;
    setSelectedSlots((prev) => {
      const existing = prev.find((s) => `${s.date}::${s.slot}` === key);
      if (existing) {
        return prev.filter((s) => `${s.date}::${s.slot}` !== key);
      }
      return [...prev, { date, slot }];
    });
  }, []);

  const handleSave = async () => {
    if (saving) return;
    if (selectedSlots.length === 0) {
      Alert.alert('Pick some times', "Select at least one time you're available.");
      return;
    }

    setSaving(true);
    const { error } = await submitAvailability(selectedSlots, true);
    setSaving(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    trackAvailabilitySubmitted({
      plan_id: id ?? '',
      slots_selected: selectedSlots.length,
      is_web_responder: false,
    });

    router.back();
  };

  // Map availability to per-slot user sets
  const slotUserMap: Record<string, string[]> = {};
  for (const a of availability) {
    if (!a.available) continue;
    const tw = a.time_window as { date: string; slot: string };
    const key = `${tw.date}::${tw.slot}`;
    if (!slotUserMap[key]) slotUserMap[key] = [];
    if (a.user_id && !slotUserMap[key].includes(a.user_id)) {
      slotUserMap[key].push(a.user_id);
    }
  }

  const maxOverlap = Math.max(...Object.values(slotUserMap).map((v) => v.length), 0);

  if (loading) {
    return (
      <View className="flex-1 bg-[#0F1117] items-center justify-center">
        <ActivityIndicator color="#667EEA" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0F1117]">
      {/* Header */}
      <LinearGradient
        colors={theme.gradient as [string, string]}
        className="pt-14 pb-6 px-4"
      >
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-white/80">← Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">When are you free?</Text>
        <Text className="text-white/70 text-sm mt-1">
          Tap the slots you're available. Others' selections show as overlays.
        </Text>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* Time grid */}
        <TimeGrid
          dates={dates}
          timeSlots={TIME_SLOTS}
          selectedSlots={selectedSlots}
          onToggle={toggleSlot}
          slotUserMap={slotUserMap}
          maxOverlap={maxOverlap}
          currentUserId={user?.id ?? ''}
        />

        <Text className="text-white/30 text-xs text-center mt-4">
          Cells darken when more people are free. Brightest = best time.
        </Text>
      </ScrollView>

      {/* Save button */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-10 pt-4 bg-[#0F1117]">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || selectedSlots.length === 0}
          className={`rounded-2xl py-4 items-center ${selectedSlots.length > 0 ? 'bg-[#667EEA]' : 'bg-white/10'}`}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`font-bold text-lg ${selectedSlots.length > 0 ? 'text-white' : 'text-white/40'}`}>
              Save {selectedSlots.length > 0 ? `(${selectedSlots.length} slots)` : 'Availability'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
