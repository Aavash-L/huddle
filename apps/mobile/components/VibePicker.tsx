import { View, Text, TouchableOpacity } from 'react-native';
import type { VibeChipId } from '@huddle/shared';
import { VIBE_CHIPS } from '@huddle/shared';

interface VibePickerProps {
  selected: VibeChipId[];
  onToggle: (vibe: VibeChipId) => void;
  maxSelections?: number;
}

export default function VibePicker({
  selected,
  onToggle,
  maxSelections = VIBE_CHIPS.length,
}: VibePickerProps) {
  const handleToggle = (vibeId: VibeChipId) => {
    const isSelected = selected.includes(vibeId);
    if (!isSelected && selected.length >= maxSelections) return;
    onToggle(vibeId);
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {VIBE_CHIPS.map((chip) => {
        const isSelected = selected.includes(chip.id);

        return (
          <TouchableOpacity
            key={chip.id}
            onPress={() => handleToggle(chip.id)}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 100,
              borderWidth: 1.5,
              backgroundColor: isSelected ? '#667EEA' : 'rgba(255,255,255,0.06)',
              borderColor: isSelected ? '#667EEA' : 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={{ fontSize: 16 }}>{chip.emoji}</Text>
            <Text
              style={{
                color: isSelected ? 'white' : 'rgba(255,255,255,0.65)',
                fontSize: 14,
                fontWeight: isSelected ? '700' : '500',
              }}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
