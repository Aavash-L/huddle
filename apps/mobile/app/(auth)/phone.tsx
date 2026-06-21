import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { track } from '@/lib/posthog';

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { sendOTP } = useAuth();

  const digits = phone.replace(/\D/g, '');
  const isValid = digits.length === 10;

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  };

  const handleContinue = async () => {
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg('');
    track('phone_entered', { length: digits.length });

    const { error } = await sendOTP(digits);
    setLoading(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    router.push({
      pathname: '/(auth)/verify',
      params: { phone: digits },
    });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0F2027', '#203A43', '#2C5364']}
        className="flex-1"
      >
        <StatusBar style="light" />

        <View className="flex-1 px-6 pt-16">
          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} className="mb-8">
            <Text className="text-white/70 text-base">← Back</Text>
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.springify()}>
            <Text className="text-4xl font-bold text-white mb-3">
              What's your number?
            </Text>
            <Text className="text-white/60 text-base mb-10">
              We'll text you a code to verify. No spam, ever.
            </Text>

            {/* Phone input */}
            <View className="bg-white/10 rounded-2xl px-5 py-4 mb-3 flex-row items-center">
              <Text className="text-white/60 text-xl mr-2">🇺🇸 +1</Text>
              <TextInput
                value={formatPhoneDisplay(phone)}
                onChangeText={handlePhoneChange}
                placeholder="(555) 000-0000"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="phone-pad"
                autoFocus
                className="flex-1 text-white text-xl font-medium"
                style={{ color: 'white', fontSize: 20 }}
                maxLength={14} // formatted length
              />
            </View>

            <Text className="text-white/40 text-sm mb-10">
              US numbers only for now. International coming soon.
            </Text>

            {errorMsg ? (
              <View className="bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-300 text-sm">{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleContinue}
              disabled={!isValid || loading}
              className={`rounded-2xl py-4 items-center ${isValid ? 'bg-white' : 'bg-white/20'}`}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={isValid ? '#0F2027' : 'white'} />
              ) : (
                <Text className={`text-lg font-bold ${isValid ? 'text-[#0F2027]' : 'text-white/40'}`}>
                  Send Code
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
