import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { ItineraryItem, ItineraryItemPayload } from '@huddle/shared';

interface TripItineraryItemProps {
  item: ItineraryItem;
  onConfirm: () => void;
  onVeto: () => void;
  onRestore: () => void;
}

const TYPE_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  stay: { emoji: '🏨', color: '#6366F1', label: 'Stay' },
  activity: { emoji: '🎯', color: '#22C55E', label: 'Activity' },
  food: { emoji: '🍽️', color: '#F59E0B', label: 'Food' },
  transport: { emoji: '✈️', color: '#3B82F6', label: 'Transport' },
};

export default function TripItineraryItem({
  item,
  onConfirm,
  onVeto,
  onRestore,
}: TripItineraryItemProps) {
  const payload = item.payload as ItineraryItemPayload;
  const typeConfig = TYPE_CONFIG[payload.type] ?? TYPE_CONFIG.activity;
  const isVetoed = item.status === 'vetoed';
  const isConfirmed = item.status === 'confirmed';

  return (
    <Animated.View entering={FadeIn}>
      <View
        style={{
          backgroundColor: isVetoed ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.05)',
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: isConfirmed
            ? 'rgba(34,197,94,0.3)'
            : isVetoed
            ? 'rgba(239,68,68,0.2)'
            : 'rgba(255,255,255,0.08)',
          opacity: isVetoed ? 0.6 : 1,
        }}
      >
        {/* Top row: type chip + time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: `${typeConfig.color}20`,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 12 }}>{typeConfig.emoji}</Text>
              <Text style={{ color: typeConfig.color, fontSize: 11, fontWeight: '700' }}>
                {typeConfig.label.toUpperCase()}
              </Text>
            </View>

            {isConfirmed && (
              <View style={{ backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#86EFAC', fontSize: 11, fontWeight: '700' }}>✓ CONFIRMED</Text>
              </View>
            )}

            {isVetoed && (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#FCA5A5', fontSize: 11, fontWeight: '700' }}>✕ VETOED</Text>
              </View>
            )}
          </View>

          {payload.time && (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' }}>
              {payload.time}
            </Text>
          )}
        </View>

        {/* Title */}
        <Text style={{ color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 4 }}>
          {payload.title}
        </Text>

        {/* Description */}
        {payload.description && (
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
            {payload.description}
          </Text>
        )}

        {/* Cost */}
        {payload.estimated_cost > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <Text style={{ color: '#86EFAC', fontSize: 13, fontWeight: '600' }}>
              ~${payload.estimated_cost}/person
            </Text>
          </View>
        )}

        {/* Notes */}
        {payload.notes && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, marginBottom: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontStyle: 'italic' }}>
              💡 {payload.notes}
            </Text>
          </View>
        )}

        {/* Actions */}
        {!isVetoed ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!isConfirmed && (
              <TouchableOpacity
                onPress={onConfirm}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(34,197,94,0.15)',
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#86EFAC', fontWeight: '700', fontSize: 13 }}>✓ Confirm</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onVeto}
              style={{
                flex: 1,
                backgroundColor: 'rgba(239,68,68,0.1)',
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: 'center',
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FCA5A5', fontWeight: '700', fontSize: 13 }}>✕ Veto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={onRestore}
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 12,
              paddingVertical: 10,
              alignItems: 'center',
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 13 }}>
              ↩ Restore
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
