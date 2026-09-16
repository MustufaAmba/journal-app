import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * What fills the gap before the app is ready.
 *
 * On a phone the native splash covers this moment, but on the web — and for
 * the beat between the splash hiding and the first screen painting — there is
 * nothing. A blank white page is a poor first impression for something meant
 * to feel like opening a book, so this holds the app's own mark and name.
 *
 * It cannot use the theme: this renders before persisted settings have loaded,
 * so the colours are the splash colours, written out.
 */
const PAPER = '#F5EBDC';
const INK = '#2E2418';

export function LaunchScreen() {
  const breathe = useSharedValue(0);

  React.useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [breathe]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: 0.75 + breathe.value * 0.25,
    transform: [{ scale: 0.98 + breathe.value * 0.02 }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: PAPER }]}>
      <Animated.View entering={FadeIn.duration(320)} style={styles.centre}>
        <Animated.View style={markStyle}>
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.mark}
            contentFit="contain"
            accessibilityLabel="Bookie"
          />
        </Animated.View>
        <Animated.Text style={[styles.name, { color: INK }]}>Bookie</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 168, height: 168 },
  // The serif face may not have loaded yet, so this leans on the system serif.
  name: { marginTop: 12, fontSize: 30, letterSpacing: 0.5, fontFamily: 'Georgia, serif' },
});
