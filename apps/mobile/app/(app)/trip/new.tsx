import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePro } from '@/hooks/usePro';
import { trackTripCreated } from '@/lib/posthog';

const STEPS = ['dates', 'destination', 'budget', 'vibe'] as const;
type Step = (typeof STEPS)[number];

export default function NewTripScreen() {
  const { plan_id } = useLocalSearchParams<{ plan_id?: string }>();
  const { session } = useAuth();
  const { requireFeature } = usePro();

  const [step, setStep] = useState<Step>('dates');
  const [startDate, setStartDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 33 * 24 * 60 * 60 * 1000));
  const [destination, setDestination] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [vibe, setVibe] = useState('');
  const [musts, setMusts] = useState('');
  const [saving, setSaving] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(Platform.OS === 'ios');
  const [showEndPicker, setShowEndPicker] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  const goNext = async () => {
    // Check pro before proceeding past first step
    if (stepIndex === 0) {
      const hasAccess = await requireFeature('trip_mode', 'trip_creation');
      if (!hasAccess) return;
    }
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) setStep(nextStep);
  };

  const goBack = () => {
    const prevStep = STEPS[stepIndex - 1];
    if (prevStep) setStep(prevStep);
    else router.back();
  };

  const handleCreate = async () => {
    if (!session || saving) return;

    const budget = parseFloat(budgetStr) || 0;
    if (!destination.trim()) {
      Alert.alert('Add a destination', 'Where are you going?');
      return;
    }

    setSaving(true);

    try {
      let planId = plan_id;

      // Create a plan if not linked to an existing one
      if (!planId) {
        const { data: plan, error: planError } = await supabase
          .from('plans')
          .insert({
            title: `Trip to ${destination.trim()}`,
            type: 'trip',
            theme: 'midnight',
            creator_id: session.user.id,
            status: 'gathering',
            quorum_n: 2,
          })
          .select()
          .single();

        if (planError || !plan) throw new Error(planError?.message ?? 'Failed to create plan');
        planId = plan.id;
      }

      // Create trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          plan_id: planId,
          destination: destination.trim(),
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          budget_per_person: budget,
          vibe: vibe.trim() || null,
          musts: musts.trim() || null,
        })
        .select()
        .single();

      if (tripError || !trip) throw new Error(tripError?.message ?? 'Failed to create trip');

      const durationDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      trackTripCreated({
        trip_id: trip.id,
        destination: destination.trim(),
        duration_days: durationDays,
        budget_per_person: budget,
        group_size: 4, // TODO: actual count
      });

      router.replace(`/(app)/trip/${trip.id}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create trip');
    } finally {
      setSaving(false);
    }
  };

  const durationDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0F1117]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0F2027', '#203A43', '#2C5364']}
        className="pt-14 pb-4 px-4"
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={goBack}>
            <Text className="text-white/70 text-base">{stepIndex === 0 ? '✕' : '← Back'}</Text>
          </TouchableOpacity>
          <Text className="text-white font-bold">✈️ New Trip</Text>
          <Text className="text-white/40 text-sm">{stepIndex + 1}/{STEPS.length}</Text>
        </View>

        <View className="h-1 bg-white/10 rounded-full">
          <View
            className="h-full bg-[#667EEA] rounded-full"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">

        {/* STEP 1: Dates */}
        {step === 'dates' && (
          <Animated.View entering={FadeInRight.springify()}>
            <Text className="text-white text-3xl font-bold mb-2">When are you going?</Text>
            <Text className="text-white/50 mb-6">Pick your travel window</Text>

            <View className="bg-white/10 rounded-2xl p-4 mb-4">
              <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
                Departure
              </Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="inline"
                  minimumDate={new Date()}
                  onChange={(_, d) => d && setStartDate(d)}
                  themeVariant="dark"
                  style={{ height: 300 }}
                />
              ) : (
                <TouchableOpacity onPress={() => setShowStartPicker(true)}>
                  <Text className="text-white text-base">
                    📅 {startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="bg-white/10 rounded-2xl p-4 mb-6">
              <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
                Return
              </Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="inline"
                  minimumDate={startDate}
                  onChange={(_, d) => d && setEndDate(d)}
                  themeVariant="dark"
                  style={{ height: 300 }}
                />
              ) : (
                <TouchableOpacity onPress={() => setShowEndPicker(true)}>
                  <Text className="text-white text-base">
                    📅 {endDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {durationDays > 0 && (
              <Text className="text-white/50 text-center mb-6">
                {durationDays} {durationDays === 1 ? 'day' : 'days'} ✈️
              </Text>
            )}

            <TouchableOpacity
              onPress={goNext}
              className="bg-[#667EEA] rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">Continue →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 2: Destination */}
        {step === 'destination' && (
          <Animated.View entering={FadeInRight.springify()}>
            <Text className="text-white text-3xl font-bold mb-2">Where to?</Text>
            <Text className="text-white/50 mb-8">City, country, anywhere</Text>

            <View className="bg-white/10 rounded-2xl px-5 py-4 mb-8">
              <TextInput
                value={destination}
                onChangeText={setDestination}
                placeholder="Paris, Tokyo, Nashville..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ color: 'white', fontSize: 22 }}
                autoFocus
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              onPress={goNext}
              disabled={!destination.trim()}
              className={`rounded-2xl py-4 items-center ${destination.trim() ? 'bg-[#667EEA]' : 'bg-white/10'}`}
            >
              <Text className={`font-bold text-lg ${destination.trim() ? 'text-white' : 'text-white/40'}`}>
                Continue →
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 3: Budget */}
        {step === 'budget' && (
          <Animated.View entering={FadeInRight.springify()}>
            <Text className="text-white text-3xl font-bold mb-2">What's the budget?</Text>
            <Text className="text-white/50 mb-8">Per person, total for the trip</Text>

            <View className="bg-white/10 rounded-2xl px-5 py-4 mb-3 flex-row items-center">
              <Text className="text-white/50 text-2xl mr-2">$</Text>
              <TextInput
                value={budgetStr}
                onChangeText={setBudgetStr}
                placeholder="500"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
                style={{ color: 'white', fontSize: 28, flex: 1, fontWeight: 'bold' }}
                autoFocus
              />
            </View>
            <Text className="text-white/30 text-sm mb-8">per person</Text>

            <TouchableOpacity
              onPress={goNext}
              className="bg-[#667EEA] rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">Continue →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 4: Vibe & Musts */}
        {step === 'vibe' && (
          <Animated.View entering={FadeInRight.springify()}>
            <Text className="text-white text-3xl font-bold mb-2">What's the vibe?</Text>
            <Text className="text-white/50 mb-8">
              Help Claude plan the perfect itinerary for {destination || 'your trip'}
            </Text>

            <View className="bg-white/10 rounded-2xl px-4 py-3 mb-4">
              <TextInput
                value={vibe}
                onChangeText={setVibe}
                placeholder="relaxed beach vibes, adventure & hiking, foodie tour..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ color: 'white', fontSize: 16 }}
                multiline
                autoFocus
              />
            </View>

            <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
              Must-dos / must-sees
            </Text>
            <View className="bg-white/10 rounded-2xl px-4 py-3 mb-8">
              <TextInput
                value={musts}
                onChangeText={setMusts}
                placeholder="e.g. Eiffel Tower, authentic ramen, rooftop bars..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ color: 'white', fontSize: 16 }}
                multiline
              />
            </View>
          </Animated.View>
        )}

        <View className="pb-4" />
      </ScrollView>

      {/* Create button on last step */}
      {step === 'vibe' && (
        <View className="px-4 pb-10 pt-3 bg-[#0F1117]">
          <TouchableOpacity
            onPress={handleCreate}
            disabled={saving}
            className="bg-[#667EEA] rounded-2xl py-4 items-center"
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">✈️ Create Trip</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
