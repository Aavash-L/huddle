import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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

export default function ProfileSetupScreen() {
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { updateProfile, session, user } = useAuth();

  const isEditing = !!(user?.name && !/^\d+$/.test(user.name));
  const isValid = name.trim().length >= 2;

  // Pre-populate when editing
  useEffect(() => {
    if (user?.name && !/^\d+$/.test(user.name)) {
      setName(user.name);
    }
    if (user?.avatar_url) {
      setAvatarUri(user.avatar_url);
      setAvatarUrl(user.avatar_url);
    }
  }, [user?.name, user?.avatar_url]);

  // Resize image to max 512x512 on web using canvas, then upload as JPEG
  const compressForWeb = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 512;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Compress failed')), 'image/jpeg', 0.85);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  const uploadBlob = async (blob: Blob, ext: string) => {
    setUploading(true);
    setErrorMsg(null);
    try {
      const userId = session?.user.id;
      if (!userId) throw new Error('Not authenticated');

      // Always upload as JPEG (compressed) on web
      const finalBlob = Platform.OS === 'web' && blob instanceof File
        ? await compressForWeb(blob as File)
        : blob;
      const finalExt = Platform.OS === 'web' ? 'jpg' : ext;

      const path = `${userId}.${finalExt}`;
      const arrayBuffer = await finalBlob.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: `image/${finalExt}`, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Could not upload photo. Try again.');
      setAvatarUri(user?.avatar_url ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handlePickAvatar = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file: File = e.target.files?.[0];
        if (!file) return;
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        setAvatarUri(URL.createObjectURL(file));
        await uploadBlob(file, ext);
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      await uploadBlob(blob, ext);
    }
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setErrorMsg(null);

    const { error } = await updateProfile({
      name: name.trim(),
      avatar_url: avatarUrl ?? undefined,
    });

    setSaving(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    if (!isEditing) trackProfileCreated();

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)');
    }
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

        <View className="flex-1 px-6 pt-16" style={{ maxWidth: 480, alignSelf: 'center', width: '100%' }}>
          <Animated.View entering={FadeInDown.springify()}>
            {isEditing && (
              <TouchableOpacity onPress={() => router.back()} className="mb-6">
                <Text className="text-white/60 text-base">← Back</Text>
              </TouchableOpacity>
            )}

            <Text className="text-4xl font-bold text-white mb-2">
              {isEditing ? 'Edit profile' : 'Set up your profile'}
            </Text>
            <Text className="text-white/60 text-base mb-10">
              {isEditing ? 'Update your name and photo' : 'So your friends know who\'s planning'}
            </Text>

            {/* Avatar picker */}
            <View className="items-center mb-8">
              <TouchableOpacity
                onPress={handlePickAvatar}
                className="w-24 h-24 rounded-full bg-white/10 items-center justify-center overflow-hidden border-2 border-white/20"
                activeOpacity={0.8}
                style={{ cursor: 'pointer' as any }}
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
              {avatarUri && !uploading && (
                <Text className="text-white/40 text-xs mt-2">Tap to change</Text>
              )}
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
                autoFocus={!isEditing}
                className="text-white text-xl font-medium"
                style={{ color: 'white', fontSize: 20 }}
                maxLength={30}
                autoCapitalize="words"
              />
            </View>

            {/* Error */}
            {errorMsg && (
              <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-400 text-sm">{errorMsg}</Text>
              </View>
            )}

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
                  {isEditing ? 'Save Changes' : "Let's go 🎉"}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
