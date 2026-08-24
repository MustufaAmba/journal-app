import React, { useMemo } from 'react';
import { StyleSheet, View, TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { withAlpha } from '@/lib/color';
import type { TypeToken } from '@/theme/tokens';

/**
 * A deliberately small Markdown renderer.
 *
 * Notes should support the handful of marks people actually use in a notebook
 * — a heading, a bullet, something bold, a quoted line — without pulling in a
 * parser and a WebView. Anything it does not understand renders as plain text,
 * which is the right failure mode for a journal.
 */

type Inline = { text: string; bold?: boolean; italic?: boolean; code?: boolean; strike?: boolean };

const INLINE_PATTERN = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;

function parseInline(line: string): Inline[] {
  const parts = line.split(INLINE_PATTERN).filter((p) => p !== '' && p !== undefined);
  return parts.map((part) => {
    if (/^\*\*[\s\S]+\*\*$/.test(part) || /^__[\s\S]+__$/.test(part)) {
      return { text: part.slice(2, -2), bold: true };
    }
    if (/^~~[\s\S]+~~$/.test(part)) return { text: part.slice(2, -2), strike: true };
    if (/^`[\s\S]+`$/.test(part)) return { text: part.slice(1, -1), code: true };
    if (/^\*[\s\S]+\*$/.test(part) || /^_[\s\S]+_$/.test(part)) {
      return { text: part.slice(1, -1), italic: true };
    }
    return { text: part };
  });
}

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; content: Inline[] }
  | { kind: 'bullet'; content: Inline[] }
  | { kind: 'ordered'; index: number; content: Inline[] }
  | { kind: 'todo'; done: boolean; content: Inline[] }
  | { kind: 'quote'; content: Inline[] }
  | { kind: 'rule' }
  | { kind: 'paragraph'; content: Inline[] };

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let orderedCounter = 0;

  source.split('\n').forEach((rawLine) => {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      orderedCounter = 0;
      return;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ kind: 'rule' });
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      orderedCounter = 0;
      blocks.push({
        kind: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        content: parseInline(heading[2]),
      });
      return;
    }

    const todo = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (todo) {
      blocks.push({ kind: 'todo', done: todo[1].toLowerCase() === 'x', content: parseInline(todo[2]) });
      return;
    }

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      orderedCounter = 0;
      blocks.push({ kind: 'bullet', content: parseInline(bullet[1]) });
      return;
    }

    const ordered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (ordered) {
      orderedCounter += 1;
      blocks.push({ kind: 'ordered', index: orderedCounter, content: parseInline(ordered[2]) });
      return;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      orderedCounter = 0;
      blocks.push({ kind: 'quote', content: parseInline(quote[1]) });
      return;
    }

    orderedCounter = 0;
    blocks.push({ kind: 'paragraph', content: parseInline(line) });
  });

  return blocks;
}

function InlineRun({ runs, style, color }: { runs: Inline[]; style?: TextStyle; color?: string }) {
  const theme = useTheme();
  return (
    <>
      {runs.map((run, index) => (
        <Text
          key={index}
          color={color}
          style={[
            style,
            run.bold ? { fontFamily: 'Karla_700Bold' } : null,
            run.italic ? { fontStyle: 'italic' } : null,
            run.strike ? { textDecorationLine: 'line-through', opacity: 0.65 } : null,
            run.code
              ? {
                  fontFamily: 'Courier',
                  backgroundColor: withAlpha(theme.colors.inkFaint, 0.16),
                  borderRadius: 3,
                }
              : null,
          ]}
        >
          {run.text}
        </Text>
      ))}
    </>
  );
}

export function MarkdownText({
  value,
  variant = 'body',
  color,
  numberOfLines,
  style,
}: {
  value: string;
  variant?: TypeToken;
  color?: string;
  /** when set, the whole thing collapses to a single truncated paragraph */
  numberOfLines?: number;
  style?: TextStyle;
}) {
  const theme = useTheme();
  const blocks = useMemo(() => parseBlocks(value), [value]);

  // In a preview (a sticky note in a grid) block layout is noise — flatten it,
  // but keep the list markers so a checklist still reads as a checklist.
  if (numberOfLines) {
    const prefix = (block: Block) => {
      switch (block.kind) {
        case 'bullet':
          return '• ';
        case 'ordered':
          return `${block.index}. `;
        case 'todo':
          return block.done ? '☑ ' : '☐ ';
        case 'quote':
          return '“';
        default:
          return '';
      }
    };
    const flattened = blocks
      .map((block) =>
        'content' in block ? prefix(block) + block.content.map((c) => c.text).join('') : '———',
      )
      .join('\n');
    return (
      <Text variant={variant} color={color} numberOfLines={numberOfLines} style={style}>
        {flattened}
      </Text>
    );
  }

  const headingVariant: Record<1 | 2 | 3, TypeToken> = { 1: 'title', 2: 'heading', 3: 'subheading' };

  return (
    <View style={style as object}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'rule':
            return (
              <View
                key={index}
                style={[styles.rule, { backgroundColor: theme.colors.rule, marginVertical: theme.space.md }]}
              />
            );

          case 'heading':
            return (
              <Text
                key={index}
                variant={headingVariant[block.level]}
                tone="ink"
                style={{ marginTop: index === 0 ? 0 : theme.space.md, marginBottom: 4 }}
              >
                <InlineRun runs={block.content} color={color ?? theme.colors.ink} />
              </Text>
            );

          case 'quote':
            return (
              <View
                key={index}
                style={[
                  styles.quote,
                  { borderLeftColor: theme.colors.accent, paddingLeft: theme.space.md, marginVertical: 4 },
                ]}
              >
                <Text variant={variant} tone="inkFaint" italic>
                  <InlineRun runs={block.content} color={color ?? theme.colors.inkFaint} />
                </Text>
              </View>
            );

          case 'bullet':
          case 'ordered':
          case 'todo':
            return (
              <View key={index} style={styles.listRow}>
                <Text variant={variant} color={theme.colors.accent} style={styles.marker}>
                  {block.kind === 'bullet' ? '•' : block.kind === 'ordered' ? `${block.index}.` : block.done ? '☑' : '☐'}
                </Text>
                <Text
                  variant={variant}
                  color={color}
                  style={[
                    styles.listBody,
                    block.kind === 'todo' && block.done ? { textDecorationLine: 'line-through', opacity: 0.6 } : null,
                  ]}
                >
                  <InlineRun runs={block.content} color={color} />
                </Text>
              </View>
            );

          default:
            return (
              <Text key={index} variant={variant} color={color} style={{ marginBottom: 4 }}>
                <InlineRun runs={block.content} color={color} />
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { height: StyleSheet.hairlineWidth },
  quote: { borderLeftWidth: 2 },
  listRow: { flexDirection: 'row', marginBottom: 3 },
  marker: { width: 22 },
  listBody: { flex: 1 },
});
