import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { prettyDate, duration } from '@/lib/date';
import { pagesIn } from '@/store/useSessionsStore';
import { withAlpha } from '@/lib/color';
import type { LibraryEntry, ReadingSession } from '@/types';

type Milestone = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  accent?: boolean;
};

/**
 * The life of one book, as a vertical thread: opened, read, re-read, closed.
 * A book you are still in the middle of shows the thread continuing downward.
 */
export function ReadingTimeline({
  entry,
  sessions,
  readingDays,
}: {
  entry: LibraryEntry;
  sessions: ReadingSession[];
  readingDays: number | null;
}) {
  const theme = useTheme();

  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const totalPages = sessions.reduce((sum, s) => sum + pagesIn(s), 0);

  const milestones: Milestone[] = [];

  milestones.push({
    icon: 'add-circle-outline',
    label: 'Added to the library',
    detail: prettyDate(entry.addedAt),
  });

  if (entry.startedAt) {
    milestones.push({
      icon: 'book-outline',
      label: 'Started reading',
      detail: prettyDate(entry.startedAt),
      accent: true,
    });
  }

  (entry.rereads ?? []).forEach((reread, index) => {
    milestones.push({
      icon: 'repeat-outline',
      label: `Read for the ${index === 0 ? 'first' : `${index + 1}${index === 1 ? 'nd' : 'th'}`} time`,
      detail: `${prettyDate(reread.startedAt)} – ${prettyDate(reread.finishedAt)}`,
    });
  });

  if (sessions.length) {
    milestones.push({
      icon: 'reader-outline',
      label: `${sessions.length} reading ${sessions.length === 1 ? 'session' : 'sessions'}`,
      detail: [
        totalPages ? `${totalPages} pages` : null,
        totalMinutes ? duration(totalMinutes) : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'logged',
    });
  }

  if (entry.finishedAt) {
    milestones.push({
      icon: 'checkmark-circle',
      label: 'Finished',
      detail: readingDays
        ? `${prettyDate(entry.finishedAt)} · ${readingDays} ${readingDays === 1 ? 'day' : 'days'}`
        : prettyDate(entry.finishedAt),
      accent: true,
    });
  } else if (entry.shelf === 'currentlyReading') {
    milestones.push({
      icon: 'ellipsis-horizontal',
      label: 'Still going',
      detail: `Page ${entry.currentPage}`,
    });
  }

  return (
    <Card padded={false}>
      <View style={{ padding: theme.space.lg }}>
        {milestones.map((milestone, index) => {
          const last = index === milestones.length - 1;
          const tint = milestone.accent ? theme.colors.accent : theme.colors.inkFaint;

          return (
            <View key={`${milestone.label}-${index}`} style={styles.row}>
              <View style={styles.gutter}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: milestone.accent
                        ? theme.colors.accent
                        : withAlpha(theme.colors.inkFaint, 0.25),
                      borderColor: theme.colors.paper,
                    },
                  ]}
                >
                  <Ionicons
                    name={milestone.icon}
                    size={12}
                    color={milestone.accent ? theme.colors.accentInk : theme.colors.inkSoft}
                  />
                </View>
                {!last ? (
                  <View style={[styles.thread, { backgroundColor: withAlpha(theme.colors.rule, 1) }]} />
                ) : null}
              </View>

              <View style={[styles.body, { paddingBottom: last ? 0 : theme.space.lg }]}>
                <Text variant="bodyStrong" color={milestone.accent ? theme.colors.ink : theme.colors.inkSoft}>
                  {milestone.label}
                </Text>
                <Text variant="caption" tone="inkFaint" style={{ marginTop: 1 }}>
                  {milestone.detail}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  gutter: { width: 34, alignItems: 'center' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  thread: { width: 2, flex: 1, marginVertical: 2, borderRadius: 1 },
  body: { flex: 1, marginLeft: 10, paddingTop: 2 },
});
