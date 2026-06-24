'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface RSVPSectionProps {
  planId: string;
  responseToken: string;
  planStatus: string;
  existingAvailability: any[];
}

type CommitmentStatus = 'in' | 'wavering' | 'out';

export default function RSVPSection({
  planId,
  responseToken,
  planStatus,
  existingAvailability,
}: RSVPSectionProps) {
  const [selected, setSelected] = useState<CommitmentStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRSVP = async (status: CommitmentStatus) => {
    setSelected(status);
    setSaving(true);
    setError(null);

    try {
      const { error: rsvpError } = await supabase.rpc('set_web_rsvp', {
        p_response_token: responseToken,
        p_rsvp: status,
      });
      if (rsvpError) throw rsvpError;

      setSaved(true);
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    const labels = {
      in: { emoji: '✅', text: "You're in!", sub: 'The organizer will be notified.' },
      wavering: { emoji: '🤔', text: "You might make it", sub: "We'll keep you posted." },
      out: { emoji: '❌', text: "Can't make this one", sub: "Thanks for letting them know." },
    };
    const label = selected ? labels[selected] : null;

    return (
      <div className="text-center">
        <div className="text-6xl mb-4">{label?.emoji}</div>
        <h2 className="text-white text-2xl font-bold mb-2">{label?.text}</h2>
        <p className="text-white/60">{label?.sub}</p>
      </div>
    );
  }

  const options = [
    { status: 'in' as const, emoji: '✅', label: "I'm In!", description: 'Count me in', color: '#22C55E' },
    { status: 'wavering' as const, emoji: '🤔', label: 'Maybe', description: "I'll try to make it", color: '#EAB308' },
    { status: 'out' as const, emoji: '❌', label: "Can't Make It", description: 'Not this time', color: '#EF4444' },
  ];

  return (
    <div>
      <h2 className="text-white text-xl font-bold mb-2">Are you in?</h2>
      <p className="text-white/50 text-sm mb-6">
        {planStatus === 'locked'
          ? 'The plan is locked in. Let them know if you\'re coming!'
          : 'Let the group know so they can plan ahead.'}
      </p>

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
                backgroundColor: isSelected
                  ? `${option.color}20`
                  : 'rgba(255,255,255,0.05)',
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
