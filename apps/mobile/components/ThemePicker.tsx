import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CrewTheme } from '@huddle/shared';
import { THEMES } from '@huddle/shared';

interface ThemePickerProps {
  selected: CrewTheme;
  onSelect: (theme: CrewTheme) => void;
}

const THEME_KEYS = Object.keys(THEMES) as CrewTheme[];

export default function ThemePicker({ selected, onSelect }: ThemePickerProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {THEME_KEYS.map((key) => {
        const theme = THEMES[key];
        const isSelected = selected === key;

        return (
          <TouchableOpacity
            key={key}
            onPress={() => onSelect(key)}
            activeOpacity={0.8}
            style={{
              width: '30%',
              aspectRatio: 1.3,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: isSelected ? 3 : 0,
              borderColor: 'white',
            }}
          >
            <LinearGradient
              colors={theme.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, padding: 10, justifyContent: 'flex-end' }}
            >
              <Text style={{ fontSize: 18 }}>{theme.emoji}</Text>
              <Text
                style={{
                  color: theme.textColor,
                  fontSize: 12,
                  fontWeight: '700',
                  marginTop: 2,
                }}
              >
                {theme.label}
              </Text>
              {isSelected && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: 'white',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#111' }}>✓</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
