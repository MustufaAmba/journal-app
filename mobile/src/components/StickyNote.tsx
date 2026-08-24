import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { PaperTexture } from './PaperTexture';
import { MarkdownText } from './MarkdownText';
import { friendlyDate } from '@/lib/date';
import { withAlpha, mix, isLight } from '@/lib/color';
import type { Note } from '@/types';

/** Six sticky-note colours, warmed toward the current theme. */
export function noteColors(theme: ReturnType<typeof useTheme>) {
  const base = ['#F6D98A', '#F3B6A0', '#C9DDA9', '#A9C9DD', '#E2BCD8', '#EFE2C0'];
  // Blend toward the paper colour so notes never look like they were pasted in
  // from a different app.
  return base.map((hex) => mix(hex, theme.colors.paper, theme.isDark ? 0.45 : 0.12));
}

export function StickyNote({
  note,
  onPress,
  onLongPress,
  width,
  style,
  tiltSeed = 0,
}: {
  note: Note;
  onPress?: () => void;
  onLongPress?: () => void;
  width?: number;
  style?: StyleProp<ViewStyle>;
  tiltSeed?: number;
}) {
  const theme = useTheme();
  const paper = noteColors(theme)[note.colorIndex % 6];
  const ink = isLight(paper) ? '#2E2418' : theme.colors.ink;
  const tilt = ((tiltSeed % 5) - 2) * 0.7;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={note.title || note.body.slice(0, 40) || 'Empty note'}
      style={[{ width }, style]}
    >
      <View
        style={[
          styles.note,
          {
            backgroundColor: paper,
            borderRadius: theme.radius.sm,
            padding: theme.space.md,
            transform: [{ rotate: `${tilt}deg` }],
          },
          theme.elevation(2),
        ]}
      >
        <PaperTexture opacity={0.06} />

        {/* the corner curl that makes it read as a sticky note */}
        <LinearGradient
          colors={[withAlpha('#000', 0.14), 'transparent']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0.72, y: 0.72 }}
          style={styles.curl}
          pointerEvents="none"
        />

        {note.pinned ? (
          <View style={styles.pin}>
            <Ionicons name="pin" size={13} color={withAlpha(theme.colors.danger, 0.85)} />
          </View>
        ) : null}

        {note.title ? (
          <Text
            variant="bodyStrong"
            color={ink}
            numberOfLines={2}
            style={{ fontFamily: 'Lora_600SemiBold', marginBottom: 4, paddingRight: note.pinned ? 16 : 0 }}
          >
            {note.title}
          </Text>
        ) : null}

        <MarkdownText
          value={note.body || '…'}
          color={withAlpha(ink, 0.86)}
          numberOfLines={7}
          variant="small"
        />

        <Text variant="caption" color={withAlpha(ink, 0.5)} style={{ marginTop: theme.space.sm }}>
          {friendlyDate(note.updatedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: { overflow: 'hidden', minHeight: 110 },
  curl: { position: 'absolute', right: 0, bottom: 0, width: 26, height: 26 },
  pin: { position: 'absolute', top: 8, right: 8 },
});
