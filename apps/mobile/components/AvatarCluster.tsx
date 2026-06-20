import { View, Text, Image } from 'react-native';
import type { UserPublic } from '@huddle/shared';

interface AvatarClusterProps {
  inUsers: UserPublic[];
  waveringUsers?: UserPublic[];
  outUsers?: UserPublic[];
  size?: 'small' | 'medium' | 'large';
  maxVisible?: number;
}

type CommitmentRing = 'in' | 'wavering' | 'out' | 'pending';

const RING_COLORS: Record<CommitmentRing, string> = {
  in: '#22C55E',
  wavering: '#EAB308',
  out: '#EF4444',
  pending: '#6B7280',
};

function Avatar({
  user,
  ring,
  sizeNum,
  index,
  total,
}: {
  user: UserPublic;
  ring: CommitmentRing;
  sizeNum: number;
  index: number;
  total: number;
}) {
  const overlap = sizeNum * 0.35;
  const marginLeft = index > 0 ? -overlap : 0;

  return (
    <View
      style={{
        width: sizeNum,
        height: sizeNum,
        borderRadius: sizeNum / 2,
        borderWidth: 2.5,
        borderColor: RING_COLORS[ring],
        marginLeft,
        overflow: 'hidden',
        backgroundColor: '#1f2937',
        zIndex: total - index,
      }}
    >
      {user.avatar_url ? (
        <Image
          source={{ uri: user.avatar_url }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#374151',
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: sizeNum * 0.36,
              fontWeight: '700',
            }}
          >
            {(user.name ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function AvatarCluster({
  inUsers,
  waveringUsers = [],
  outUsers = [],
  size = 'medium',
  maxVisible = 8,
}: AvatarClusterProps) {
  const sizeMap = { small: 28, medium: 36, large: 44 };
  const sizeNum = sizeMap[size];

  // Combine all users with their ring color, priority: in → wavering → out
  const allUsers: { user: UserPublic; ring: CommitmentRing }[] = [
    ...inUsers.map((u) => ({ user: u, ring: 'in' as CommitmentRing })),
    ...waveringUsers.map((u) => ({ user: u, ring: 'wavering' as CommitmentRing })),
    ...outUsers.map((u) => ({ user: u, ring: 'out' as CommitmentRing })),
  ];

  const visible = allUsers.slice(0, maxVisible);
  const overflow = allUsers.length - maxVisible;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map(({ user, ring }, index) => (
        <Avatar
          key={user.id}
          user={user}
          ring={ring}
          sizeNum={sizeNum}
          index={index}
          total={visible.length}
        />
      ))}

      {overflow > 0 && (
        <View
          style={{
            width: sizeNum,
            height: sizeNum,
            borderRadius: sizeNum / 2,
            backgroundColor: '#374151',
            borderWidth: 2,
            borderColor: '#6B7280',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: -(sizeNum * 0.35),
          }}
        >
          <Text
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: sizeNum * 0.3,
              fontWeight: '700',
            }}
          >
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}
