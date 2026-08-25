import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Button } from './Button';
import { PaperTexture } from './PaperTexture';
import { withAlpha } from '@/lib/color';
import { haptics } from '@/lib/haptics';

/**
 * Confirmations and notices, in the app's own hand.
 *
 * React Native's `Alert` is a no-op on the web, so every confirmation in the
 * app silently did nothing there — "Leave guest mode" appeared broken because
 * the dialog never arrived. This works on every platform, and it looks like
 * the rest of the app rather than a system alert dropped into the middle of it.
 *
 * Both methods return a promise, so callers read as plain sequential code:
 *
 *   if (await confirm({ title: 'Delete?', destructive: true })) remove(id);
 */

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type NoticeOptions = { title: string; message?: string; dismissLabel?: string };

type DialogApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (title: string, message?: string) => Promise<void>;
};

const Context = createContext<DialogApi>({
  confirm: async () => false,
  notify: async () => undefined,
});

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'notice'; options: NoticeOptions; resolve: () => void };

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [pending, setPending] = useState<Pending | null>(null);
  // A second dialog raised while one is open would otherwise drop the first
  // promise on the floor, leaving its caller awaiting forever.
  const queue = useRef<Pending[]>([]);

  const push = useCallback((next: Pending) => {
    setPending((current) => {
      if (current) {
        queue.current.push(next);
        return current;
      }
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setPending(queue.current.shift() ?? null);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => push({ kind: 'confirm', options, resolve })),
      notify: (title, message) =>
        new Promise<void>((resolve) => push({ kind: 'notice', options: { title, message }, resolve })),
    }),
    [push],
  );

  const settle = (value: boolean) => {
    if (!pending) return;
    if (pending.kind === 'confirm') pending.resolve(value);
    else pending.resolve();
    close();
  };

  const destructive = pending?.kind === 'confirm' && pending.options.destructive;

  return (
    <Context.Provider value={api}>
      {children}

      <Modal
        visible={Boolean(pending)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => settle(false)}
      >
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(140)}
          style={[styles.backdrop, { backgroundColor: theme.colors.scrim }]}
        >
          <Animated.View
            entering={theme.calm ? FadeIn.duration(160) : ZoomIn.springify().damping(18).mass(0.7)}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.paperRaised,
                borderRadius: theme.radius.xl,
                borderColor: withAlpha(theme.colors.rule, 1),
                padding: theme.space.xl,
              },
              theme.elevation(3),
            ]}
          >
            <PaperTexture opacity={theme.grain} />

            <Text variant="heading" tone="ink" align="center">
              {pending?.options.title}
            </Text>

            {pending?.options.message ? (
              <Text
                variant="body"
                tone="inkFaint"
                align="center"
                style={{ marginTop: theme.space.sm }}
              >
                {pending.options.message}
              </Text>
            ) : null}

            <View style={[styles.actions, { marginTop: theme.space.xl }]}>
              {pending?.kind === 'confirm' ? (
                <>
                  <Button
                    label={pending.options.cancelLabel ?? 'Cancel'}
                    variant="ghost"
                    full
                    onPress={() => settle(false)}
                  />
                  <Button
                    label={pending.options.confirmLabel ?? 'Confirm'}
                    variant={destructive ? 'danger' : 'primary'}
                    full
                    onPress={() => {
                      if (destructive) haptics.warn();
                      settle(true);
                    }}
                  />
                </>
              ) : (
                <Button
                  label={(pending?.options as NoticeOptions | undefined)?.dismissLabel ?? 'All right'}
                  full
                  onPress={() => settle(true)}
                />
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </Context.Provider>
  );
}

export const useDialog = () => useContext(Context);

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 360, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  actions: { gap: 8 },
});
