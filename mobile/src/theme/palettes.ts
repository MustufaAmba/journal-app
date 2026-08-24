/**
 * Eight hand-mixed palettes. Each one is a place, not a colour scheme:
 * you should be able to close your eyes and be sitting in it.
 */

export type ThemeId =
  | 'classicLibrary'
  | 'autumn'
  | 'coffeeShop'
  | 'rainyEvening'
  | 'forestReading'
  | 'sepiaPaper'
  | 'morningLight'
  | 'midnight';

/** Ambient particle system that drifts behind the content. */
export type Ambience = 'dust' | 'leaves' | 'steam' | 'rain' | 'fireflies' | 'snow' | 'blossom' | 'stars';

export type Palette = {
  /** deepest background, behind everything */
  canvas: string;
  /** the paper a card is printed on */
  paper: string;
  /** paper, one shade deeper — for wells, inputs, pressed states */
  paperSunken: string;
  /** raised paper — modals, sheets */
  paperRaised: string;
  /** the wood of the shelf */
  wood: string;
  woodDark: string;
  /** primary ink for headings */
  ink: string;
  /** body text */
  inkSoft: string;
  /** captions, metadata */
  inkFaint: string;
  /** the warm accent — bookmark ribbon, active tab, key actions */
  accent: string;
  accentSoft: string;
  accentInk: string;
  /** the secondary accent — used sparingly, for delight */
  gild: string;
  /** hairlines and dividers */
  rule: string;
  /** state colours, always muted to stay in the world */
  success: string;
  warning: string;
  danger: string;
  /** the glow of a lamp in this room */
  glow: string;
  /** overlay scrim */
  scrim: string;
};

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  /** one line that sets the scene, shown in the theme picker */
  blurb: string;
  isDark: boolean;
  ambience: Ambience;
  colors: Palette;
  /** how strongly the paper grain shows through, 0–1 */
  grain: number;
  /** hues for the gradient wash at the top of scrollable screens */
  wash: [string, string];
};

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  classicLibrary: {
    id: 'classicLibrary',
    name: 'Classic Library',
    blurb: 'Green lamps, oak shelves, the hush between the stacks.',
    isDark: false,
    ambience: 'dust',
    grain: 0.055,
    wash: ['#EDE0C8', '#F6EEDF'],
    colors: {
      canvas: '#F3E8D3',
      paper: '#FBF5E9',
      paperSunken: '#F0E4CE',
      paperRaised: '#FFFCF4',
      wood: '#8B5E3C',
      woodDark: '#5C3B23',
      ink: '#2E2418',
      inkSoft: '#574834',
      inkFaint: '#8C7A61',
      accent: '#9C4A32',
      accentSoft: '#E8CFC2',
      accentInk: '#FFF6EC',
      gild: '#B08D4F',
      rule: '#DCCBAE',
      success: '#5B7B52',
      warning: '#B5822E',
      danger: '#A2453A',
      glow: '#F2D9A0',
      scrim: 'rgba(46,36,24,0.42)',
    },
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn',
    blurb: 'A blanket, a window, and the whole street turning gold.',
    isDark: false,
    ambience: 'leaves',
    grain: 0.06,
    wash: ['#F6DCC0', '#FBEEDD'],
    colors: {
      canvas: '#F7E6D0',
      paper: '#FEF6EA',
      paperSunken: '#F4E1C8',
      paperRaised: '#FFFBF3',
      wood: '#A45E33',
      woodDark: '#6E3B1C',
      ink: '#3A2114',
      inkSoft: '#66432C',
      inkFaint: '#9A7659',
      accent: '#C25A28',
      accentSoft: '#F6D6BC',
      accentInk: '#FFF7EF',
      gild: '#C9962F',
      rule: '#E7CFB2',
      success: '#6C7F41',
      warning: '#C58322',
      danger: '#AE4426',
      glow: '#FBC97E',
      scrim: 'rgba(58,33,20,0.42)',
    },
  },
  coffeeShop: {
    id: 'coffeeShop',
    name: 'Coffee Shop',
    blurb: 'Espresso machine sighing, your table by the window.',
    isDark: false,
    ambience: 'steam',
    grain: 0.05,
    wash: ['#E7D6C3', '#F4E9DC'],
    colors: {
      canvas: '#EFE1D1',
      paper: '#FAF2E8',
      paperSunken: '#EBDCCA',
      paperRaised: '#FFFAF3',
      wood: '#7A5340',
      woodDark: '#4E3325',
      ink: '#33251C',
      inkSoft: '#5E483A',
      inkFaint: '#93796A',
      accent: '#8A5A3B',
      accentSoft: '#E4D0BF',
      accentInk: '#FFF7EF',
      gild: '#A98456',
      rule: '#DBC7B3',
      success: '#5E7A5A',
      warning: '#AF803A',
      danger: '#9C4B3E',
      glow: '#EDD3AC',
      scrim: 'rgba(51,37,28,0.42)',
    },
  },
  rainyEvening: {
    id: 'rainyEvening',
    name: 'Rainy Evening',
    blurb: 'Rain on the glass, one lamp on, nowhere to be.',
    isDark: true,
    ambience: 'rain',
    grain: 0.07,
    wash: ['#232B34', '#2C3540'],
    colors: {
      canvas: '#1C2229',
      paper: '#262E37',
      paperSunken: '#1F262E',
      paperRaised: '#313B46',
      wood: '#4A3A31',
      woodDark: '#2F241E',
      ink: '#F0E7DA',
      inkSoft: '#C4BAAE',
      inkFaint: '#8B8378',
      accent: '#D9A05B',
      accentSoft: '#3A3630',
      accentInk: '#241A0F',
      gild: '#E2C083',
      rule: '#38424E',
      success: '#7FA07A',
      warning: '#D3A45F',
      danger: '#C97563',
      glow: '#E9BE7A',
      scrim: 'rgba(10,13,16,0.62)',
    },
  },
  forestReading: {
    id: 'forestReading',
    name: 'Forest Reading',
    blurb: 'Moss, pine needles, light coming down in green columns.',
    isDark: false,
    ambience: 'fireflies',
    grain: 0.055,
    wash: ['#DDE3D0', '#EEF1E4'],
    colors: {
      canvas: '#E4E9D8',
      paper: '#F5F7EC',
      paperSunken: '#DFE5D2',
      paperRaised: '#FBFCF5',
      wood: '#6B6242',
      woodDark: '#443F29',
      ink: '#232B21',
      inkSoft: '#48543F',
      inkFaint: '#7B876E',
      accent: '#4C6B44',
      accentSoft: '#D3DEC7',
      accentInk: '#F6FAF0',
      gild: '#9A8A4B',
      rule: '#CBD4BB',
      success: '#4C6B44',
      warning: '#A98A32',
      danger: '#93513F',
      glow: '#D6E3A8',
      scrim: 'rgba(35,43,33,0.42)',
    },
  },
  sepiaPaper: {
    id: 'sepiaPaper',
    name: 'Sepia Paper',
    blurb: 'A letter kept in a drawer for forty years.',
    isDark: false,
    ambience: 'dust',
    grain: 0.085,
    wash: ['#E8D9BE', '#F4E9D4'],
    colors: {
      canvas: '#EFE1C6',
      paper: '#F9EFDA',
      paperSunken: '#EBDCC0',
      paperRaised: '#FDF7E9',
      wood: '#93764B',
      woodDark: '#634E2F',
      ink: '#40331F',
      inkSoft: '#6B5839',
      inkFaint: '#9C8A69',
      accent: '#8A6A33',
      accentSoft: '#E3D2AE',
      accentInk: '#FCF6E7',
      gild: '#B4934F',
      rule: '#DCC9A4',
      success: '#6C7A4A',
      warning: '#A8842E',
      danger: '#96513A',
      glow: '#EFD9A2',
      scrim: 'rgba(64,51,31,0.42)',
    },
  },
  morningLight: {
    id: 'morningLight',
    name: 'Morning Light',
    blurb: 'First tea of the day, curtains open, everything possible.',
    isDark: false,
    ambience: 'blossom',
    grain: 0.035,
    wash: ['#F7EDE6', '#FDF7F3'],
    colors: {
      canvas: '#FAF2EC',
      paper: '#FFFBF8',
      paperSunken: '#F4E9E1',
      paperRaised: '#FFFFFF',
      wood: '#B08972',
      woodDark: '#8A6552',
      ink: '#3B2D28',
      inkSoft: '#6A554D',
      inkFaint: '#A08C83',
      accent: '#C2705E',
      accentSoft: '#F6DED6',
      accentInk: '#FFF8F5',
      gild: '#C9A26B',
      rule: '#EBDBD1',
      success: '#6E8A6A',
      warning: '#C08E43',
      danger: '#B65B4B',
      glow: '#FBE0CB',
      scrim: 'rgba(59,45,40,0.38)',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    blurb: 'One more chapter. It is 2am. Worth it.',
    isDark: true,
    ambience: 'stars',
    grain: 0.075,
    wash: ['#1A1720', '#221E2A'],
    colors: {
      canvas: '#14121A',
      paper: '#1E1B26',
      paperSunken: '#181520',
      paperRaised: '#282433',
      wood: '#3E3242',
      woodDark: '#291F2C',
      ink: '#EFE8DC',
      inkSoft: '#BFB6AC',
      inkFaint: '#867E7B',
      accent: '#C79BD6',
      accentSoft: '#332B3C',
      accentInk: '#1A1420',
      gild: '#E5C98C',
      rule: '#332E3D',
      success: '#7FA58C',
      warning: '#D2A55F',
      danger: '#C97B7B',
      glow: '#B393CC',
      scrim: 'rgba(6,5,9,0.66)',
    },
  },
};

export const THEME_ORDER: ThemeId[] = [
  'classicLibrary',
  'autumn',
  'coffeeShop',
  'rainyEvening',
  'forestReading',
  'sepiaPaper',
  'morningLight',
  'midnight',
];
