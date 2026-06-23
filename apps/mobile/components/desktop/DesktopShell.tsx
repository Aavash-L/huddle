import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { label: 'Home', emoji: '🏠', href: '/' },
  { label: 'Profile', emoji: '👤', href: '/profile' },
];

function NavItem({
  label, emoji, href, active,
}: {
  label: string; emoji: string; href: string; active: boolean;
}) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(href as any)}
      style={[styles.navItem, active && styles.navItemActive]}
      activeOpacity={0.75}
    >
      {active && <View style={styles.activeBar} />}
      <Text style={{ fontSize: 17, marginRight: 10 }}>{emoji}</Text>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DesktopShell() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'n') {
        e.preventDefault();
        router.push('/(app)/plan/new' as any);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [router]);

  return (
    <View style={styles.shell}>
      <View style={styles.sidebar}>
        {/* Wordmark */}
        <View style={styles.wordmark}>
          <Text style={{ fontSize: 20, marginRight: 8 }}>🤝</Text>
          <Text style={styles.wordmarkText}>Huddle</Text>
        </View>

        {/* New Huddle */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/plan/new' as any)}
          style={styles.newBtn}
          activeOpacity={0.85}
        >
          <Text style={styles.newBtnText}>＋  New Huddle</Text>
        </TouchableOpacity>

        {/* Nav */}
        <View style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)
              }
            />
          ))}
        </View>

        {/* User at bottom */}
        <TouchableOpacity
          onPress={() => router.push('/profile' as any)}
          style={styles.userRow}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={{ width: 32, height: 32, borderRadius: 16 }}
              />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{initials}</Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name ?? 'You'}</Text>
            <Text style={styles.userSub}>View profile</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <View style={styles.main}>
        <Slot />
      </View>
    </View>
  );
}

const SIDEBAR_W = 240;
const GOLD = '#F5B544';
const SIDEBAR_BG = '#0D1117';
const BORDER = 'rgba(255,255,255,0.07)';

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0F1117',
  },
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: SIDEBAR_BG,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 10,
    flexDirection: 'column',
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  wordmarkText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  newBtn: {
    backgroundColor: '#667EEA',
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 2,
    marginBottom: 18,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  newBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  nav: {
    flex: 1,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    position: 'relative',
    cursor: 'pointer' as any,
  },
  navItemActive: {
    backgroundColor: 'rgba(245,181,68,0.09)',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    backgroundColor: GOLD,
    borderRadius: 2,
  },
  navLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 10,
    gap: 10,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667EEA',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  userSub: {
    color: 'rgba(255,255,255,0.32)',
    fontSize: 11,
  },
  main: {
    flex: 1,
    overflow: 'hidden' as any,
  },
});
