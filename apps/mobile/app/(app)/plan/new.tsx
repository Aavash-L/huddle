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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePro, useHuddleLimit } from '@/hooks/usePro';
import ThemePicker from '@/components/ThemePicker';
import { useContacts } from '@/hooks/useContacts';
import { trackPlanCreated, trackPaywallShown } from '@/lib/posthog';
import type { PlanType, CrewTheme } from '@huddle/shared';
import { PLAN_TYPES, THEMES, APP_CONFIG } from '@huddle/shared';

const STEPS = ['type', 'details', 'theme', 'people'] as const;
type Step = (typeof STEPS)[number];

const PLAN_TYPE_OPTIONS = Object.entries(PLAN_TYPES).map(([id, meta]) => ({
  id: id as PlanType,
  ...meta,
}));

export default function NewPlanScreen() {
  const [step, setStep] = useState<Step>('type');
  const [planType, setPlanType] = useState<PlanType>('hangout');
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState<CrewTheme>('ocean');
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { user, session } = useAuth();
  const { isPro } = usePro();
  const { canCreate, usedThisMonth, limit } = useHuddleLimit();
  const { contacts, requestAndLoad, searchContacts } = useContacts();
  const [contactSearch, setContactSearch] = useState('');

  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex + 1) / STEPS.length;

  const goNext = () => {
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) {
      if (nextStep === 'people') requestAndLoad();
      setStep(nextStep);
    }
  };

  const goBack = () => {
    const prevStep = STEPS[stepIndex - 1];
    if (prevStep) setStep(prevStep);
    else router.back();
  };

  const handleAddPhone = () => {
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length < 10) return;
    const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`;
    if (!selectedPhones.includes(e164)) {
      setSelectedPhones((prev) => [...prev, e164]);
    }
    setNewPhone('');
  };

  const handleCreate = async () => {
    if (!session || saving) return;

    // Check free tier limit
    if (!isPro && !canCreate) {
      trackPaywallShown({ trigger: 'huddle_limit' });
      router.push({
        pathname: '/(app)/paywall',
        params: { trigger: 'huddle_limit' },
      });
      return;
    }

    setSaving(true);

    setErrorMsg('');
    try {
      // Create plan
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .insert({
          title: title.trim() || `${PLAN_TYPES[planType].label} with friends`,
          type: planType,
          theme,
          creator_id: session.user.id,
          quorum_n: Math.max(2, Math.ceil(selectedPhones.length * 0.5)),
          status: 'gathering',
        })
        .select()
        .single();

      if (planError || !plan) throw new Error(planError?.message ?? 'Failed to create plan');

      // Add invitees
      if (selectedPhones.length > 0) {
        const inviteeRows = selectedPhones.map((phone) => {
          const match = contacts.find((c) => c.phone === phone);
          return {
            plan_id: plan.id,
            phone,
            user_id: match?.huddleUser?.id ?? null,
          };
        });

        await supabase.from('plan_invitees').insert(inviteeRows);
      }

      // Creator auto-commits as "in"
      await supabase.from('commitments').insert({
        plan_id: plan.id,
        user_id: session.user.id,
        status: 'in',
      });

      trackPlanCreated({
        plan_id: plan.id,
        plan_type: planType,
        theme,
        invitee_count: selectedPhones.length,
        has_crew: false,
      });

      router.replace(`/(app)/plan/${plan.id}`);
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  const filteredContacts = contactSearch ? searchContacts(contactSearch) : contacts.slice(0, 30);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0F1117]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient colors={['#0F2027', '#1a2a3a']} className="pt-14 pb-4 px-4">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={goBack}>
            <Text className="text-white/70 text-base">
              {stepIndex === 0 ? '✕' : '← Back'}
            </Text>
          </TouchableOpacity>
          <Text className="text-white font-bold text-base">New Huddle</Text>
          <Text className="text-white/40 text-sm">{stepIndex + 1}/{STEPS.length}</Text>
        </View>

        {/* Progress bar */}
        <View className="h-1 bg-white/10 rounded-full">
          <View
            className="h-full bg-[#667EEA] rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">

        {/* STEP 1: Type */}
        {step === 'type' && (
          <Animated.View entering={FadeInRight.springify()}>
            <Text className="text-white text-3xl font-bold mb-2">What kind of huddle?</Text>
            <Text className="text-white/50 mb-8">Pick the vibe, we'll take care of the rest.</Text>

            <View className="flex-row flex-wrap gap-3">
              {PLAN_TYPE_OPTIONS.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => setPlanType(type.id)}
                  className={`flex-row items-center gap-2 px-5 py-3 rounded-2xl border ${
                    planType === type.id
                      ? 'bg-[#667EEA] border-[#667EEA]'
                      : 'bg-white/5 border-white/10'
                  }`}
                  activeOpacity={0.8}
                >
                  <Text className="text-xl">{type.emoji}</Text>
                  <Text className={`font-semibold ${planType === type.id ? 'text-white' : 'text-white/70'}`}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={goNext}
              className="mt-10 bg-[#667EEA] rounded-2xl py-4 items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-lg">Continue →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 2: Details */}
        {step === 'details' && (
          <Animated.View entering={FadeInRight.springify()}>
            <Text className="text-white text-3xl font-bold mb-2">Name it</Text>
            <Text className="text-white/50 mb-8">What are you calling this one?</Text>

            <View className="bg-white/10 rounded-2xl px-5 py-4 mb-4">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={`e.g. "Friday night vibes" or leave blank`}
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="text-white text-xl"
                style={{ color: 'white', fontSize: 18 }}
                maxLength={APP_CONFIG.max_plan_title_length}
                autoFocus
                autoCapitalize="sentences"
              />
            </View>

            <Text className="text-white/30 text-sm mb-10">
              Leaving it blank? We'll name it "{PLAN_TYPES[planType].label} with friends"
            </Text>

            <TouchableOpacity
              onPress={goNext}
              className="bg-[#667EEA] rounded-2xl py-4 items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-lg">Continue →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 3: Theme */}
        {step === 'theme' && (
          <Animated.View entering={FadeInRight.springify()}>
            <Text className="text-white text-3xl font-bold mb-2">Pick a theme</Text>
            <Text className="text-white/50 mb-8">Every huddle has a vibe.</Text>

            <ThemePicker selected={theme} onSelect={setTheme} />

            <TouchableOpacity
              onPress={goNext}
              className="mt-10 bg-[#667EEA] rounded-2xl py-4 items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-lg">Continue →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 4: People */}
        {step === 'people' && (
          <Animated.View entering={FadeInRight.springify()}>
            <Text className="text-white text-3xl font-bold mb-2">Who's in?</Text>
            <Text className="text-white/50 mb-6">
              Invite by contact or type a number
            </Text>

            {/* Selected phones */}
            {selectedPhones.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {selectedPhones.map((phone) => {
                  const match = contacts.find((c) => c.phone === phone);
                  const label = match?.contact.name ?? phone;
                  return (
                    <TouchableOpacity
                      key={phone}
                      onPress={() => setSelectedPhones((prev) => prev.filter((p) => p !== phone))}
                      className="flex-row items-center gap-1 bg-[#667EEA]/20 rounded-full px-3 py-1.5"
                    >
                      <Text className="text-[#667EEA] text-sm font-medium">{label}</Text>
                      <Text className="text-[#667EEA]/60 text-xs">✕</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Manual phone entry */}
            <View className="flex-row gap-2 mb-4">
              <View className="flex-1 bg-white/10 rounded-xl px-4 py-3">
                <TextInput
                  value={newPhone}
                  onChangeText={setNewPhone}
                  placeholder="Add phone number"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="phone-pad"
                  style={{ color: 'white', fontSize: 16 }}
                />
              </View>
              <TouchableOpacity
                onPress={handleAddPhone}
                className="bg-[#667EEA] rounded-xl px-4 items-center justify-center"
              >
                <Text className="text-white font-bold">Add</Text>
              </TouchableOpacity>
            </View>

            {/* Contacts search */}
            <View className="bg-white/10 rounded-xl px-4 py-3 mb-4">
              <TextInput
                value={contactSearch}
                onChangeText={setContactSearch}
                placeholder="Search contacts..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ color: 'white', fontSize: 16 }}
              />
            </View>

            {/* Contact list */}
            {filteredContacts.map((c) => {
              const isSelected = selectedPhones.includes(c.phone);
              return (
                <TouchableOpacity
                  key={c.phone}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedPhones((prev) => prev.filter((p) => p !== c.phone));
                    } else {
                      setSelectedPhones((prev) => [...prev, c.phone]);
                    }
                  }}
                  className={`flex-row items-center gap-3 px-4 py-3 rounded-xl mb-2 ${
                    isSelected ? 'bg-[#667EEA]/20' : 'bg-white/5'
                  }`}
                >
                  <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
                    <Text className="text-white font-bold">
                      {(c.contact.name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">{c.contact.name ?? c.phone}</Text>
                    {c.isOnHuddle && (
                      <Text className="text-[#667EEA] text-xs">On Huddle ✓</Text>
                    )}
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected ? 'bg-[#667EEA] border-[#667EEA]' : 'border-white/30'
                  }`}>
                    {isSelected && <Text className="text-white text-xs font-bold">✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View className="pb-4" />
          </Animated.View>
        )}
      </ScrollView>

      {/* Create button (only on last step) */}
      {step === 'people' && (
        <View className="px-4 pb-10 pt-3 bg-[#0F1117]">
          {errorMsg ? (
            <View className="bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 mb-3">
              <Text className="text-red-300 text-sm">{errorMsg}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={saving}
            className="bg-[#667EEA] rounded-2xl py-4 items-center"
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                Create Huddle {selectedPhones.length > 0 ? `(${selectedPhones.length} invited)` : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
