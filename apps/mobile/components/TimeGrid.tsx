import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface TimeGridProps {
  dates: string[];
  timeSlots: string[];
  selectedSlots: { date: string; slot: string }[];
  onToggle: (date: string, slot: string) => void;
  slotUserMap: Record<string, string[]>; // key = "date::slot", value = user IDs
  maxOverlap: number;
  currentUserId: string;
}

function GridCell({
  date,
  slot,
  isSelected,
  overlapCount,
  maxOverlap,
  isCurrentUser,
  onPress,
}: {
  date: string;
  slot: string;
  isSelected: boolean;
  overlapCount: number;
  maxOverlap: number;
  isCurrentUser: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 10, stiffness: 400 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 8 });
    }, 100);
    onPress();
  };

  // Overlap heat: 0 = no overlap, 1 = everyone is free
  const heatRatio = maxOverlap > 0 ? overlapCount / maxOverlap : 0;
  const isBestSlot = heatRatio === 1 && overlapCount > 0;

  // Background color based on who's free here
  const getBgColor = () => {
    if (isSelected) return '#667EEA';
    if (isBestSlot) return 'rgba(102,126,234,0.4)';
    if (heatRatio > 0.6) return 'rgba(34,197,94,0.25)';
    if (heatRatio > 0.3) return 'rgba(234,179,8,0.15)';
    if (overlapCount > 0) return 'rgba(255,255,255,0.1)';
    return 'rgba(255,255,255,0.04)';
  };

  const getBorderColor = () => {
    if (isSelected) return '#667EEA';
    if (isBestSlot) return 'rgba(102,126,234,0.6)';
    return 'rgba(255,255,255,0.08)';
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View
        style={[
          animatedStyle,
          {
            width: 70,
            height: 48,
            borderRadius: 10,
            backgroundColor: getBgColor(),
            borderWidth: 1.5,
            borderColor: getBorderColor(),
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          },
        ]}
      >
        {isSelected && (
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>✓</Text>
        )}
        {!isSelected && overlapCount > 0 && (
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' }}>
            {overlapCount}
          </Text>
        )}
        {isBestSlot && !isSelected && (
          <Text style={{ fontSize: 8, color: '#86EFAC', marginTop: 1, fontWeight: '700' }}>
            BEST
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const SLOT_LABELS: Record<string, string> = {
  morning: '☀️ AM',
  afternoon: '🌤 PM',
  evening: '🌆 Eve',
  late_night: '🌙 Late',
};

const DAY_ABBREV = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function TimeGrid({
  dates,
  timeSlots,
  selectedSlots,
  onToggle,
  slotUserMap,
  maxOverlap,
  currentUserId,
}: TimeGridProps) {
  const isSelected = (date: string, slot: string) =>
    selectedSlots.some((s) => s.date === date && s.slot === slot);

  const getOverlap = (date: string, slot: string): { count: number; hasCurrentUser: boolean } => {
    const key = `${date}::${slot}`;
    const users = slotUserMap[key] ?? [];
    return {
      count: users.length,
      hasCurrentUser: users.includes(currentUserId),
    };
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Header row: dates */}
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {/* Row label spacer */}
          <View style={{ width: 50 }} />
          {dates.map((date) => {
            const d = new Date(date + 'T00:00:00');
            const dayAbbrev = DAY_ABBREV[d.getDay()];
            const dayNum = d.getDate();
            return (
              <View key={date} style={{ width: 70, marginHorizontal: 3, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' }}>
                  {dayAbbrev}
                </Text>
                <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>
                  {dayNum}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Slot rows */}
        {timeSlots.map((slot) => (
          <View key={slot} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            {/* Slot label */}
            <View style={{ width: 50 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' }}>
                {SLOT_LABELS[slot] ?? slot}
              </Text>
            </View>

            {/* Cells */}
            {dates.map((date) => {
              const { count, hasCurrentUser } = getOverlap(date, slot);
              return (
                <View key={`${date}-${slot}`} style={{ marginHorizontal: 3 }}>
                  <GridCell
                    date={date}
                    slot={slot}
                    isSelected={isSelected(date, slot)}
                    overlapCount={count}
                    maxOverlap={maxOverlap}
                    isCurrentUser={hasCurrentUser}
                    onPress={() => onToggle(date, slot)}
                  />
                </View>
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, paddingLeft: 50, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#667EEA' }} />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>You're free</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'rgba(34,197,94,0.4)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Popular slot</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'rgba(102,126,234,0.4)', borderWidth: 1, borderColor: 'rgba(102,126,234,0.6)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Best slot</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
