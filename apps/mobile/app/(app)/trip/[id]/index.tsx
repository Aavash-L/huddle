import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import type { Trip, ItineraryItem } from '@huddle/shared';
import { trackTripItineraryGenerated } from '@/lib/posthog';

interface TripData extends Trip {
  plan: {
    id: string;
    title: string;
    creator_id: string;
  };
  itinerary: ItineraryItem[];
  payments: any[];
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchTrip = useCallback(async () => {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        plan:plans(id, title, creator_id),
        itinerary:itinerary_items(*, payload),
        payments:trip_payments(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching trip:', error);
      setLoading(false);
      return;
    }

    setTrip(data as unknown as TripData);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const handleGenerateItinerary = async () => {
    if (!trip || generating) return;
    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-trip-planner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          trip_id: id,
          destination: trip.destination,
          start_date: trip.start_date,
          end_date: trip.end_date,
          budget_per_person: trip.budget_per_person,
          group_size: 4,
          vibe: trip.vibe,
          musts: trip.musts,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Generation failed');

      const totalItems = result.days?.reduce((acc: number, d: any) => acc + (d.items?.length ?? 0), 0) ?? 0;
      trackTripItineraryGenerated({
        trip_id: id ?? '',
        item_count: totalItems,
        days: result.total_days ?? 0,
      });

      await fetchTrip();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to generate itinerary');
    } finally {
      setGenerating(false);
    }
  };

  // Group itinerary by day
  const itineraryByDay = trip?.itinerary.reduce((acc: Record<number, ItineraryItem[]>, item) => {
    const day = item.day;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {}) ?? {};

  const durationDays = trip
    ? Math.ceil(
        (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0;

  // Countdown
  const daysUntil = trip
    ? Math.ceil((new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <View className="flex-1 bg-[#0F1117] items-center justify-center">
        <ActivityIndicator color="#667EEA" size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View className="flex-1 bg-[#0F1117] items-center justify-center px-6">
        <Text className="text-white text-xl font-bold">Trip not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-[#667EEA]">← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0F1117]">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <LinearGradient
          colors={['#0F2027', '#203A43', '#2C5364']}
          className="pt-14 pb-8 px-4"
        >
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-white/80">← Back</Text>
          </TouchableOpacity>

          <Text className="text-white text-3xl font-bold">✈️ {trip.destination}</Text>
          <Text className="text-white/60 text-sm mt-1">
            {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' → '}
            {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}{durationDays} days
          </Text>

          {/* Countdown */}
          {daysUntil !== null && daysUntil > 0 && (
            <View className="mt-4 bg-white/10 rounded-2xl px-4 py-3 self-start">
              <Text className="text-white font-bold text-xl">{daysUntil} days to go 🎉</Text>
            </View>
          )}
        </LinearGradient>

        {/* Quick stats */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="flex-row gap-3 px-4 mt-4 mb-4">
          <View className="flex-1 bg-white/5 rounded-2xl p-4 items-center">
            <Text className="text-white/50 text-xs mb-1">Budget/person</Text>
            <Text className="text-white font-bold text-lg">
              ${trip.budget_per_person.toFixed(0)}
            </Text>
          </View>
          <View className="flex-1 bg-white/5 rounded-2xl p-4 items-center">
            <Text className="text-white/50 text-xs mb-1">Itinerary</Text>
            <Text className="text-white font-bold text-lg">
              {trip.itinerary.length} items
            </Text>
          </View>
          <View className="flex-1 bg-white/5 rounded-2xl p-4 items-center">
            <Text className="text-white/50 text-xs mb-1">Duration</Text>
            <Text className="text-white font-bold text-lg">{durationDays}d</Text>
          </View>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="flex-row gap-3 px-4 mb-6">
          <TouchableOpacity
            onPress={() => router.push(`/(app)/trip/${id}/itinerary`)}
            className="flex-1 bg-white/5 rounded-2xl py-4 items-center"
          >
            <Text className="text-xl mb-1">📋</Text>
            <Text className="text-white text-xs font-medium">Itinerary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(app)/trip/${id}/split`)}
            className="flex-1 bg-white/5 rounded-2xl py-4 items-center"
          >
            <Text className="text-xl mb-1">💸</Text>
            <Text className="text-white text-xs font-medium">Cost Split</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Generate/view itinerary */}
        {trip.itinerary.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(300).springify()} className="px-4">
            <View className="bg-white/5 rounded-2xl p-6 items-center">
              <Text className="text-4xl mb-4">🤖</Text>
              <Text className="text-white font-bold text-xl mb-2 text-center">
                No itinerary yet
              </Text>
              <Text className="text-white/50 text-sm text-center mb-6">
                Let Claude plan your {durationDays}-day trip to {trip.destination}.
                Detailed day-by-day, with specific places and times.
              </Text>
              <TouchableOpacity
                onPress={handleGenerateItinerary}
                disabled={generating}
                className="bg-[#667EEA] rounded-2xl px-6 py-3 items-center"
              >
                {generating ? (
                  <View className="flex-row gap-2 items-center">
                    <ActivityIndicator color="white" size="small" />
                    <Text className="text-white font-bold">Planning your trip...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-bold">✨ Generate Itinerary with AI</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          /* Day-by-day preview */
          <Animated.View entering={FadeInDown.delay(300).springify()} className="px-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                Your Itinerary
              </Text>
              <TouchableOpacity onPress={() => router.push(`/(app)/trip/${id}/itinerary`)}>
                <Text className="text-[#667EEA] text-sm">See all →</Text>
              </TouchableOpacity>
            </View>

            {Object.entries(itineraryByDay).slice(0, 3).map(([day, items]) => {
              const dayDate = new Date(trip.start_date);
              dayDate.setDate(dayDate.getDate() + parseInt(day) - 1);
              const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <View key={day} className="bg-white/5 rounded-2xl p-4 mb-3">
                  <Text className="text-white font-bold mb-3">
                    Day {day} · {dayLabel}
                  </Text>
                  {items.slice(0, 3).map((item, i) => {
                    const payload = item.payload as any;
                    return (
                      <View key={i} className="flex-row gap-3 mb-2">
                        <Text className="text-white/40 text-sm w-12">{payload.time ?? ''}</Text>
                        <View className="flex-1">
                          <Text className="text-white text-sm font-medium">{payload.title}</Text>
                          <Text className="text-white/40 text-xs">${payload.estimated_cost}/person</Text>
                        </View>
                      </View>
                    );
                  })}
                  {items.length > 3 && (
                    <Text className="text-white/30 text-xs mt-1">+{items.length - 3} more</Text>
                  )}
                </View>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
