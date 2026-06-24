import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { THEMES, PLAN_TYPES } from '@huddle/shared';
import type { CrewTheme } from '@huddle/shared';

// ─── localStorage helpers (web only) ─────────────────────────
const storageKey = (token: string) => `huddle_join_${token}`;

function getToken(shareToken: string): string | null {
  try { return localStorage.getItem(storageKey(shareToken)); } catch { return null; }
}
function saveToken(shareToken: string, rt: string) {
  try { localStorage.setItem(storageKey(shareToken), rt); } catch {}
}

// ─── Types ────────────────────────────────────────────────────
type PlanPreview = {
  plan_id: string;
  title: string;
  type: string | null;
  theme: string | null;
  status: string;
  locked_datetime: string | null;
  location: string | null;
  creator_name: string | null;
  in_count: number;
  invitee_count: number;
};

type RSVPStatus = 'in' | 'wavering' | 'out';

const RSVP_OPTIONS = [
  { status: 'in' as const, emoji: '✅', label: "I'm In!", color: '#22C55E' },
  { status: 'wavering' as const, emoji: '🤔', label: 'Maybe', color: '#EAB308' },
  { status: 'out' as const, emoji: '❌', label: "Can't Make It", color: '#EF4444' },
];

const CONFIRM = {
  in: { emoji: '✅', text: "You're in!", sub: 'The organizer will be notified.' },
  wavering: { emoji: '🤔', text: 'You might make it', sub: "We'll keep you posted." },
  out: { emoji: '❌', text: "Can't make this one", sub: 'Thanks for letting them know.' },
};

