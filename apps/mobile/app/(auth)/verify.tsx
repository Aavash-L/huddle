import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { trackOTPVerified } from '@/lib/posthog';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRef = useRef<TextInput>(null);
  const { verifyOTP, sendOTP } = useAuth();

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const formattedPhone = phone
    ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`
    : '';

  const handleCodeChange = async (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);

    if (digits.length === CODE_LENGTH) {
      await handleVerify(digits);
    }
  };

  const handleVerify = async (codeToVerify: string) => {
    if (loading) return;
    setLoading(true);

    const { error, isNewUser } = await verifyOTP(phone ?? '', codeToVerify);
    setLoading(false);

    if (error) {
      Alert.alert('Invalid Code', 'That code didn\'t match. Try again or request a new one.');
      setCode('');
      inputRef.current?.focus();
      return;
    }

    trackOTPVerified({ is_new_user: isNewUser ?? false });

    if (isNewUser) {
      router.replace('/(auth)/profile-setup');
    } else {
      router.replace('/(app)');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    const { error } = await sendOTP(phone ?? '');
    if (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
      return;
    }

    setResendCooldown(30);
    setCode('');
    Alert.alert('Code Sent', 'A new verification code has been sent.');
  };

  // Render digit boxes
  const digits = code.split('');
  const boxes = Array.from({ length: CODE_LENGTH }, (_, i) => digits[i] ?? '');

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
          <TouchableOpacity onPress={() => router.back()} className="mb-8">
            <Text className="text-white/70 text-base">← Back</Text>
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.springify()}>
            <Text className="text-4xl font-bold text-white mb-3">
              Check your texts
            </Text>
            <Text className="text-white/60 text-base mb-10">
              We sent a 6-digit code to{'\n'}
              <Text className="text-white font-semibold">{formattedPhone}</Text>
            </Text>

            {/* Hidden actual input */}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              autoFocus
              caretHidden
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
            />

            {/* Visual digit boxes */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              className="flex-row gap-3 mb-10"
            >
              {boxes.map((digit, i) => (
                <View
                  key={i}
                  className={`flex-1 h-16 rounded-xl items-center justify-center border-2 ${
                    code.length === i
                      ? 'border-white bg-white/10'
                      : digit
                      ? 'border-white/60 bg-white/10'
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  {loading && i === code.length - 1 ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white text-2xl font-bold">{digit}</Text>
                  )}
                </View>
              ))}
            </TouchableOpacity>

            {/* Resend */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0}
              className="items-center"
            >
              <Text className={`text-base ${resendCooldown > 0 ? 'text-white/30' : 'text-white/70'}`}>
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Didn't get a code? Resend"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
