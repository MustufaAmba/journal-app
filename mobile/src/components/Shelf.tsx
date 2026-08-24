import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { PaperTexture } from './PaperTexture';
import { withAlpha, shade } from '@/lib/color';

/**
 * A single wooden shelf: the plank, the shadow the books cast onto it, and a
 * warm pool of light in the middle as though a lamp were somewhere overhead.
 */
export function ShelfPlank({ style, inset = 0 }: { style?: StyleProp<ViewStyle>; inset?: number }) {
  const theme = useTheme();
  const wood = theme.colors.wood;

  return (
    <View style={[{ marginHorizontal: inset }, style]}>
      {/* the front edge of the plank */}
      <LinearGradient
        colors={[shade(wood, 0.28), wood, shade(wood, -0.3)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.plank, theme.elevation(2)]}
      >
        <PaperTexture opacity={0.12} />
        {/* wood grain, three lazy lines */}
        <View style={[styles.grainLine, { top: 3, backgroundColor: withAlpha('#000', 0.1) }]} />
        <View style={[styles.grainLine, { top: 7, left: '18%', right: '30%', backgroundColor: withAlpha('#000', 0.07) }]} />
        <View style={[styles.grainLine, { bottom: 4, left: '40%', backgroundColor: withAlpha('#fff', 0.07) }]} />
      </LinearGradient>

      {/* the shadow under the plank, so it reads as a solid board */}
      <LinearGradient
        colors={[withAlpha('#000', theme.isDark ? 0.35 : 0.22), 'transparent']}
        style={styles.underShadow}
        pointerEvents="none"
      />
    </View>
  );
}

/**
 * Wraps a row of books and draws the plank beneath them, plus the soft
 * contact shadow where the books meet the wood.
 */
export function Shelf({
  children,
  style,
  plankInset = 0,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  plankInset?: number;
}) {
  const theme = useTheme();

  return (
    <View style={style}>
      <View style={styles.booksRow}>
        {/* light pooling on the back wall behind the books */}
        <LinearGradient
          colors={['transparent', withAlpha(theme.colors.glow, theme.isDark ? 0.1 : 0.22), 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {children}
      </View>
      <ShelfPlank inset={plankInset} />
    </View>
  );
}

const styles = StyleSheet.create({
  booksRow: { flexDirection: 'row', alignItems: 'flex-end', minHeight: 40 },
  plank: {
    height: 14,
    borderRadius: 3,
    overflow: 'hidden',
  },
  grainLine: { position: 'absolute', left: '8%', right: '12%', height: 1, borderRadius: 1 },
  underShadow: { height: 14, marginHorizontal: 6, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
});
