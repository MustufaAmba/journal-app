import { Platform } from 'react-native';

/** 4pt base scale. Generous by default — this app should breathe. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
  /** the corner of a real paperback */
  book: 4,
} as const;

export const fonts = {
  /** elegant serif — screen titles, book titles */
  serif: 'Lora_500Medium',
  serifBold: 'Lora_600SemiBold',
  serifItalic: 'Lora_500Medium_Italic',
  /** display serif for quotes and big moments */
  display: 'CormorantGaramond_600SemiBold',
  displayItalic: 'CormorantGaramond_500Medium_Italic',
  /** readable humanist sans — body, UI */
  body: 'Karla_400Regular',
  bodyMedium: 'Karla_500Medium',
  bodyBold: 'Karla_700Bold',
  /** the recipient's own handwriting, more or less */
  hand: 'Caveat_400Regular',
  handBold: 'Caveat_600SemiBold',
} as const;

/**
 * Type scale. `lineHeight` is baked in because serif at loose leading is
 * most of what makes a screen feel like a page instead of a form.
 */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46 },
  title: { fontFamily: fonts.serifBold, fontSize: 26, lineHeight: 34 },
  heading: { fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 28 },
  subheading: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 25 },
  body: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 25 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 15.5, lineHeight: 25 },
  small: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1 },
  quote: { fontFamily: fonts.displayItalic, fontSize: 24, lineHeight: 34 },
  hand: { fontFamily: fonts.hand, fontSize: 22, lineHeight: 28 },
  handLarge: { fontFamily: fonts.handBold, fontSize: 30, lineHeight: 36 },
} as const;

export type TypeToken = keyof typeof type;

/** Soft, low-contrast shadows. Nothing in this app should look like it floats in space. */
export const elevation = (level: 0 | 1 | 2 | 3, tint = '#3A2A18') => {
  if (level === 0) return {};
  const config = {
    1: { o: 0.07, r: 8, y: 2, e: 1 },
    2: { o: 0.1, r: 16, y: 6, e: 4 },
    3: { o: 0.14, r: 28, y: 12, e: 10 },
  }[level];
  return Platform.select({
    ios: {
      shadowColor: tint,
      shadowOpacity: config.o,
      shadowRadius: config.r,
      shadowOffset: { width: 0, height: config.y },
    },
    android: { elevation: config.e },
    default: {},
  }) as object;
};

/** Every animation in the app pulls its timing from here, so the whole app breathes together. */
export const motion = {
  /** a page turning */
  page: { duration: 420 },
  /** something settling into place */
  settle: { damping: 16, stiffness: 140, mass: 0.9 },
  /** a soft, slightly overshooting arrival */
  arrive: { damping: 12, stiffness: 110, mass: 1 },
  /** a press */
  press: { damping: 20, stiffness: 400, mass: 0.5 },
  /** fades */
  fade: { duration: 260 },
  slow: { duration: 900 },
} as const;
