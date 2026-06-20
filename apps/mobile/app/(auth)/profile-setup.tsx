import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { trackProfileCreated } from '@/lib/posthog';
import { useContacts } from '@/hooks/useContacts';

export default function ProfileSetupScreen() {
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { updateProfile, session } = useAuth();
  const { requestAndLoad } = useContacts();

  const isValid = name.trim().length >= 2;

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setAvatarUri(asset.uri);
    setUploading(true);

    try {
      const userId = session?.user.id;
      if (!userId) throw new Error('Not authenticated');

      // Upload to Supabase Storage
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `avatars/${userId}.${ext}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Could not upload photo. Try again.');
      setAvatarUri(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);

    const { error } = await updateProfile({
      name: name.trim(),
      avatar_url: avatarUrl ?? undefined,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    trackProfileCreated();

    // Optionally import contacts before going to main app
    router.replace('/(app)');
  };

  const handleSkipAvatar = async () => {
    if (!isValid || saving) return;
    setSaving(true);

    const { error } = await updateProfile({ name: name.trim() });
    setSaving(false);

    if (!error) {
      trackProfileCreated();
      router.replace('/(app)');
    }
  };

  const handleImportContacts = async () => {
    await requestAndLoad();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0F2027', '#203A43', '#2C5364']}
        className="flex-1"
      >
        <StatusBar style="light" />

        <View className="flex-1 px-6 pt-16">
          <Animated.View entering={FadeInDown.springify()}>
            <Text className="text-4xl font-bold text-white mb-2">
              Set up your profile
            </Text>
            <Text className="text-white/60 text-base mb-10">
              So your friends know who's planning
            </Text>

            {/* Avatar picker */}
            <View className="items-center mb-8">
              <TouchableOpacity
                onPress={handlePickAvatar}
                className="w-24 h-24 rounded-full bg-white/10 items-center justify-center overflow-hidden border-2 border-white/20"
                activeOpacity={0.8}
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : avatarUri ? (
                  <Image source={{ uri: avatarUri }} className="w-full h-full" />
                ) : (
                  <View className="items-center gap-1">
                    <Text className="text-3xl">📸</Text>
                    <Text className="text-white/50 text-xs">Add photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Name input */}
            <View className="bg-white/10 rounded-2xl px-5 py-4 mb-4">
              <Text className="text-white/50 text-xs font-medium mb-1 uppercase tracking-wider">
                Your Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="First name (or nickname)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
                className="text-white text-xl font-medium"
                style={{ color: 'white', fontSize: 20 }}
                maxLength={30}
                autoCapitalize="words"
              />
            </View>

            <Text className="text-white/40 text-sm mb-8">
              This is how you'll appear to friends on Huddle.
            </Text>

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={!isValid || saving || uploading}
              className={`rounded-2xl py-4 items-center mb-4 ${isValid && !uploading ? 'bg-white' : 'bg-white/20'}`}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={isValid ? '#0F2027' : 'white'} />
              ) : (
                <Text className={`text-lg font-bold ${isValid && !uploading ? 'text-[#0F2027]' : 'text-white/40'}`}>
                  Let's go 🎉
                </Text>
              )}
            </TouchableOpacity>

            {/* Import contacts nudge */}
            <TouchableOpacity
              onPress={handleImportContacts}
              className="items-center py-3"
            >
              <Text className="text-white/50 text-sm">
                📱 Import contacts to find friends faster
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
