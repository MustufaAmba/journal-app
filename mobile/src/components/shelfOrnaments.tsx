import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse, G, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { withAlpha, mix, shade } from '@/lib/color';

/**
 * The things that live on a shelf besides books.
 *
 * A real bookcase is never a flat run of spines — there is a photograph
 * leaning at the end of a row, a plant someone keeps not quite killing, a bear
 * that has been there since childhood. These are what stop the library screen
 * looking like a product grid.
 *
 * Each ornament is drawn to stand on the shelf line (its art is bottom-aligned
 * within the viewBox), takes its colours from the theme, and is shorter than a
 * book so the eye still reads the books first.
 */

type Ink = {
  line: string;
  soft: string;
  accent: string;
  gild: string;
  paper: string;
  wood: string;
  glow: string;
  faint: string;
};

function useInk(): Ink {
  const theme = useTheme();
  return {
    line: theme.colors.ink,
    soft: theme.colors.inkSoft,
    accent: theme.colors.accent,
    gild: theme.colors.gild,
    paper: theme.colors.paper,
    wood: theme.colors.wood,
    glow: theme.colors.glow,
    faint: withAlpha(theme.colors.inkFaint, 0.45),
  };
}

export type OrnamentProps = { height: number };

/** ratio = width / height, so a row can budget space before rendering */
type Ornament = { key: string; ratio: number; Component: React.FC<OrnamentProps> };

const S = 1.6;

/* ----------------------------- the objects ----------------------------- */

const FramedPhoto: React.FC<OrnamentProps> = ({ height }) => {
  const ink = useInk();
  const w = height * 0.82;
  return (
    <Svg width={w} height={height} viewBox="0 0 82 100">
      {/* leaning very slightly, the way a frame actually stands */}
      <G transform="rotate(-3 41 100)">
        <Rect x="8" y="26" width="66" height="72" rx="3" fill={ink.wood} stroke={ink.line} strokeWidth={S} />
        <Rect x="16" y="34" width="50" height="56" rx="1" fill={ink.paper} stroke={ink.line} strokeWidth={1.1} />
        {/* a little landscape inside */}
        <Path d="M16 78 l14 -16 l10 11 l9 -13 l17 18z" fill={ink.accent} opacity={0.55} />
        <Circle cx="55" cy="46" r="5" fill={ink.gild} opacity={0.8} />
        <Path d="M16 78 h50" stroke={ink.line} strokeWidth={0.9} />
      </G>
    </Svg>
  );
};

