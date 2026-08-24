import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text, SectionLabel } from '@/components/Text';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { Divider } from '@/components/Divider';

import { useTheme } from '@/theme/ThemeProvider';
import {
  exportBackup,
  exportJournalMarkdown,
  readBackupFromDisk,
  restoreBackup,
  summarise,
  buildBackup,
  type ImportMode,
} from '@/lib/backup';
import { useSyncStore } from '@/store/useSyncStore';
import { useAuthStore } from '@/store/useAuthStore';
import { drainSyncQueue } from '@/api/sync';
import { friendlyDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/lib/color';

type Busy = 'backup' | 'markdown' | 'import' | 'sync' | null;

export function DataAndBackupScreen() {
  const theme = useTheme();
  const [busy, setBusy] = useState<Busy>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const sync = useSyncStore();
  const user = useAuthStore((s) => s.user);

  const counts = summarise(buildBackup());

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<void>) => {
    setBusy(kind);
    setLastResult(null);
    try {
      await action();
    } catch (error) {
      Alert.alert('That did not work', error instanceof Error ? error.message : 'Something went wrong.');
      haptics.error();
    } finally {
      setBusy(null);
    }
  };

  const doImport = (mode: ImportMode) =>
    run('import', async () => {
      const backup = await readBackupFromDisk();
      if (!backup) {
        Alert.alert('Not a Marginalia backup', 'Pick a .json file exported from this app.');
        return;
      }
      const restored = restoreBackup(backup, mode);
      haptics.success();
      setLastResult(
        `Brought in ${restored.books} books, ${restored.journal} journal entries, ${restored.quotes} quotes and ${restored.notes} notes.`,
      );
    });

  const confirmReplace = () => {
    Alert.alert(
      'Replace everything?',
      'Your current shelves, journal, quotes and notes will be cleared and replaced with the contents of the backup file. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => void doImport('replace') },
      ],
    );
  };

  return (
    <Screen edges={['top']}>
      <Header title="Export & backup" back />

      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 120 }}>
        <Card>
          <Text variant="body" tone="inkSoft">
            Everything you have written lives on this phone. These are the ways of getting a copy of it somewhere
            safe — or of moving it to a new phone.
          </Text>
          <Divider style={{ marginVertical: theme.space.lg }} />
          <View style={styles.counts}>
            <Count label="books" value={counts.books} />
            <Count label="journal" value={counts.journal} />
            <Count label="quotes" value={counts.quotes} />
            <Count label="notes" value={counts.notes} />
            <Count label="sessions" value={counts.sessions} />
          </View>
        </Card>

        <SectionLabel style={{ marginTop: theme.space.xl }}>Take a copy</SectionLabel>
        <Card padded={false}>
          <ActionRow
            icon="download-outline"
            label="Full backup (.json)"
            detail="Everything, in a file you can import again later"
            busy={busy === 'backup'}
            onPress={() => run('backup', async () => {
              await exportBackup();
              haptics.success();
              setLastResult('Backup saved.');
            })}
          />
          <Divider inset={theme.space.lg} />
          <ActionRow
            icon="document-text-outline"
            label="Journal as a document (.md)"
            detail="Readable, printable, and not tied to this app at all"
            busy={busy === 'markdown'}
            onPress={() => run('markdown', async () => {
              await exportJournalMarkdown();
              haptics.success();
              setLastResult('Journal exported.');
            })}
          />
        </Card>

        <SectionLabel style={{ marginTop: theme.space.xl }}>Bring a copy back</SectionLabel>
        <Card padded={false}>
          <ActionRow
            icon="cloud-upload-outline"
            label="Import and merge"
            detail="Adds anything missing, keeps the newer version of anything shared"
            busy={busy === 'import'}
            onPress={() => void doImport('merge')}
          />
          <Divider inset={theme.space.lg} />
          <ActionRow
            icon="swap-horizontal-outline"
            label="Import and replace"
            detail="Wipes what is here first — for setting up a new phone"
            danger
            onPress={confirmReplace}
          />
        </Card>

        {!user?.guest ? (
          <>
            <SectionLabel style={{ marginTop: theme.space.xl }}>Cloud sync</SectionLabel>
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" tone="ink">
                    {sync.queue.length
                      ? `${sync.queue.length} ${sync.queue.length === 1 ? 'change' : 'changes'} waiting to upload`
                      : 'Everything is uploaded'}
                  </Text>
                  <Text variant="caption" tone="inkFaint">
                    {sync.lastSyncedAt ? `Last synced ${friendlyDate(sync.lastSyncedAt)}` : 'Not synced yet'}
                    {sync.lastError ? ` · ${sync.lastError}` : ''}
                  </Text>
                </View>
                <Button
                  label="Sync now"
                  size="sm"
                  variant="secondary"
                  loading={busy === 'sync'}
                  onPress={() => run('sync', async () => {
                    await drainSyncQueue();
                    haptics.success();
                  })}
                />
              </View>
            </Card>
          </>
        ) : (
          <Card style={{ marginTop: theme.space.xl }}>
            <Text variant="body" tone="inkSoft">
              You are reading as a guest, so nothing is sent anywhere. Backups here are the way to keep a copy —
              or sign in from Settings and everything will be uploaded to your own account.
            </Text>
          </Card>
        )}

        {lastResult ? (
          <View
            style={[
              styles.result,
              { backgroundColor: withAlpha(theme.colors.success, 0.12), borderRadius: theme.radius.md, marginTop: theme.space.xl },
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
            <Text variant="small" tone="inkSoft" style={{ marginLeft: 8, flex: 1 }}>
              {lastResult}
            </Text>
          </View>
        ) : null}

        <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.xl }}>
          Photos and voice notes are referenced by their location on this phone, so they travel with a backup only
          if the files themselves do.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="subheading" tone="ink" style={{ fontFamily: 'Lora_600SemiBold' }}>
        {value}
      </Text>
      <Text variant="caption" tone="inkFaint">
        {label}
      </Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  detail,
  onPress,
  busy,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  onPress: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  const theme = useTheme();
  const tint = danger ? theme.colors.danger : theme.colors.accent;
  return (
    <Pressable onPress={busy ? undefined : onPress} style={[styles.row, { padding: theme.space.lg }]} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.icon, { backgroundColor: withAlpha(tint, 0.1), borderRadius: theme.radius.md }]}>
        {busy ? <ActivityIndicator size="small" color={tint} /> : <Ionicons name={icon} size={17} color={tint} />}
      </View>
      <View style={{ flex: 1, marginLeft: theme.space.md }}>
        <Text variant="body" color={danger ? theme.colors.danger : theme.colors.ink}>
          {label}
        </Text>
        <Text variant="caption" tone="inkFaint">
          {detail}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  counts: { flexDirection: 'row', justifyContent: 'space-between' },
  icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  result: { flexDirection: 'row', alignItems: 'center', padding: 12 },
});
