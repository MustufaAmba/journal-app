import React, { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { withAlpha, mix } from '@/lib/color';
import { format, parseISO } from 'date-fns';

/**
 * The reading heatmap: one small square per day, warming from bare paper to
 * lamplight as the reader reads more. Laid out in columns of seven, like a
 * calendar turned on its side.
 */
export function Heatmap({
  data,
  onSelectDay,
  cell = 13,
  gap = 3,
}: {
  data: { date: string; pages: number; minutes: number }[];
  onSelectDay?: (day: { date: string; pages: number; minutes: number }) => void;
  cell?: number;
  gap?: number;
}) {
  const theme = useTheme();
  const scroller = useRef<ScrollView>(null);

  const { weeks, scale, monthLabels } = useMemo(() => {
    if (!data.length) return { weeks: [], scale: 1, monthLabels: [] as { index: number; label: string }[] };

    // Pad the front so the first column starts on a Monday.
    const firstDay = parseISO(data[0].date).getDay();
    const leading = (firstDay + 6) % 7;
    const padded = [...Array.from({ length: leading }, () => null), ...data];

    const cols: (typeof data[number] | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));

    // Scale against a high percentile rather than the max, so one enormous
    // reading day does not flatten every other square to nothing.
    const pages = data.map((d) => d.pages).filter((p) => p > 0).sort((a, b) => a - b);
    const p90 = pages.length ? pages[Math.floor(pages.length * 0.9)] : 1;

    const labels: { index: number; label: string }[] = [];
    let lastMonth = '';
    cols.forEach((col, index) => {
      const first = col.find(Boolean);
      if (!first) return;
      const month = format(parseISO(first.date), 'MMM');
      if (month !== lastMonth) {
        labels.push({ index, label: month });
        lastMonth = month;
      }
    });

    return { weeks: cols, scale: Math.max(1, p90), monthLabels: labels };
  }, [data]);

  const empty = withAlpha(theme.colors.inkFaint, theme.isDark ? 0.13 : 0.11);

  const colorFor = (pages: number) => {
    if (!pages) return empty;
    const t = Math.min(1, pages / scale);
    // three visible steps, so the grid reads at a glance
    const step = t < 0.34 ? 0.32 : t < 0.7 ? 0.62 : 1;
    return mix(withAlpha(theme.colors.accent, 1), theme.colors.gild, 1 - step) as string;
  };

  const columnWidth = cell + gap;

  return (
    <View>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        // Today belongs on the right-hand edge. `contentOffset` is ignored on
        // some platforms, so scroll once the content has actually measured.
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
      >
        <View>
          <View style={[styles.monthRow, { height: 16 }]}>
            {monthLabels.map((label) => (
              <Text
                key={`${label.label}-${label.index}`}
                variant="caption"
                tone="inkFaint"
                style={{ position: 'absolute', left: label.index * columnWidth }}
              >
                {label.label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={{ marginRight: gap }}>
                {week.map((day, dayIndex) => (
                  <Pressable
                    key={dayIndex}
                    haptic={day ? 'select' : 'none'}
                    scaleTo={0.85}
                    onPress={day && onSelectDay ? () => onSelectDay(day) : undefined}
                    accessibilityLabel={
                      day ? `${format(parseISO(day.date), 'd MMMM')}: ${day.pages} pages` : undefined
                    }
                    style={{
                      width: cell,
                      height: cell,
                      marginBottom: gap,
                      borderRadius: 3,
                      backgroundColor: day ? colorFor(day.pages) : 'transparent',
                    }}
                  >
                    <View />
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.legend, { marginTop: theme.space.sm }]}>
        <Text variant="caption" tone="inkFaint">
          quieter
        </Text>
        {[0, 0.3, 0.6, 1].map((t) => (
          <View
            key={t}
            style={{
              width: 11,
              height: 11,
              borderRadius: 3,
              marginHorizontal: 2,
              backgroundColor: t === 0 ? empty : colorFor(t * scale),
            }}
          />
        ))}
        <Text variant="caption" tone="inkFaint">
          busier
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row' },
  monthRow: { flexDirection: 'row', marginBottom: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
});
