import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { usePro } from '@/hooks/usePro';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import ReliabilityBadge from '@/components/ReliabilityBadge';

function StatCard({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { isPro, isTrialing, trialDaysLeft } = usePro();
  const { isDesktop } = useBreakpoint();

  if (!user) return null;

  const handleSignOut = () => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Sign out of Huddle?')) signOut();
    } else {
      signOut();
    }
  };

  const displayName = user.name && !/^\d+$/.test(user.name) ? user.name : null;
  const displayPhone = user.phone
    ? user.phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
    : user.phone;

  const headerPt = isDesktop ? 28 : 56;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={isDesktop ? styles.desktopContainer : undefined}>
          {/* Header gradient */}
          <LinearGradient
            colors={['#667EEA', '#764BA2']}
            style={[styles.header, { paddingTop: headerPt }]}
          >
            {/* Avatar — tap to edit */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/profile-setup')}
              style={styles.avatarWrap}
              activeOpacity={0.8}
            >
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={{ fontSize: 36 }}>{user.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Text style={{ fontSize: 10 }}>✏️</Text>
              </View>
            </TouchableOpacity>

            {displayName ? (
              <Text style={styles.userName}>{displayName}</Text>
            ) : (
              <TouchableOpacity onPress={() => router.push('/(auth)/profile-setup')} activeOpacity={0.8}>
                <Text style={styles.setName}>Set your name →</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.userPhone}>{displayPhone}</Text>

            {(isPro || isTrialing) && (
              <View style={styles.proBadge}>
                <Text style={{ fontSize: 14, marginRight: 6 }}>⭐</Text>
                <Text style={styles.proBadgeText}>
                  {isTrialing ? `Pro Trial — ${trialDaysLeft} days left` : 'Huddle Pro'}
                </Text>
              </View>
            )}
          </LinearGradient>

          <View style={styles.body}>
            {/* Reputation */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Text style={styles.sectionLabel}>Your Reputation</Text>
              <ReliabilityBadge
                score={user.reliability_score}
                streak={user.never_bail_streak}
                large
              />
            </Animated.View>

            {/* Stats row */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statsRow}>
              <StatCard label="Reliability Score" value={`${user.reliability_score}%`} emoji="🎯" />
              <StatCard label="Never-Bail Streak" value={`${user.never_bail_streak} 🔥`} emoji="⚡" />
            </Animated.View>

            {/* Pro upgrade */}
            {!isPro && !isTrialing && (
              <Animated.View entering={FadeInDown.delay(300).springify()} style={{ marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => router.push('/(app)/paywall')}
                  style={{ borderRadius: 16, overflow: 'hidden' }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#667EEA', '#764BA2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.proUpgrade}
                  >
                    <View>
                      <Text style={styles.proUpgradeTitle}>Upgrade to Pro</Text>
                      <Text style={styles.proUpgradeSub}>7-day free trial, cancel anytime</Text>
                    </View>
                    <Text style={{ fontSize: 24 }}>⭐</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Settings */}
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <Text style={styles.sectionLabel}>Settings</Text>

              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => router.push('/(auth)/profile-setup')}
                activeOpacity={0.8}
              >
                <Text style={styles.settingsRowLabel}>Edit Profile</Text>
                <Text style={styles.settingsRowArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsRow}
                onPress={handleSignOut}
                activeOpacity={0.8}
              >
                <Text style={[styles.settingsRowLabel, { color: '#F87171' }]}>Sign Out</Text>
                <Text style={styles.settingsRowArrow}>→</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F1117',
  },
  desktopContainer: {
    maxWidth: 760,
    alignSelf: 'center' as any,
    width: '100%',
  },
  header: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
    position: 'relative',
    cursor: 'pointer' as any,
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  setName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '500',
  },
  userPhone: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginTop: 3,
  },
  proBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  proBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  proUpgrade: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proUpgradeTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  proUpgradeSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  settingsRow: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    cursor: 'pointer' as any,
  },
  settingsRowLabel: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
  },
  settingsRowArrow: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 16,
  },
});