const Teddy: React.FC<OrnamentProps> = ({ height }) => {
  const ink = useInk();
  const w = height * 0.86;
  const fur = mix(ink.wood, ink.paper, 0.25);
  return (
    <Svg width={w} height={height} viewBox="0 0 86 100">
      {/* legs */}
      <Ellipse cx="28" cy="88" rx="13" ry="10" fill={fur} stroke={ink.line} strokeWidth={S} />
      <Ellipse cx="58" cy="88" rx="13" ry="10" fill={fur} stroke={ink.line} strokeWidth={S} />
      {/* body */}
      <Ellipse cx="43" cy="66" rx="22" ry="20" fill={fur} stroke={ink.line} strokeWidth={S} />
      <Ellipse cx="43" cy="68" rx="12" ry="11" fill={ink.paper} opacity={0.55} />
      {/* arms */}
      <Ellipse cx="19" cy="62" rx="8" ry="11" fill={fur} stroke={ink.line} strokeWidth={S} transform="rotate(-18 19 62)" />
      <Ellipse cx="67" cy="62" rx="8" ry="11" fill={fur} stroke={ink.line} strokeWidth={S} transform="rotate(18 67 62)" />
      {/* head */}
      <Circle cx="43" cy="34" r="20" fill={fur} stroke={ink.line} strokeWidth={S} />
      <Circle cx="26" cy="19" r="8" fill={fur} stroke={ink.line} strokeWidth={S} />
      <Circle cx="60" cy="19" r="8" fill={fur} stroke={ink.line} strokeWidth={S} />
      <Circle cx="26" cy="19" r="3.5" fill={ink.accent} opacity={0.55} />
      <Circle cx="60" cy="19" r="3.5" fill={ink.accent} opacity={0.55} />
      {/* face */}
      <Ellipse cx="43" cy="41" rx="9" ry="7" fill={ink.paper} opacity={0.7} />
      <Circle cx="36" cy="32" r="2.3" fill={ink.line} />
      <Circle cx="50" cy="32" r="2.3" fill={ink.line} />
      <Ellipse cx="43" cy="38" rx="3" ry="2.2" fill={ink.line} />
      <Path d="M43 40 v3 M43 43 q-4 3 -7 0 M43 43 q4 3 7 0" stroke={ink.line} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
};

const Plant: React.FC<OrnamentProps> = ({ height }) => {
  const ink = useInk();
  const w = height * 0.74;
  const leaf = mix(ink.accent, '#4C6B44', 0.55);
  return (
    <Svg width={w} height={height} viewBox="0 0 74 100">
      {/* trailing leaves */}
      <Path d="M37 58 q-22 -12 -26 -40 q20 10 26 40z" fill={leaf} opacity={0.85} stroke={ink.line} strokeWidth={1.2} />
      <Path d="M37 58 q20 -16 20 -44 q-16 16 -20 44z" fill={leaf} opacity={0.7} stroke={ink.line} strokeWidth={1.2} />
      <Path d="M37 60 q-14 -6 -30 2 q18 8 30 -2z" fill={leaf} opacity={0.6} stroke={ink.line} strokeWidth={1.1} />
      <Path d="M37 60 q16 -4 28 6 q-18 6 -28 -6z" fill={leaf} opacity={0.5} stroke={ink.line} strokeWidth={1.1} />
      {/* pot */}
      <Path d="M18 62 h38 l-5 36 h-28z" fill={ink.accent} stroke={ink.line} strokeWidth={S} strokeLinejoin="round" />
      <Rect x="15" y="57" width="44" height="8" rx="2" fill={shade(ink.accent, -0.12)} stroke={ink.line} strokeWidth={S} />
      <Path d="M24 76 h26" stroke={withAlpha(ink.paper, 0.5)} strokeWidth={1.4} />
    </Svg>
  );
};

const StackedBooks: React.FC<OrnamentProps> = ({ height }) => {
  const ink = useInk();
  const w = height * 1.05;
  const covers = [ink.accent, ink.gild, ink.soft];
  return (
    <Svg width={w} height={height} viewBox="0 0 105 100">
      {covers.map((c, i) => {
        const y = 98 - (i + 1) * 17;
        const inset = i * 4;
        return (
          <G key={i}>
            <Rect x={6 + inset} y={y} width={92 - inset * 2} height="15" rx="2.5" fill={c} stroke={ink.line} strokeWidth={S} />
            {/* the page block, just visible along the edge */}
            <Rect x={9 + inset} y={y + 3} width={86 - inset * 2} height="4" rx="1" fill={ink.paper} opacity={0.55} />
          </G>
        );
      })}
      {/* a pair of glasses resting on top */}
      <Circle cx="38" cy="38" r="8" fill="none" stroke={ink.line} strokeWidth={1.5} />
      <Circle cx="62" cy="38" r="8" fill="none" stroke={ink.line} strokeWidth={1.5} />
      <Path d="M46 38 q4 -4 8 0" stroke={ink.line} strokeWidth={1.5} fill="none" />
      <Path d="M30 35 q-8 -3 -11 2" stroke={ink.line} strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </Svg>
  );
};

const Teacup: React.FC<OrnamentProps> = ({ height }) => {
  const ink = useInk();
  const w = height * 1.0;
  return (
    <Svg width={w} height={height} viewBox="0 0 100 100">
      {/* steam */}
      <Path d="M44 44 q8 -10 0 -19 q-8 -9 0 -15" stroke={ink.faint} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Path d="M58 44 q7 -9 0 -17" stroke={ink.faint} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* cup */}
      <Path d="M26 52 h50 v20 q0 16 -16 16 h-18 q-16 0 -16 -16z" fill={ink.paper} stroke={ink.line} strokeWidth={S} strokeLinejoin="round" />
      <Path d="M76 58 q16 0 16 10 t-16 10" stroke={ink.line} strokeWidth={S} fill="none" strokeLinecap="round" />
      <Ellipse cx="51" cy="52" rx="25" ry="6" fill={ink.accent} opacity={0.6} stroke={ink.line} strokeWidth={1.3} />
      <Path d="M36 66 h30" stroke={ink.faint} strokeWidth={1.1} strokeLinecap="round" />
      {/* saucer */}
      <Ellipse cx="51" cy="92" rx="38" ry="7" fill={ink.paper} stroke={ink.line} strokeWidth={1.5} />
    </Svg>
  );
};

