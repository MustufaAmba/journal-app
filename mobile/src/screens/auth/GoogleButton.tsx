import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Text';
import { Pressable } from '@/components/Pressable';
import { withAlpha } from '@/lib/color';

const GoogleMark = () => (
  <Svg width={17} height={17} viewBox="0 0 48 48">
    <Path
      fill="#4285F4"
      d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h11.9c-.5 2.8-2.1 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.5-9.5 6.5-16.6z"
    />
    <Path
      fill="#34A853"
      d="M24 46c5.9 0 10.9-2 14.6-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.8C8 41.4 15.4 46 24 46z"
    />
    <Path fill="#FBBC05" d="M11.6 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.8H4.3A22 22 0 002 24c0 3.6.9 6.9 2.3 9.9l7.3-5.8z" />
    <Path
      fill="#EA4335"
      d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 8 6.6 4.3 14.1l7.3 5.8c1.7-5.2 6.6-9.3 12.4-9.3z"
    />
  </Svg>
);

export function GoogleButton({ onPress, loading }: { onPress: () => void; loading?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.paperRaised,
          borderColor: withAlpha(theme.colors.rule, 1),
          borderRadius: theme.radius.pill,
          opacity: loading ? 0.6 : 1,
        },
        theme.elevation(1),
      ]}
    >
      <View style={styles.inner}>
        <GoogleMark />
        <Text variant="bodyStrong" tone="ink" style={{ marginLeft: 10 }}>
          {loading ? 'Opening Google…' : 'Continue with Google'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { height: 48, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
