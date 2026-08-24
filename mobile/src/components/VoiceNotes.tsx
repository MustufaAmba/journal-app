import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { withAlpha } from '@/lib/color';
import { haptics } from '@/lib/haptics';

/**
 * Little spoken notes.
 *
 * Sometimes you finish a chapter and do not want to type — you want to say
 * "I did not see that coming" out loud and get on with your evening.
 */

const formatDuration = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export function VoiceNoteRecorder({
  onRecorded,
}: {
  onRecorded: (note: { uri: string; durationMs: number }) => void;
}) {
  const theme = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [denied, setDenied] = useState(false);

  const pulse = useSharedValue(0);

  useEffect(() => {
    if (state.isRecording && !theme.calm) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [state.isRecording, pulse, theme.calm]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + pulse.value * 0.3,
    transform: [{ scale: 1 + pulse.value * 0.35 }],
  }));

  const start = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setDenied(true);
      haptics.error();
      return;
    }
    setDenied(false);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    haptics.settle();
  }, [recorder]);

  const stop = useCallback(async () => {
    const durationMs = state.durationMillis;
    await recorder.stop();
    // The uri only becomes available once the file has been written out.
    const uri = recorder.uri;
    await setAudioModeAsync({ allowsRecording: false });
    haptics.success();
    if (uri) onRecorded({ uri, durationMs });
  }, [recorder, state.durationMillis, onRecorded]);

  return (
    <View>
      <View style={styles.recorderRow}>
        <View>
          {state.isRecording ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                { backgroundColor: theme.colors.danger, borderRadius: 30 },
                haloStyle,
              ]}
            />
          ) : null}
          <Pressable
            onPress={state.isRecording ? stop : start}
            haptic="none"
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={state.isRecording ? 'Stop recording' : 'Record a voice note'}
            style={[
              styles.recordButton,
              {
                backgroundColor: state.isRecording ? theme.colors.danger : theme.colors.accent,
                borderRadius: 26,
              },
              theme.elevation(1),
            ]}
          >
            <Ionicons
              name={state.isRecording ? 'stop' : 'mic'}
              size={22}
              color={theme.colors.accentInk}
            />
          </Pressable>
        </View>

        <View style={{ marginLeft: theme.space.lg, flex: 1 }}>
          <Text variant="bodyStrong" tone="ink">
            {state.isRecording ? formatDuration(state.durationMillis) : 'Say something'}
          </Text>
          <Text variant="caption" tone="inkFaint">
            {denied
              ? 'Microphone access was declined — you can change that in Settings.'
              : state.isRecording
                ? 'Tap the square when you are done.'
                : 'A short spoken note, kept with this entry.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function VoiceNoteRow({
  uri,
  durationMs,
  onDelete,
}: {
  uri: string;
  durationMs: number;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      // Replay from the top once it has finished.
      if (status.didJustFinish || status.currentTime >= status.duration - 0.1) player.seekTo(0);
      player.play();
    }
    haptics.tap();
  };

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  return (
    <View
      style={[
        styles.noteRow,
        {
          backgroundColor: withAlpha(theme.colors.accentSoft, theme.isDark ? 0.35 : 0.7),
          borderRadius: theme.radius.md,
          borderColor: withAlpha(theme.colors.accent, 0.2),
        },
      ]}
    >
      <Pressable
        onPress={toggle}
        haptic="none"
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
        style={[styles.playButton, { backgroundColor: theme.colors.accent }]}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={15} color={theme.colors.accentInk} />
      </Pressable>

      <View style={{ flex: 1, marginHorizontal: theme.space.md }}>
        <Waveform progress={progress} />
      </View>

      <Text variant="caption" tone="inkSoft" style={{ marginRight: theme.space.sm }}>
        {formatDuration(status.duration ? status.duration * 1000 : durationMs)}
      </Text>

      <Pressable onPress={onDelete} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Delete voice note">
        <Ionicons name="close-circle" size={18} color={withAlpha(theme.colors.inkFaint, 0.8)} />
      </Pressable>
    </View>
  );
}

/** A fake but pleasant waveform — a real FFT is overkill for a 20-second note. */
function Waveform({ progress }: { progress: number }) {
  const theme = useTheme();
  const bars = 26;

  return (
    <View style={styles.waveform}>
      {Array.from({ length: bars }, (_, i) => {
        const height = 5 + Math.abs(Math.sin(i * 1.7) * 14) + (i % 3) * 2;
        const played = i / bars <= progress;
        return (
          <View
            key={i}
            style={{
              width: 2.5,
              height,
              borderRadius: 2,
              backgroundColor: played ? theme.colors.accent : withAlpha(theme.colors.inkFaint, 0.35),
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  recorderRow: { flexDirection: 'row', alignItems: 'center' },
  recordButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', top: -4, left: -4, width: 60, height: 60 },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  playButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  waveform: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 24 },
});
