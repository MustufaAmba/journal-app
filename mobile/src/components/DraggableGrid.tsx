import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';

/**
 * Long-press-and-drag reordering for the shelves.
 *
 * Written by hand rather than pulled from a library so the physics match the
 * rest of the app: a book *lifts* off the shelf when you pick it up, the
 * others slide aside to make room, and it settles with a small bounce.
 *
 * Layout is absolute and driven entirely from the UI thread, so dragging never
 * touches React state until the gesture ends.
 */

export type DraggableGridProps<T> = {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number, dragging: boolean) => React.ReactNode;
  numColumns: number;
  itemWidth: number;
  itemHeight: number;
  gap?: number;
  onReorder: (orderedKeys: string[]) => void;
  /** when false the grid renders as a plain layout with no gestures attached */
  enabled?: boolean;
};

type Positions = Record<string, number>;

const springConfig = { damping: 18, stiffness: 220, mass: 0.7 };

export function DraggableGrid<T>({
  items,
  keyExtractor,
  renderItem,
  numColumns,
  itemWidth,
  itemHeight,
  gap = 12,
  onReorder,
  enabled = true,
}: DraggableGridProps<T>) {
  const keys = useMemo(() => items.map(keyExtractor), [items, keyExtractor]);

  const positions = useSharedValue<Positions>({});
  const activeKey = useSharedValue<string | null>(null);

  // Keep the shared position map in step with the list coming from the store.
  useEffect(() => {
    const next: Positions = {};
    keys.forEach((key, index) => {
      next[key] = index;
    });
    positions.value = next;
  }, [keys, positions]);

  const rows = Math.ceil(items.length / numColumns) || 1;
  const cellWidth = itemWidth + gap;
  const cellHeight = itemHeight + gap;

  const commit = useCallback(
    (ordered: string[]) => {
      onReorder(ordered);
    },
    [onReorder],
  );

  return (
    <View style={{ height: rows * cellHeight, position: 'relative' }}>
      {items.map((item, index) => (
        <DraggableCell
          key={keyExtractor(item)}
          itemKey={keyExtractor(item)}
          initialIndex={index}
          positions={positions}
          activeKey={activeKey}
          count={items.length}
          numColumns={numColumns}
          cellWidth={cellWidth}
          cellHeight={cellHeight}
          itemWidth={itemWidth}
          itemHeight={itemHeight}
          enabled={enabled}
          onCommit={commit}
        >
          {(dragging) => renderItem(item, index, dragging)}
        </DraggableCell>
      ))}
    </View>
  );
}

function DraggableCell({
  itemKey,
  initialIndex,
  positions,
  activeKey,
  count,
  numColumns,
  cellWidth,
  cellHeight,
  itemWidth,
  itemHeight,
  enabled,
  onCommit,
  children,
}: {
  itemKey: string;
  initialIndex: number;
  positions: SharedValue<Positions>;
  activeKey: SharedValue<string | null>;
  count: number;
  numColumns: number;
  cellWidth: number;
  cellHeight: number;
  itemWidth: number;
  itemHeight: number;
  enabled: boolean;
  onCommit: (ordered: string[]) => void;
  children: (dragging: boolean) => React.ReactNode;
}) {
  const translateX = useSharedValue((initialIndex % numColumns) * cellWidth);
  const translateY = useSharedValue(Math.floor(initialIndex / numColumns) * cellHeight);
  const lift = useSharedValue(0);
  const [dragging, setDragging] = React.useState(false);

  // Follow the slot this item currently occupies, unless it is the one in hand.
  useAnimatedReaction(
    () => positions.value[itemKey],
    (slot, previous) => {
      if (slot === undefined || slot === previous) return;
      if (activeKey.value === itemKey) return;
      translateX.value = withSpring((slot % numColumns) * cellWidth, springConfig);
      translateY.value = withSpring(Math.floor(slot / numColumns) * cellHeight, springConfig);
    },
    [numColumns, cellWidth, cellHeight],
  );

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .enabled(enabled)
    .onStart(() => {
      activeKey.value = itemKey;
      startX.value = translateX.value;
      startY.value = translateY.value;
      lift.value = withSpring(1, { damping: 14, stiffness: 260 });
      runOnJS(setDragging)(true);
      runOnJS(haptics.lift)();
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;

      // Which slot is the centre of the dragged item currently over?
      const column = Math.round(translateX.value / cellWidth);
      const row = Math.round(translateY.value / cellHeight);
      const target = Math.max(
        0,
        Math.min(count - 1, row * numColumns + Math.max(0, Math.min(numColumns - 1, column))),
      );

      const current = positions.value[itemKey];
      if (target === current) return;

      // Shuffle everything between the old and new slot along by one.
      const next: Positions = { ...positions.value };
      Object.keys(next).forEach((key) => {
        const slot = next[key];
        if (key === itemKey) {
          next[key] = target;
        } else if (current < target && slot > current && slot <= target) {
          next[key] = slot - 1;
        } else if (current > target && slot >= target && slot < current) {
          next[key] = slot + 1;
        }
      });
      positions.value = next;
      runOnJS(haptics.select)();
    })
    .onEnd(() => {
      const slot = positions.value[itemKey] ?? 0;
      translateX.value = withSpring((slot % numColumns) * cellWidth, springConfig);
      translateY.value = withSpring(Math.floor(slot / numColumns) * cellHeight, springConfig);
      lift.value = withTiming(0, { duration: 180 });
      activeKey.value = null;

      const ordered = Object.entries(positions.value)
        .sort((a, b) => a[1] - b[1])
        .map(([key]) => key);

      runOnJS(setDragging)(false);
      runOnJS(onCommit)(ordered);
      runOnJS(haptics.settle)();
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: 1 + lift.value * 0.08 },
      { rotate: `${lift.value * -2.5}deg` },
    ],
    zIndex: activeKey.value === itemKey ? 20 : 1,
    shadowOpacity: 0.1 + lift.value * 0.25,
    shadowRadius: 6 + lift.value * 18,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.cell,
          { width: itemWidth, height: itemHeight, shadowColor: '#000', shadowOffset: { width: 0, height: 6 } },
          style,
        ]}
      >
        {children(dragging)}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  cell: { position: 'absolute', top: 0, left: 0 },
});