// ─── Page ─────────────────────────────────────────────────────
export default function JoinPage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [plan, setPlan] = useState<PlanPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [selected, setSelected] = useState<RSVPStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    supabase
      .rpc('resolve_share_token', { p_share_token: token })
      .then(({ data, error }) => {
        if (error || !data?.length) {
          setLoadError('This invite link is invalid or has expired.');
        } else {
          const r = data[0];
          setPlan({
            plan_id: r.plan_id,
            title: r.title,
            type: r.type,
            theme: r.theme,
            status: r.status,
            locked_datetime: r.locked_datetime,
            location: r.location,
            creator_name: r.creator_name,
            in_count: Number(r.in_count),
            invitee_count: Number(r.invitee_count),
          });
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleRSVP = async (status: RSVPStatus) => {
    if (!token) return;
    setSelected(status);
    setSaving(true);
    setRsvpError(null);
    try {
      let rt = getToken(token);
      if (!rt) {
        const { data, error: joinErr } = await supabase.rpc('join_plan_via_share', {
          p_share_token: token,
          p_display_name: displayName.trim() || 'Guest',
        });
        if (joinErr) throw joinErr;
        if (!data?.length) throw new Error('Failed to join.');
        rt = data[0].response_token as string;
        saveToken(token, rt);
      }
      const { error: rErr } = await supabase.rpc('set_web_rsvp', {
        p_response_token: rt,
        p_rsvp: status,
      });
      if (rErr) throw rErr;
      setSaved(true);
    } catch (err: any) {
      setRsvpError(err?.message ?? 'Something went wrong. Try again.');
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E14', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#667EEA" size="large" />
      </View>
    );
  }

  // ── Error ──
  if (loadError || !plan) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E14', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🔗</Text>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
          Link not found
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 22 }}>
          {loadError ?? 'This invite link is invalid or has expired.'}
        </Text>
      </View>
    );
  }

  const theme = THEMES[(plan.theme as CrewTheme)] ?? THEMES.ocean;
  const planType = PLAN_TYPES[(plan.type as keyof typeof PLAN_TYPES)] ?? PLAN_TYPES.hangout;
  const lockedDate = plan.locked_datetime
    ? new Date(plan.locked_datetime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;
  const lockedTime = plan.locked_datetime
    ? new Date(plan.locked_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0A0E14' }}>
      {/* Themed header */}
      <LinearGradient
        colors={theme.gradient as [string, string]}
        style={{ paddingTop: 64, paddingBottom: 28, paddingHorizontal: 24 }}
      >
        <Text style={{ color: `${theme.textColor}99`, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
          {plan.creator_name ?? 'Someone'} is planning a huddle 🎉
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
          <Text style={{ fontSize: 40, marginRight: 12 }}>{planType.emoji}</Text>
          <Text style={{ color: theme.textColor, fontSize: 26, fontWeight: '800', flex: 1, lineHeight: 32 }}>
            {plan.title}
          </Text>
        </View>
        {plan.status === 'locked' && lockedDate && (
          <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <Text style={{ color: theme.textColor, fontWeight: '700', fontSize: 15 }}>📅 {lockedDate}</Text>
            <Text style={{ color: `${theme.textColor}CC`, fontSize: 13, marginTop: 3 }}>
              🕗 {lockedTime}{plan.location ? ` · 📍 ${plan.location}` : ''}
            </Text>
          </View>
        )}
        <View style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 14 }}>
          <Text style={{ color: `${theme.textColor}CC`, fontWeight: '600', fontSize: 14 }}>
            {plan.in_count} of {plan.invitee_count} people are in 🔥
          </Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={{ padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center' as any }}>
        {saved && selected ? (
          // ── Confirmation ──
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>{CONFIRM[selected].emoji}</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
              {CONFIRM[selected].text}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 }}>
              {CONFIRM[selected].sub}
            </Text>
          </View>
        ) : (
          <>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Are you in?</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
              {plan.status === 'locked'
                ? "The plan is locked. Let them know if you're coming!"
                : 'Let the group know so they can plan ahead.'}
            </Text>

            {/* Name input — web only */}
            {Platform.OS === 'web' && (
              <View style={{ marginBottom: 16 }}>
                {/* @ts-ignore — raw input for web */}
                <input
                  type="text"
                  value={displayName}
                  onChange={(e: any) => setDisplayName(e.target.value)}
                  placeholder="Your name (optional)"
                  maxLength={40}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12, boxSizing: 'border-box',
                    backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 14, outline: 'none',
                  } as any}
                />
              </View>
            )}

            {/* RSVP buttons */}
            {RSVP_OPTIONS.map((opt) => {
              const isSel = selected === opt.status;
              return (
                <TouchableOpacity
                  key={opt.status}
                  onPress={() => !saving && handleRSVP(opt.status)}
                  disabled={saving}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    padding: 18, borderRadius: 16, borderWidth: 2, marginBottom: 12,
                    backgroundColor: isSel ? `${opt.color}20` : 'rgba(255,255,255,0.05)',
                    borderColor: isSel ? opt.color : 'rgba(255,255,255,0.08)',
                    opacity: saving && !isSel ? 0.5 : 1,
                    cursor: 'pointer' as any,
                  }}
                >
                  <Text style={{ fontSize: 28, marginRight: 16 }}>{opt.emoji}</Text>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 }}>{opt.label}</Text>
                  {isSel && saving && <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />}
                  {isSel && !saving && <Text style={{ color: '#fff', fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              );
            })}

            {rsvpError && (
              <Text style={{ color: '#EF4444', fontSize: 13, textAlign: 'center', marginTop: 4 }}>{rsvpError}</Text>
            )}
          </>
        )}

        {/* App download nudge */}
        <View style={{
          marginTop: 40, padding: 20, borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 6 }}>
            🤝 Never miss a Huddle
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
            Download the app to get notified when plans change.
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== 'web') return;
              const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
              const url = isIOS
                ? (process.env.EXPO_PUBLIC_IOS_URL ?? 'https://apps.apple.com')
                : (process.env.EXPO_PUBLIC_ANDROID_URL ?? 'https://play.google.com');
              window.open(url, '_blank');
            }}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#667EEA', borderRadius: 12, padding: 14,
              alignItems: 'center', cursor: 'pointer' as any,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>📱 Get the App (Free)</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}
