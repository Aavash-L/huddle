'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface JoinSectionProps {
  shareToken: string;
  planStatus: string;
}

type CommitmentStatus = 'in' | 'wavering' | 'out';

const STORAGE_KEY = (shareToken: string) => `huddle_join_${shareToken}`;

const options = [
  { status: 'in' as const, emoji: '✅', label: "I'm In!", description: 'Count me in', color: '#22C55E' },
  { status: 'wavering' as const, emoji: '🤔', label: 'Maybe', description: "I'll try to make it", color: '#EAB308' },
  { status: 'out' as const, emoji: '❌', label: "Can't Make It", description: 'Not this time', color: '#EF4444' },
];

const confirmLabels = {
  in: { emoji: '✅', text: "You're in!", sub: 'The organizer will be notified.' },
  wavering: { emoji: '🤔', text: 'You might make it', sub: "We'll keep you posted." },
  out: { emoji: '❌', text: "Can't make this one", sub: 'Thanks for letting them know.' },
};

export default function JoinSection({ shareToken, planStatus }: JoinSectionProps) {
  const [displayName, setDisplayName] = useState('');
  const [selected, setSelected] = useState<CommitmentStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRSVP = async (status: CommitmentStatus) => {
    setSelected(status);
    setSaving(true);
    setError(null);

    try {
      // Check if we already have a personal response_token for this share link
      let responseToken: string | null = null;
      try {
        responseToken = localStorage.getItem(STORAGE_KEY(shareToken));
      } catch {}

      if (!responseToken) {
        // First time: join plan to get a personal token
        const { data, error: joinError } = await supabase.rpc('join_plan_via_share', {
          p_share_token: shareToken,
          p_display_name: displayName.trim() || 'Guest',
        });
        if (joinError) throw joinError;
        if (!data || data.length === 0) throw new Error('Failed to join plan.');

        responseToken = data[0].response_token as string;
        try {
          localStorage.setItem(STORAGE_KEY(shareToken), responseToken);
        } catch {}
      }

      // Now set the RSVP
      const { error: rsvpError } = await supabase.rpc('set_web_rsvp', {
        p_response_token: responseToken,
        p_rsvp: status,
      });
      if (rsvpError) throw rsvpError;

      setSaved(true);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  if (saved && selected) {
    const label = confirmLabels[selected];
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">{label.emoji}</div>
        <h2 className="text-white text-2xl font-bold mb-2">{label.text}</h2>
        <p className="text-white/60">{label.sub}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-white text-xl font-bold mb-1">Are you in?</h2>
      <p className="text-white/50 text-sm mb-5">
        {planStatus === 'locked'
          ? "The plan is locked. Let them know if you're coming!"
          : 'Let the group know so they can plan ahead.'}
      </p>

      {/* Optional name */}
      <div className="mb-5">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={40}
          className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:ring-2 focus:ring-white/20"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const isSelected = selected === option.status;
          return (
            <button
              key={option.status}
              onClick={() => !saving && handleRSVP(option.status)}
              disabled={saving}
              className="w-full text-left flex items-center gap-4 px-5 py-4 rounded-2xl transition-all active:scale-95"
              style={{
                backgroundColor: isSelected ? `${option.color}20` : 'rgba(255,255,255,0.05)',
                borderWidth: 2,
                borderColor: isSelected ? option.color : 'rgba(255,255,255,0.08)',
                opacity: saving && !isSelected ? 0.5 : 1,
              }}
            >
              <span className="text-3xl">{option.emoji}</span>
              <div className="flex-1">
                <p className="text-white font-bold text-base">{option.label}</p>
                <p className="text-white/50 text-sm">{option.description}</p>
              </div>
              {isSelected && saving && (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {isSelected && !saving && (
                <span className="text-white text-lg">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center mt-4">{error}</p>
      )}
    </div>
  );
}