const Owl: React.FC<OrnamentProps> = ({ height }) => {
  const ink = useInk();
  const w = height * 0.7;
  const body = mix(ink.wood, ink.gild, 0.3);
  return (
    <Svg width={w} height={height} viewBox="0 0 70 100">
      <Path d="M35 20 q26 0 26 34 q0 30 -26 30 q-26 0 -26 -30 q0 -34 26 -34z" fill={body} stroke={ink.line} strokeWidth={S} />
      {/* ear tufts */}
      <Path d="M16 26 l-5 -14 l14 7z" fill={body} stroke={ink.line} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M54 26 l5 -14 l-14 7z" fill={body} stroke={ink.line} strokeWidth={1.4} strokeLinejoin="round" />
      {/* eyes */}
      <Circle cx="24" cy="42" r="11" fill={ink.paper} stroke={ink.line} strokeWidth={1.4} />
      <Circle cx="46" cy="42" r="11" fill={ink.paper} stroke={ink.line} strokeWidth={1.4} />
      <Circle cx="24" cy="42" r="4.5" fill={ink.line} />
      <Circle cx="46" cy="42" r="4.5" fill={ink.line} />
      <Path d="M35 50 l-5 7 h10z" fill={ink.gild} stroke={ink.line} strokeWidth={1.1} strokeLinejoin="round" />
      {/* breast feathers */}
      <Path d="M24 66 q6 6 11 0 q5 6 11 0" stroke={ink.line} strokeWidth={1.1} fill="none" opacity={0.6} />
      <Path d="M22 74 q7 6 13 0 q6 6 13 0" stroke={ink.line} strokeWidth={1.1} fill="none" opacity={0.45} />
      {/* feet */}
      <Path d="M27 84 v6 M23 90 h9 M43 84 v6 M39 90 h9" stroke={ink.line} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
};

const Candle: React.FC<OrnamentProps> = ({ height }) => {
  const ink = useInk();
  const w = height * 0.6;
  return (
    <Svg width={w} height={height} viewBox="0 0 60 100">
      <Defs>
        <LinearGradient id="ornGlow" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={ink.glow} stopOpacity={0.55} />
          <Stop offset="1" stopColor={ink.glow} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Circle cx="30" cy="26" r="24" fill="url(#ornGlow)" />
      <Path d="M30 8 q8 10 8 16 a8 8 0 0 1 -16 0 q0 -6 8 -16z" fill={ink.glow} stroke={ink.accent} strokeWidth={1.2} />
      <Line x1="30" y1="32" x2="30" y2="38" stroke={ink.line} strokeWidth={1.5} strokeLinecap="round" />
      <Rect x="18" y="38" width="24" height="44" rx="2" fill={ink.paper} stroke={ink.line} strokeWidth={S} />
      <Path d="M18 42 q7 5 12 0 q6 -5 12 0" stroke={ink.faint} strokeWidth={1.2} fill="none" />
      <Path d="M12 82 h36 l-4 12 h-28z" fill={ink.gild} opacity={0.75} stroke={ink.line} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
};

const Bookend: React.FC<OrnamentProps> = ({ height }) => {
  const ink = useInk();
  const w = height * 0.46;
  const brass = mix(ink.gild, ink.wood, 0.3);
  return (
    <Svg width={w} height={height} viewBox="0 0 46 100">
      <Path d="M10 20 h10 v72 h20 v8 h-30z" fill={brass} stroke={ink.line} strokeWidth={S} strokeLinejoin="round" />
      <Path d="M10 20 q0 -12 10 -12" stroke={ink.line} strokeWidth={S} fill="none" />
      <Circle cx="15" cy="34" r="3" fill={ink.paper} opacity={0.5} />
      <Path d="M12 60 h6" stroke={shade(brass, -0.25)} strokeWidth={1.4} />
    </Svg>
  );
};

const FairyJar: React.FC<OrnamentProps> = ({ height }) => {
  const ink = useInk();
  const w = height * 0.66;
  return (
    <Svg width={w} height={height} viewBox="0 0 66 100">
      <Defs>
        <LinearGradient id="jarGlow" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={ink.glow} stopOpacity={0.5} />
          <Stop offset="1" stopColor={ink.glow} stopOpacity={0.05} />
        </LinearGradient>
      </Defs>
      <Rect x="12" y="30" width="42" height="62" rx="9" fill="url(#jarGlow)" stroke={ink.line} strokeWidth={S} />
      <Rect x="18" y="22" width="30" height="10" rx="3" fill={ink.gild} opacity={0.8} stroke={ink.line} strokeWidth={1.4} />
      {[[24,48],[40,42],[33,60],[45,66],[22,70],[36,80],[48,56]].map(([cx,cy],i)=>(
        <Circle key={i} cx={cx} cy={cy} r={i%3===0?3.2:2.2} fill={ink.glow} />
      ))}
      <Path d="M16 40 q4 -6 10 -6" stroke={withAlpha(ink.paper, 0.6)} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </Svg>
  );
};

const Clock: React.FC<OrnamentProps> = ({ height }) => {
  const ink = useInk();
  const w = height * 0.78;
  return (
    <Svg width={w} height={height} viewBox="0 0 78 100">
      <Path d="M14 40 q0 -22 25 -22 t25 22 v44 q0 8 -8 8 h-34 q-8 0 -8 -8z" fill={ink.wood} stroke={ink.line} strokeWidth={S} strokeLinejoin="round" />
      <Circle cx="39" cy="50" r="20" fill={ink.paper} stroke={ink.line} strokeWidth={1.5} />
      <Line x1="39" y1="50" x2="39" y2="38" stroke={ink.line} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="39" y1="50" x2="48" y2="55" stroke={ink.line} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx="39" cy="50" r="1.8" fill={ink.accent} />
      <Path d="M20 92 h38" stroke={shade(ink.wood, -0.3)} strokeWidth={1.4} />
      <Circle cx="39" cy="78" r="5" fill={ink.gild} opacity={0.7} stroke={ink.line} strokeWidth={1.1} />
    </Svg>
  );
};

/* ------------------------------ the set ------------------------------- */

export const ORNAMENTS: Ornament[] = [
  { key: 'frame', ratio: 0.82, Component: FramedPhoto },
  { key: 'teddy', ratio: 0.86, Component: Teddy },
  { key: 'plant', ratio: 0.74, Component: Plant },
  { key: 'stack', ratio: 1.05, Component: StackedBooks },
  { key: 'teacup', ratio: 1.0, Component: Teacup },
  { key: 'owl', ratio: 0.7, Component: Owl },
  { key: 'candle', ratio: 0.6, Component: Candle },
  { key: 'bookend', ratio: 0.46, Component: Bookend },
  { key: 'jar', ratio: 0.66, Component: FairyJar },
  { key: 'clock', ratio: 0.78, Component: Clock },
];

/**
 * Where each object's feet actually are inside its 100-unit viewBox.
 *
 * The art does not all reach the bottom edge — an owl's claws stop at 90, a
 * jar's base at 92 — and that leftover space would leave the ornament hovering
 * a few pixels above the plank. Nudging each one down by its own shortfall is
 * what makes them sit on the wood.
 */
const BASELINE: Record<string, number> = {
  frame: 98,
  teddy: 98,
  plant: 98,
  stack: 96,
  teacup: 99,
  owl: 90,
  candle: 94,
  bookend: 100,
  jar: 92,
  clock: 92,
};

/** Each ornament has its own natural height, as a fraction of a book's. */
const HEIGHT_SCALE: Record<string, number> = {
  frame: 0.74,
  teddy: 0.62,
  plant: 0.78,
  stack: 0.34,
  teacup: 0.4,
  owl: 0.56,
  candle: 0.66,
  bookend: 0.82,
  jar: 0.6,
  clock: 0.64,
};

export type PlacedOrnament = { kind: 'ornament'; key: string; index: number; width: number; height: number };

/** Width an ornament will occupy on the shelf, so a row can be packed before render. */
export function ornamentSize(index: number, bookHeight: number) {
  const o = ORNAMENTS[index % ORNAMENTS.length];
  const height = Math.round(bookHeight * HEIGHT_SCALE[o.key]);
  return { width: Math.round(height * o.ratio), height };
}

/** Renders one ornament, standing on the shelf line. */
export const ShelfOrnament = memo(function ShelfOrnament({
  index,
  height,
}: {
  index: number;
  height: number;
}) {
  const { Component, key } = useMemo(() => ORNAMENTS[index % ORNAMENTS.length], [index]);
  const sink = Math.round(((100 - (BASELINE[key] ?? 100)) / 100) * height);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ marginRight: 10, justifyContent: 'flex-end', marginBottom: -sink }}
      testID={`ornament-${key}`}
    >
      <Component height={height} />
    </View>
  );
});
