import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NavigationContext } from '@react-navigation/native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { PaperTexture } from './PaperTexture';
import { Ambience } from './Ambience';

/**
 * Is this screen the one the reader is actually looking at?
 *
 * Tabs stay mounted once visited and stack screens stay mounted underneath the
 * one on top, so without this every screen you have ever opened keeps its own
 * weather running. Written by hand rather than with `useIsFocused` so that a
 * <Screen> rendered outside a navigator still works — it simply counts as
 * focused.
 */
function useScreenFocused() {
  const navigation = React.useContext(NavigationContext);
  const [focused, setFocused] = React.useState(true);

  React.useEffect(() => {
    if (!navigation) return;
    setFocused(navigation.isFocused());
    const stopFocus = navigation.addListener('focus', () => setFocused(true));
    const stopBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      stopFocus();
      stopBlur();
    };
  }, [navigation]);

  return focused;
}

/**
 * The room every screen is furnished inside: theme background, a soft wash of
 * light at the top, paper grain, and the theme's ambient weather.
 */
export function Screen({
  children,
  edges = ['top'],
  style,
  ambience = true,
  wash = true,
  contentStyle,
}: {
  children: React.ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  ambience?: boolean;
  wash?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const focused = useScreenFocused();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.canvas }, style]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />

      {wash ? (
        <LinearGradient
          colors={[theme.wash[0], theme.wash[1], theme.colors.canvas]}
          locations={[0, 0.45, 1]}
          style={styles.wash}
          pointerEvents="none"
        />
      ) : null}

      <PaperTexture />
      {ambience && focused ? <Ambience /> : null}

      <SafeAreaView edges={edges} style={[styles.safe, contentStyle]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
});
