import { useState, useEffect, useCallback } from 'react';
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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { TripPayment } from '@huddle/shared';

interface PaymentWithUser extends TripPayment {
  user: { id: string; name: string; avatar_url: string | null };
}

export default function SplitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentWithUser[]>([]);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingPayment, setAddingPayment] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const fetchData = useCallback(async () => {
    const [tripRes, paymentsRes] = await Promise.all([
      supabase.from('trips').select('*, plan:plans(title)').eq('id', id).single(),
      supabase
        .from('trip_payments')
        .select('*, user:users(id, name, avatar_url)')
        .eq('trip_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (tripRes.data) setTrip(tripRes.data);
    setPayments((paymentsRes.data ?? []) as unknown as PaymentWithUser[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPaid = payments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0);
  const totalOwed = payments.filter((p) => !p.paid).reduce((sum, p) => sum + p.amount, 0);

  const handleMarkPaid = async (paymentId: string) => {
    await supabase.from('trip_payments').update({ paid: true }).eq('id', paymentId);
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, paid: true } : p))
    );
  };

  const handleAddPayment = async () => {
    if (!user || !newAmount) return;

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid dollar amount.');
      return;
    }

    const { data, error } = await supabase
      .from('trip_payments')
      .insert({
        trip_id: id,
        user_id: user.id,
        amount,
        description: newDescription.trim() || null,
        paid: false,
      })
      .select('*, user:users(id, name, avatar_url)')
      .single();

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setPayments((prev) => [data as unknown as PaymentWithUser, ...prev]);
    setNewAmount('');
    setNewDescription('');
    setAddingPayment(false);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0F1117] items-center justify-center">
        <ActivityIndicator color="#667EEA" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0F1117]">
      <LinearGradient
        colors={['#0F2027', '#203A43']}
        className="pt-14 pb-6 px-4"
      >
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <Text className="text-white/80">← Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">💸 Cost Split</Text>
        <Text className="text-white/60 text-sm mt-1">
          {trip?.destination ?? 'Trip'} expenses
        </Text>
      </LinearGradient>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Summary */}
        <Animated.View entering={FadeInDown.springify()} className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-green-500/10 rounded-2xl p-4">
            <Text className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-1">Paid</Text>
            <Text className="text-white text-2xl font-bold">${totalPaid.toFixed(2)}</Text>
          </View>
          <View className="flex-1 bg-red-500/10 rounded-2xl p-4">
            <Text className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-1">Owed</Text>
            <Text className="text-white text-2xl font-bold">${totalOwed.toFixed(2)}</Text>
          </View>
        </Animated.View>

        {/* Add payment form */}
        {addingPayment ? (
          <Animated.View entering={FadeInDown.springify()} className="bg-white/5 rounded-2xl p-4 mb-6">
            <Text className="text-white font-semibold mb-3">Add Expense</Text>
            <View className="bg-white/10 rounded-xl px-4 py-3 mb-3 flex-row items-center">
              <Text className="text-white/50 mr-2">$</Text>
              <TextInput
                value={newAmount}
                onChangeText={setNewAmount}
                placeholder="Amount"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="decimal-pad"
                style={{ color: 'white', fontSize: 18, flex: 1, fontWeight: 'bold' }}
                autoFocus
              />
            </View>
            <View className="bg-white/10 rounded-xl px-4 py-3 mb-4">
              <TextInput
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="What's this for? (optional)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ color: 'white', fontSize: 16 }}
              />
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setAddingPayment(false)}
                className="flex-1 bg-white/10 rounded-xl py-3 items-center"
              >
                <Text className="text-white/60 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddPayment}
                className="flex-1 bg-[#667EEA] rounded-xl py-3 items-center"
              >
                <Text className="text-white font-bold">Add</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}

        {/* Payments list */}
        <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
          Expenses
        </Text>

        {payments.length === 0 ? (
          <View className="items-center py-10">
            <Text className="text-3xl mb-3">💸</Text>
            <Text className="text-white/40 text-center">No expenses tracked yet</Text>
          </View>
        ) : (
          payments.map((payment, index) => (
            <Animated.View
              key={payment.id}
              entering={FadeInDown.delay(index * 50).springify()}
              className="bg-white/5 rounded-2xl p-4 mb-3 flex-row items-center gap-3"
            >
              <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
                <Text className="text-white text-sm font-bold">
                  {payment.user?.name?.charAt(0) ?? '?'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">
                  {payment.user?.name ?? 'Someone'}
                </Text>
                {payment.description && (
                  <Text className="text-white/50 text-sm">{payment.description}</Text>
                )}
              </View>
              <View className="items-end gap-1">
                <Text className="text-white font-bold">${payment.amount.toFixed(2)}</Text>
                {payment.paid ? (
                  <Text className="text-green-400 text-xs">✓ Paid</Text>
                ) : payment.user_id === user?.id ? (
                  <TouchableOpacity onPress={() => handleMarkPaid(payment.id)}>
                    <Text className="text-[#667EEA] text-xs">Mark paid</Text>
                  </TouchableOpacity>
                ) : (
                  <Text className="text-red-400 text-xs">Unpaid</Text>
                )}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Add expense FAB */}
      {!addingPayment && (
        <View className="absolute bottom-8 right-5">
          <TouchableOpacity
            onPress={() => setAddingPayment(true)}
            className="bg-[#667EEA] rounded-full w-14 h-14 items-center justify-center shadow-lg"
          >
            <Text className="text-white text-2xl">+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
