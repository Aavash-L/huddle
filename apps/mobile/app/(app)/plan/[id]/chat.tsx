import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/hooks/useAuth';
import { THEMES } from '@huddle/shared';
import type { MessageWithUser, CrewTheme } from '@huddle/shared';

function MessageBubble({ message, isOwn }: { message: MessageWithUser; isOwn: boolean }) {
  const time = new Date(message.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const user = (message as any).user;

  return (
    <View className={`flex-row gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isOwn && (
        <View className="w-8 h-8 rounded-full bg-white/20 overflow-hidden items-center justify-center flex-shrink-0 mt-auto">
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} className="w-full h-full" />
          ) : (
            <Text className="text-white text-xs font-bold">
              {(user?.name ?? '?').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
      )}

      <View className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <Text className="text-white/40 text-xs mb-1 ml-1">
            {user?.name ?? 'Someone'}
          </Text>
        )}
        <View
          className={`px-4 py-2.5 rounded-2xl ${
            isOwn ? 'bg-[#667EEA] rounded-tr-sm' : 'bg-white/10 rounded-tl-sm'
          }`}
        >
          <Text className="text-white text-base leading-5">{message.body}</Text>
        </View>
        <Text className="text-white/30 text-xs mt-1 mx-1">{time}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { plan, messages, loading, sendMessage } = usePlan(id ?? '');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const theme = plan ? (THEMES[plan.theme as CrewTheme] ?? THEMES.ocean) : THEMES.ocean;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setText('');
    setSending(true);
    await sendMessage(trimmed);
    setSending(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0F1117]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <LinearGradient
        colors={theme.gradient as [string, string]}
        className="pt-14 pb-4 px-4"
      >
        <TouchableOpacity onPress={() => router.back()} className="mb-2">
          <Text className="text-white/80">← Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">
          {plan?.title ?? 'Chat'} 💬
        </Text>
      </LinearGradient>

      {/* Messages */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#667EEA" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.user_id === user?.id}
            />
          )}
          ListEmptyComponent={() => (
            <View className="items-center py-16">
              <Text className="text-4xl mb-3">💬</Text>
              <Text className="text-white/50 text-base text-center">
                No messages yet. Start the conversation!
              </Text>
            </View>
          )}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />
      )}

      {/* Input bar */}
      <View className="flex-row gap-3 px-4 py-3 bg-[#1a1f2e] border-t border-white/5">
        <View className="flex-1 bg-white/10 rounded-2xl px-4 py-3 min-h-[44px] max-h-[100px] justify-center">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Send a message..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline
            style={{ color: 'white', fontSize: 16, maxHeight: 80 }}
            returnKeyType="default"
            blurOnSubmit={false}
            maxLength={500}
            onKeyPress={(e: any) => {
              if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault?.();
                handleSend();
              }
            }}
          />
        </View>
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || sending}
          className={`w-11 h-11 rounded-full items-center justify-center self-end ${
            text.trim() ? 'bg-[#667EEA]' : 'bg-white/10'
          }`}
        >
          {sending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold">↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
