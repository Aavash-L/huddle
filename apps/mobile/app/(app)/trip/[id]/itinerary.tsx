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
import { useAuth } from '@/hooks/useAuth';
import TripItineraryItem from '@/components/TripItineraryItem';
import type { ItineraryItem, ItineraryItemPayload } from '@huddle/shared';

export default function ItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);

  const fetchItinerary = useCallback(async () => {
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('*, plan:plans(title, creator_id)')
      .eq('id', id)
      .single();

    if (tripError || !tripData) {
      setLoading(false);
      return;
    }

    setTrip(tripData);

    const { data: itemsData } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', id)
      .order('day', { ascending: true });

    setItems((itemsData ?? []) as ItineraryItem[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchItinerary();
  }, [fetchItinerary]);

  const handleStatusChange = async (
    itemId: string,
    status: 'proposed' | 'confirmed' | 'vetoed'
  ) => {
    await supabase
      .from('itinerary_items')
      .update({ status })
      .eq('id', itemId);

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status } : item))
    );
  };

  const itemsByDay = items.reduce((acc: Record<number, ItineraryItem[]>, item) => {
    if (!acc[item.day]) acc[item.day] = [];
    acc[item.day].push(item);
    return acc;
  }, {});

  const uniqueDays = Object.keys(itemsByDay).map(Number).sort((a, b) => a - b);

  const getDayDate = (dayNum: number): string => {
    if (!trip?.start_date) return `Day ${dayNum}`;
    const d = new Date(trip.start_date);
    d.setDate(d.getDate() + dayNum - 1);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0F1117] items-center justify-center">
        <ActivityIndicator color="#667EEA" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0F1117]">
      {/* Header */}
      <LinearGradient
        colors={['#0F2027', '#203A43']}
        className="pt-14 pb-4 px-4"
      >
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <Text className="text-white/80">← Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">
          📋 {trip?.destination ?? 'Trip'} Itinerary
        </Text>
      </LinearGradient>

      {/* Day tabs */}
      {uniqueDays.length > 0 && (
        <View className="border-b border-white/5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          >
            {uniqueDays.map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => setActiveDay(day)}
                className={`px-4 py-2 rounded-full ${activeDay === day ? 'bg-[#667EEA]' : 'bg-white/10'}`}
              >
                <Text className={`text-sm font-medium ${activeDay === day ? 'text-white' : 'text-white/60'}`}>
                  Day {day}
                </Text>
                <Text className={`text-xs ${activeDay === day ? 'text-white/70' : 'text-white/30'}`}>
                  {getDayDate(day)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {uniqueDays.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-4xl mb-4">📋</Text>
            <Text className="text-white/50 text-center">
              No itinerary yet. Generate one from the trip page.
            </Text>
          </View>
        ) : (
          <View>
            {/* Active day header */}
            <Text className="text-white font-bold text-xl mb-4">
              Day {activeDay} · {getDayDate(activeDay)}
            </Text>

            {(itemsByDay[activeDay] ?? []).map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 60).springify()}
                className="mb-3"
              >
                <TripItineraryItem
                  item={item}
                  onConfirm={() => handleStatusChange(item.id, 'confirmed')}
                  onVeto={() => {
                    Alert.alert(
                      'Veto this?',
                      `Remove "${(item.payload as ItineraryItemPayload).title}" from the plan?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Veto', style: 'destructive', onPress: () => handleStatusChange(item.id, 'vetoed') },
                      ]
                    );
                  }}
                  onRestore={() => handleStatusChange(item.id, 'proposed')}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
