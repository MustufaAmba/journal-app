import React, { useCallback, useEffect } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { PaperTexture } from './PaperTexture';
import { haptics } from '@/lib/haptics';

/**
 * A bottom sheet that slides up like a drawer in a writing desk.
 *
 * Built on Modal + Reanimated rather than a sheet library so the paper
 * texture, grab handle and spring all match the rest of the app exactly.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  /** fraction of the screen the sheet is allowed to cover */
  maxHeight = 0.88,
  scrollable,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: number;
  scrollable?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const translateY = useSharedValue(height);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.9 });
      backdrop.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withTiming(height, { duration: 220 });
      backdrop.value = withTiming(0, { duration: 180 });
    }
  }, [visible, height, translateY, backdrop]);

  const dismiss = useCallback(() => {
    haptics.tap();
    onClose();
  }, [onClose]);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      // Only follow downward drags; upward ones should feel like a wall.
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 900) {
        translateY.value = withTiming(height, { duration: 200 });
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 240 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }, backdropStyle]}>
          <Animated.View style={StyleSheet.absoluteFill} onTouchEnd={dismiss} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.paperRaised,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                maxHeight: height * maxHeight,
                paddingBottom: insets.bottom + theme.space.lg,
                borderColor: theme.colors.rule,
              },
              theme.elevation(3),
              sheetStyle,
            ]}
          >
            <PaperTexture opacity={theme.grain * 0.7} />

            <GestureDetector gesture={pan}>
              <View style={styles.grabArea}>
                <View style={[styles.grabber, { backgroundColor: theme.colors.rule }]} />
                {title ? (
                  <Text variant="heading" tone="ink" align="center" style={{ marginTop: theme.space.sm }}>
                    {title}
                  </Text>
                ) : null}
              </View>
            </GestureDetector>

            <View style={[styles.body, { paddingHorizontal: theme.space.lg }, scrollable ? { flexShrink: 1 } : null]}>
              {children}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  grabArea: { paddingTop: 10, paddingBottom: 8, alignItems: 'center' },
  grabber: { width: 44, height: 4, borderRadius: 2, opacity: 0.9 },
  body: { paddingTop: 4 },
});
