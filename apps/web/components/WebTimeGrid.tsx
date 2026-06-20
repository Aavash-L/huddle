'use client';

import { useState, useCallback } from 'react';
import { createTokenClient } from '@/lib/supabase';

interface WebTimeGridProps {
  planId: string;
  responseToken: string;
  dates: string[];
  timeSlots: string[];
  initialSelectedSlots: { date: string; slot: string }[];
  slotOverlapCounts: Record<string, number>;
  planToken: string;
  themGradientFrom: string;
  themeGradientTo: string;
}

const SLOT_LABELS: Record<string, string> = {
  morning: '☀️ Morning',
  afternoon: '🌤 Afternoon',
  evening: '🌆 Evening',
};

const DAY_ABBREV = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function WebAvailabilityGrid({
  planId,
  responseToken,
  dates,
  timeSlots,
  initialSelectedSlots,
  slotOverlapCounts,
  planToken,
  themGradientFrom,
  themeGradientTo,
}: WebTimeGridProps) {
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; slot: string }[]>(initialSelectedSlots);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelected = (date: string, slot: string) =>
    selectedSlots.some((s) => s.date === date && s.slot === slot);

  const toggleSlot = useCallback((date: string, slot: string) => {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.date === date && s.slot === slot);
      if (exists) {
        return prev.filter((s) => !(s.date === date && s.slot === slot));
      }
      return [...prev, { date, slot }];
    });
    setSaved(false);
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      const client = createTokenClient(responseToken);

      // Delete existing availability for this token
      await client
        .from('availability')
        .delete()
        .eq('plan_id', planId)
        .eq('response_token', responseToken);

      // Insert new selections
      if (selectedSlots.length > 0) {
        const rows = selectedSlots.map((slot) => ({
          plan_id: planId,
          response_token: responseToken,
          user_id: null,
          time_window: { date: slot.date, slot: slot.slot },
          available: true,
        }));

        const { error: insertError } = await client.from('availability').insert(rows);
        if (insertError) throw new Error(insertError.message);
      }

      setSaved(true);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const maxOverlap = Math.max(...Object.values(slotOverlapCounts), 0);

  const getCellStyle = (date: string, slot: string): React.CSSProperties => {
    const selected = isSelected(date, slot);
    const key = `${date}::${slot}`;
    const overlapCount = slotOverlapCounts[key] ?? 0;
    const ratio = maxOverlap > 0 ? overlapCount / maxOverlap : 0;
    const isBest = ratio === 1 && overlapCount > 0;

    if (selected) {
      return {
        background: `linear-gradient(135deg, ${themGradientFrom}, ${themeGradientTo})`,
        color: 'white',
        borderColor: themGradientFrom,
      };
    }
    if (isBest) {
      return {
        backgroundColor: `${themGradientFrom}30`,
        borderColor: `${themGradientFrom}60`,
        color: 'white',
      };
    }
    if (ratio > 0.5) {
      return {
        backgroundColor: 'rgba(34,197,94,0.15)',
        borderColor: 'rgba(34,197,94,0.3)',
        color: '#86EFAC',
      };
    }
    if (overlapCount > 0) {
      return {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.5)',
      };
    }
    return {
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderColor: 'rgba(255,255,255,0.06)',
    };
  };

  return (
    <div>
      <div className="overflow-x-auto pb-4">
        <div style={{ minWidth: 'max-content' }}>
          {/* Header: dates */}
          <div className="flex mb-2">
            <div style={{ width: 90 }} />
            {dates.map((date) => {
              const d = new Date(date + 'T00:00:00');
              return (
                <div key={date} style={{ width: 52, marginRight: 6, textAlign: 'center' }}>
                  <p className="text-white/40 text-xs font-semibold">{DAY_ABBREV[d.getDay()]}</p>
                  <p className="text-white text-sm font-bold">{d.getDate()}</p>
                </div>
              );
            })}
          </div>

          {/* Rows: time slots */}
          {timeSlots.map((slot) => (
            <div key={slot} className="flex items-center mb-2">
              {/* Slot label */}
              <div style={{ width: 90 }}>
                <p className="text-white/50 text-xs font-semibold">{SLOT_LABELS[slot] ?? slot}</p>
              </div>

              {/* Cells */}
              {dates.map((date) => {
                const selected = isSelected(date, slot);
                const key = `${date}::${slot}`;
                const overlapCount = slotOverlapCounts[key] ?? 0;

                return (
                  <button
                    key={`${date}-${slot}`}
                    onClick={() => toggleSlot(date, slot)}
                    style={{
                      width: 46,
                      height: 40,
                      marginRight: 6,
                      borderRadius: 10,
                      border: '1.5px solid',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontSize: 12,
                      fontWeight: '700',
                      ...getCellStyle(date, slot),
                    }}
                    aria-label={`${date} ${slot} ${selected ? 'selected' : ''}`}
                  >
                    {selected ? '✓' : overlapCount > 0 ? overlapCount : ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="flex gap-4 flex-wrap mb-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: `linear-gradient(135deg, ${themGradientFrom}, ${themeGradientTo})` }} />
          <span className="text-white/40 text-xs">You're free</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500/30" />
          <span className="text-white/40 text-xs">Popular time</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white/40 text-xs">Numbers = others available</span>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || selectedSlots.length === 0}
        className="w-full py-4 rounded-2xl font-bold text-white text-base transition-opacity"
        style={{
          background:
            selectedSlots.length > 0
              ? `linear-gradient(135deg, ${themGradientFrom}, ${themeGradientTo})`
              : 'rgba(255,255,255,0.1)',
          opacity: saving ? 0.7 : 1,
          cursor: saving || selectedSlots.length === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? (
          'Saving...'
        ) : saved ? (
          '✓ Availability Saved!'
        ) : selectedSlots.length > 0 ? (
          `Save Availability (${selectedSlots.length} slots)`
        ) : (
          'Select times above'
        )}
      </button>

      {error && (
        <p className="text-red-400 text-sm text-center mt-3">{error}</p>
      )}
    </div>
  );
}
