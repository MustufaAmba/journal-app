import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { BookCover } from './BookCover';
import { InlineSpinner } from './InlineSpinner';
import { useDialog } from './DialogProvider';
import { persistImage, forgetImage } from '@/lib/images';
import { withAlpha } from '@/lib/color';
import { haptics } from '@/lib/haptics';

/**
 * Lets the reader photograph a cover for a book no database has heard of.
 *
 * Open Library is wide but not complete — a secondhand paperback, a
 * self-published novella, something a friend wrote. Those books deserve to
 * look like books on the shelf rather than a typeset cloth binding, so this
 * offers the camera and the photo library, and keeps whatever comes back.
 */
/**
 * The picking half of the cover flow, without any of its layout — so a book's
 * detail sheet can offer the same thing to a book added weeks ago.
 */
export function usePickCover(current: string | undefined, onChange: (uri: string | undefined) => void) {
  const { notify } = useDialog();
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);

  const accept = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    // Copy it out of the cache before it can be swept away.
    const kept = await persistImage(result.assets[0].uri);
    // Replacing a cover should not leave the old file behind.
    if (current && current !== kept) forgetImage(current);
    onChange(kept);
    haptics.success();
  };

  const fromLibrary = async () => {
    if (busy) return;
    setBusy('library');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        void notify('Photos are locked', 'Bookie needs permission to open your photo library.');
        return;
      }
      await accept(
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          // Books are close to 2:3, so the crop box matches the shelf.
          aspect: [2, 3],
          quality: 0.8,
        }),
      );
    } catch {
      void notify('That photo would not open', 'Try picking it again.');
    } finally {
      setBusy(null);
    }
  };

  const fromCamera = async () => {
    if (busy) return;
    setBusy('camera');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        void notify('Camera is locked', 'Bookie needs permission to use the camera.');
        return;
      }
      await accept(
        await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [2, 3], quality: 0.8 }),
      );
    } catch {
      void notify('The camera would not open', 'Try again in a moment.');
    } finally {
      setBusy(null);
    }
  };

  return { busy, fromCamera, fromLibrary };
}

export function CoverPicker({
  title,
  author,
  coverUrl,
  onChange,
  width = 128,
}: {
  title: string;
  author?: string;
  coverUrl?: string;
  onChange: (uri: string | undefined) => void;
  width?: number;
}) {
  const theme = useTheme();
  const { confirm } = useDialog();
  const { busy, fromCamera, fromLibrary } = usePickCover(coverUrl, onChange);

  const remove = async () => {
    const gone = await confirm({
      title: 'Remove this cover?',
      message: 'The book will go back to its cloth binding.',
      confirmLabel: 'Remove',
      cancelLabel: 'Keep it',
      destructive: true,
    });
    if (!gone) return;
    forgetImage(coverUrl);
    onChange(undefined);
  };

  return (
    <View style={styles.wrap}>
      <View>
        <BookCover
          book={{ id: 'cover-preview', title: title || 'Untitled', authors: author ? [author] : [], coverUrl }}
          width={width}
        />

        {busy ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.busy,
              { backgroundColor: withAlpha(theme.colors.canvas, 0.72), borderRadius: 6 },
            ]}
          >
            <InlineSpinner />
          </View>
        ) : null}

        {coverUrl && !busy ? (
          <Pressable
            onPress={() => void remove()}
            scaleTo={0.85}
            accessibilityLabel="Remove cover photo"
            style={[styles.remove, { backgroundColor: withAlpha(theme.colors.canvas, 0.92) }]}
          >
            <Ionicons name="close" size={14} color={theme.colors.ink} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.actions, { marginTop: theme.space.md }]}>
        <CoverButton icon="camera-outline" label="Photograph it" onPress={fromCamera} busy={busy === 'camera'} />
        <CoverButton icon="images-outline" label="Choose a photo" onPress={fromLibrary} busy={busy === 'library'} />
      </View>

      <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.sm, maxWidth: 260 }}>
        {coverUrl
          ? 'Kept on this phone, so it survives a cleared cache.'
          : 'No cover to fetch for a book added by hand — photograph the real one, or leave it as cloth.'}
      </Text>
    </View>
  );
}

function CoverButton({
  icon,
  label,
  onPress,
  busy,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      haptic="select"
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.button,
        {
          backgroundColor: withAlpha(theme.colors.accent, 0.1),
          borderColor: withAlpha(theme.colors.accent, 0.22),
          borderRadius: theme.radius.pill,
          opacity: busy ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={14} color={theme.colors.accent} />
      <Text variant="caption" tone="accent" style={{ marginLeft: 5, fontFamily: 'Karla_700Bold' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
  },
  busy: { alignItems: 'center', justifyContent: 'center' },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
