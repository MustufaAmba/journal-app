import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  Ellipse,
  G,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { withAlpha } from '@/lib/color';

/**
 * Hand-drawn illustrations, inked as SVG paths rather than shipped as images.
 *
 * They are drawn with round caps, uneven line weights and a couple of
 * deliberately imperfect curves so they read as pen-and-ink rather than
 * clip art — and because they take their colours from the theme, they change
 * outfits when the reader changes rooms.
 */

export type IllustrationProps = { size?: number; style?: object };

type Ink = {
  line: string;
  soft: string;
  accent: string;
  glow: string;
  paper: string;
  wood: string;
  faint: string;
};

function useInk(): Ink {
  const theme = useTheme();
  return {
    line: theme.colors.ink,
    soft: theme.colors.inkSoft,
    accent: theme.colors.accent,
    glow: theme.colors.glow,
    paper: theme.colors.paper,
    wood: theme.colors.wood,
    faint: withAlpha(theme.colors.inkFaint, 0.4),
  };
}

const S = 1.8; // house stroke weight

/** An armchair under a lamp, with a plant and a small tower of books. */
export function ReadingNook({ size = 200, style }: IllustrationProps) {
  const ink = useInk();
  return (
    <Svg width={size} height={size * 0.82} viewBox="0 0 240 196" style={style}>
      <Defs>
        <LinearGradient id="lampGlow" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={ink.glow} stopOpacity={0.55} />
          <Stop offset="1" stopColor={ink.glow} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* pool of lamplight */}
      <Path d="M150 40 L206 156 L96 156 Z" fill="url(#lampGlow)" />

      {/* floor lamp */}
      <Path d="M132 44 h48 l-10 -22 h-28 z" fill={ink.accent} opacity={0.9} />
      <Path d="M132 44 h48" stroke={ink.line} strokeWidth={S} strokeLinecap="round" />
      <Line x1="156" y1="44" x2="156" y2="158" stroke={ink.line} strokeWidth={S} strokeLinecap="round" />
      <Path d="M140 160 q16 -8 32 0" stroke={ink.line} strokeWidth={S} strokeLinecap="round" fill="none" />

      {/* armchair */}
      <Path
        d="M34 158 v-52 q0 -22 22 -22 h34 q22 0 22 22 v52"
        fill={ink.accent}
        opacity={0.22}
      />
      <Path
        d="M34 158 v-52 q0 -22 22 -22 h34 q22 0 22 22 v52"
        stroke={ink.line}
        strokeWidth={S}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M28 132 q-10 2 -10 14 v12 h16" fill={ink.accent} opacity={0.3} />
      <Path d="M28 132 q-10 2 -10 14 v12 h16" stroke={ink.line} strokeWidth={S} fill="none" strokeLinejoin="round" />
      <Path d="M118 132 q10 2 10 14 v12 h-16" fill={ink.accent} opacity={0.3} />
      <Path d="M118 132 q10 2 10 14 v12 h-16" stroke={ink.line} strokeWidth={S} fill="none" strokeLinejoin="round" />
      <Path d="M46 128 q28 -10 56 0" stroke={ink.soft} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <Line x1="34" y1="158" x2="34" y2="172" stroke={ink.line} strokeWidth={S} strokeLinecap="round" />
      <Line x1="112" y1="158" x2="112" y2="172" stroke={ink.line} strokeWidth={S} strokeLinecap="round" />

      {/* an open book resting on the seat */}
      <Path d="M58 124 q14 -8 26 0 q-14 -5 -26 0z" fill={ink.paper} stroke={ink.line} strokeWidth={1.3} />

      {/* stack of books */}
      <Rect x="186" y="146" width="42" height="9" rx="2" fill={ink.wood} stroke={ink.line} strokeWidth={1.4} />
      <Rect x="190" y="137" width="36" height="9" rx="2" fill={ink.accent} opacity={0.75} stroke={ink.line} strokeWidth={1.4} />
      <Rect x="188" y="128" width="40" height="9" rx="2" fill={ink.paper} stroke={ink.line} strokeWidth={1.4} />

      {/* plant */}
      <Path d="M14 172 h26 l-4 -22 h-18z" fill={ink.wood} opacity={0.55} stroke={ink.line} strokeWidth={1.4} />
      <Path d="M27 150 q-14 -18 -4 -32 q8 12 4 32z" fill={ink.accent} opacity={0.35} stroke={ink.soft} strokeWidth={1.2} />
      <Path d="M27 150 q14 -16 6 -30 q-10 12 -6 30z" fill={ink.accent} opacity={0.25} stroke={ink.soft} strokeWidth={1.2} />

      {/* floor */}
      <Line x1="6" y1="172" x2="234" y2="172" stroke={ink.faint} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

/** An open book with a few sparks lifting off the page. */
export function OpenBook({ size = 160, style }: IllustrationProps) {
  const ink = useInk();
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 200 150" style={style}>
      <Path
        d="M100 46 q-32 -18 -74 -12 v78 q42 -6 74 12 q32 -18 74 -12 v-78 q-42 -6 -74 12z"
        fill={ink.paper}
        stroke={ink.line}
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <Line x1="100" y1="46" x2="100" y2="124" stroke={ink.line} strokeWidth={S} />
      {[62, 72, 82, 92].map((y, i) => (
        <G key={y}>
          <Line x1={40 + i} y1={y} x2={88} y2={y} stroke={ink.faint} strokeWidth={1.3} strokeLinecap="round" />
          <Line x1={112} y1={y} x2={160 - i} y2={y} stroke={ink.faint} strokeWidth={1.3} strokeLinecap="round" />
        </G>
      ))}
      <Path d="M100 34 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3z" fill={ink.glow} />
      <Path d="M136 24 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z" fill={ink.accent} opacity={0.7} />
      <Circle cx="64" cy="26" r="3" fill={ink.glow} />
    </Svg>
  );
}

/** A cup of something hot beside a closed book. */
export function TeaAndBook({ size = 170, style }: IllustrationProps) {
  const ink = useInk();
  return (
    <Svg width={size} height={size * 0.72} viewBox="0 0 200 144" style={style}>
      {/* steam */}
      <Path d="M62 46 q10 -12 0 -24 q-10 -12 0 -18" stroke={ink.faint} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M78 44 q9 -11 0 -22" stroke={ink.faint} strokeWidth={1.6} fill="none" strokeLinecap="round" />

      {/* cup */}
      <Path d="M40 54 h60 v28 q0 22 -22 22 h-16 q-22 0 -22 -22z" fill={ink.paper} stroke={ink.line} strokeWidth={S} strokeLinejoin="round" />
      <Path d="M100 62 q22 0 22 14 t-22 14" stroke={ink.line} strokeWidth={S} fill="none" strokeLinecap="round" />
      <Ellipse cx="70" cy="54" rx="30" ry="7" fill={ink.accent} opacity={0.55} stroke={ink.line} strokeWidth={1.5} />
      <Path d="M52 92 h36" stroke={ink.faint} strokeWidth={1.2} strokeLinecap="round" />

      {/* saucer */}
      <Ellipse cx="70" cy="108" rx="44" ry="8" fill={ink.paper} stroke={ink.line} strokeWidth={1.6} />

      {/* book */}
      <Rect x="118" y="86" width="66" height="12" rx="3" fill={ink.accent} opacity={0.8} stroke={ink.line} strokeWidth={1.5} />
      <Rect x="122" y="74" width="58" height="12" rx="3" fill={ink.wood} opacity={0.7} stroke={ink.line} strokeWidth={1.5} />
      <Line x1="126" y1="80" x2="150" y2="80" stroke={ink.paper} strokeWidth={1.4} strokeLinecap="round" />
      <Line x1="6" y1="116" x2="194" y2="116" stroke={ink.faint} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

/** A shelf with one book on it and a gap where the others should be. */
export function LonelyShelf({ size = 190, style }: IllustrationProps) {
  const ink = useInk();
  return (
    <Svg width={size} height={size * 0.68} viewBox="0 0 220 150" style={style}>
      <Rect x="20" y="104" width="180" height="10" rx="3" fill={ink.wood} stroke={ink.line} strokeWidth={1.6} />
      <Path d="M28 114 v14 M192 114 v14" stroke={ink.line} strokeWidth={1.6} strokeLinecap="round" />

      <Rect x="34" y="58" width="18" height="46" rx="2" fill={ink.accent} opacity={0.85} stroke={ink.line} strokeWidth={1.5} />
      <Line x1="38" y1="66" x2="48" y2="66" stroke={ink.glow} strokeWidth={1.3} />
      <Line x1="38" y1="96" x2="48" y2="96" stroke={ink.glow} strokeWidth={1.3} />

      {/* the empty run of shelf, sketched as dashes */}
      {[70, 92, 114, 136, 158].map((x) => (
        <Rect
          key={x}
          x={x}
          y="64"
          width="16"
          height="40"
          rx="2"
          fill="none"
          stroke={ink.faint}
          strokeWidth={1.4}
          strokeDasharray="4 5"
        />
      ))}

      <Path d="M186 56 q-6 -14 6 -20" stroke={ink.faint} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <Circle cx="196" cy="32" r="3" fill={ink.glow} />
    </Svg>
  );
}

/** Rain on a window, with a plant on the sill. */
export function RainyWindow({ size = 180, style }: IllustrationProps) {
  const ink = useInk();
  return (
    <Svg width={size} height={size} viewBox="0 0 180 180" style={style}>
      <Rect x="26" y="18" width="128" height="128" rx="10" fill={ink.accent} opacity={0.12} stroke={ink.line} strokeWidth={S} />
      <Line x1="90" y1="18" x2="90" y2="146" stroke={ink.line} strokeWidth={1.6} />
      <Line x1="26" y1="82" x2="154" y2="82" stroke={ink.line} strokeWidth={1.6} />

      {[42, 58, 106, 128].map((x, i) => (
        <Path
          key={x}
          d={`M${x} ${30 + i * 8} q3 12 0 20`}
          stroke={ink.soft}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
          opacity={0.6}
        />
      ))}
      <Circle cx="66" cy="104" r="3.5" fill={ink.soft} opacity={0.5} />
      <Circle cx="120" cy="118" r="2.5" fill={ink.soft} opacity={0.5} />
      <Circle cx="108" cy="52" r="2" fill={ink.soft} opacity={0.5} />

      <Rect x="18" y="146" width="144" height="10" rx="3" fill={ink.wood} stroke={ink.line} strokeWidth={1.6} />
      <Path d="M112 146 v-16 h20 v16z" fill={ink.wood} opacity={0.6} stroke={ink.line} strokeWidth={1.4} />
      <Path d="M122 130 q-12 -14 -2 -24 q8 10 2 24z" fill={ink.accent} opacity={0.4} stroke={ink.soft} strokeWidth={1.2} />
      <Path d="M122 130 q12 -12 4 -22 q-8 10 -4 22z" fill={ink.accent} opacity={0.3} stroke={ink.soft} strokeWidth={1.2} />
    </Svg>
  );
}

/** A candle burning down, for quiet moments and long nights. */
export function Candle({ size = 120, style }: IllustrationProps) {
  const ink = useInk();
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 120 138" style={style}>
      <Defs>
        <LinearGradient id="flameGlow" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={ink.glow} stopOpacity={0.6} />
          <Stop offset="1" stopColor={ink.glow} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Circle cx="60" cy="34" r="34" fill="url(#flameGlow)" />
      <Path d="M60 12 q12 14 12 22 a12 12 0 0 1 -24 0 q0 -8 12 -22z" fill={ink.glow} stroke={ink.accent} strokeWidth={1.4} />
      <Path d="M60 26 q5 6 5 10 a5 5 0 0 1 -10 0 q0 -4 5 -10z" fill={ink.paper} opacity={0.8} />
      <Line x1="60" y1="46" x2="60" y2="54" stroke={ink.line} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M42 54 h36 v52 h-36z" fill={ink.paper} stroke={ink.line} strokeWidth={S} strokeLinejoin="round" />
      <Path d="M42 58 q10 6 18 0 q9 -6 18 0" stroke={ink.faint} strokeWidth={1.3} fill="none" />
      <Ellipse cx="60" cy="110" rx="30" ry="7" fill={ink.wood} opacity={0.5} stroke={ink.line} strokeWidth={1.5} />
    </Svg>
  );
}

/** A cat asleep on a pile of books. The correct state of affairs. */
export function SleepingCat({ size = 190, style }: IllustrationProps) {
  const ink = useInk();
  return (
    <Svg width={size} height={size * 0.66} viewBox="0 0 220 146" style={style}>
      <Rect x="46" y="106" width="128" height="14" rx="3" fill={ink.accent} opacity={0.75} stroke={ink.line} strokeWidth={1.6} />
      <Rect x="54" y="92" width="112" height="14" rx="3" fill={ink.wood} opacity={0.7} stroke={ink.line} strokeWidth={1.6} />
      <Rect x="50" y="78" width="120" height="14" rx="3" fill={ink.paper} stroke={ink.line} strokeWidth={1.6} />

      {/* cat */}
      <Path
        d="M72 78 q-4 -26 24 -30 q10 -12 22 -2 q30 0 30 32z"
        fill={ink.soft}
        opacity={0.85}
        stroke={ink.line}
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <Path d="M96 48 l-4 -14 l14 6z" fill={ink.soft} stroke={ink.line} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M118 46 l6 -13 l6 13z" fill={ink.soft} stroke={ink.line} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M100 60 q4 4 8 0" stroke={ink.line} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Path d="M116 60 q4 4 8 0" stroke={ink.line} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Path d="M110 66 q3 4 6 1" stroke={ink.line} strokeWidth={1.3} fill="none" strokeLinecap="round" />
      <Path d="M148 78 q22 -4 20 -20 q-2 -10 -12 -8" stroke={ink.line} strokeWidth={S} fill="none" strokeLinecap="round" />

      {/* zzz */}
      <Path d="M166 40 h12 l-12 12 h12" stroke={ink.faint} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
      <Path d="M184 24 h9 l-9 9 h9" stroke={ink.faint} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

/** A crescent moon with a small book tucked in the curve. */
export function MoonAndBook({ size = 150, style }: IllustrationProps) {
  const ink = useInk();
  return (
    <Svg width={size} height={size} viewBox="0 0 150 150" style={style}>
      <Path
        d="M96 20 a54 54 0 1 0 34 96 a44 44 0 1 1 -34 -96z"
        fill={ink.glow}
        opacity={0.5}
        stroke={ink.line}
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <Path d="M62 84 q14 -8 26 0 v22 q-13 -7 -26 0z" fill={ink.paper} stroke={ink.line} strokeWidth={1.6} strokeLinejoin="round" />
      <Line x1="75" y1="84" x2="75" y2="106" stroke={ink.line} strokeWidth={1.4} />
      <Path d="M28 34 l2 -7 l2 7 l7 2 l-7 2 l-2 7 l-2 -7 l-7 -2z" fill={ink.accent} opacity={0.8} />
      <Circle cx="122" cy="46" r="2.6" fill={ink.glow} />
      <Circle cx="20" cy="96" r="2" fill={ink.glow} />
      <Circle cx="132" cy="104" r="1.8" fill={ink.glow} />
    </Svg>
  );
}

/** A quill and inkwell, used above the journal. */
export function QuillAndInk({ size = 150, style }: IllustrationProps) {
  const ink = useInk();
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 160 128" style={style}>
      <Path d="M40 108 q0 -22 22 -22 h14 q22 0 22 22z" fill={ink.accent} opacity={0.3} stroke={ink.line} strokeWidth={S} strokeLinejoin="round" />
      <Ellipse cx="76" cy="86" rx="36" ry="8" fill={ink.paper} stroke={ink.line} strokeWidth={1.6} />
      <Path
        d="M96 82 q22 -34 46 -66 q-6 34 -30 56 q-8 8 -16 10z"
        fill={ink.paper}
        stroke={ink.line}
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <Path d="M104 74 q18 -24 34 -50" stroke={ink.faint} strokeWidth={1.3} fill="none" strokeLinecap="round" />
      <Path d="M112 80 q16 -18 28 -40" stroke={ink.faint} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <Circle cx="30" cy="66" r="4" fill={ink.accent} opacity={0.7} />
      <Circle cx="20" cy="82" r="2.4" fill={ink.accent} opacity={0.5} />
      <Line x1="6" y1="112" x2="154" y2="112" stroke={ink.faint} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

/** A tall bookcase, used on library empty states and the stats screen. */
export function Bookcase({ size = 180, style }: IllustrationProps) {
  const ink = useInk();
  const shelves = [42, 84, 126];
  return (
    <Svg width={size} height={size * 1.05} viewBox="0 0 180 190" style={style}>
      <Rect x="26" y="18" width="128" height="152" rx="6" fill={ink.wood} opacity={0.28} stroke={ink.line} strokeWidth={S} />
      {shelves.map((y) => (
        <Line key={y} x1="26" y1={y} x2="154" y2={y} stroke={ink.line} strokeWidth={1.8} />
      ))}
      {[
        { y: 20, xs: [34, 46, 58, 74, 86] },
        { y: 62, xs: [34, 44, 60, 72, 90, 102] },
        { y: 104, xs: [34, 48, 62, 78] },
      ].map((row) =>
        row.xs.map((x, i) => (
          <Rect
            key={`${row.y}-${x}`}
            x={x}
            y={row.y + 4}
            width={i % 3 === 0 ? 12 : 9}
            height={row.y === 20 ? 18 : 34}
            rx="1.5"
            fill={i % 2 ? ink.accent : ink.soft}
            opacity={0.7}
            stroke={ink.line}
            strokeWidth={1.2}
          />
        )),
      )}
      <Path d="M112 136 q14 -6 26 0 v18 q-13 -5 -26 0z" fill={ink.paper} stroke={ink.line} strokeWidth={1.5} strokeLinejoin="round" />
      <Line x1="34" y1="170" x2="34" y2="182" stroke={ink.line} strokeWidth={S} strokeLinecap="round" />
      <Line x1="146" y1="170" x2="146" y2="182" stroke={ink.line} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

export const ILLUSTRATIONS = {
  nook: ReadingNook,
  openBook: OpenBook,
  tea: TeaAndBook,
  shelf: LonelyShelf,
  window: RainyWindow,
  candle: Candle,
  cat: SleepingCat,
  moon: MoonAndBook,
  quill: QuillAndInk,
  bookcase: Bookcase,
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

/** Deterministic pick so the home screen's illustration is stable for a day. */
export function illustrationForDay(date: Date = new Date()): IllustrationName {
  const names = Object.keys(ILLUSTRATIONS) as IllustrationName[];
  const seed = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate();
  return names[seed % names.length];
}

