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
  | 'midnight'
  | 'pressedFlowers'
  | 'quietInk'
  | 'secondhandBookshop'
  | 'lavenderDusk'
  | 'winterCabin'
  | 'inkAndWine';

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
  pressedFlowers: {
    id: 'pressedFlowers',
    name: 'Pressed Flowers',
    blurb: 'Petals flattened between pages, forgotten and found again.',
    isDark: false,
    ambience: 'blossom',
    grain: 0.06,
    wash: ['#F6E7EC', '#FCF3F1'],
    colors: {
      canvas: '#FAF0EF',
      paper: '#FFF9F7',
      paperSunken: '#F4E4E4',
      paperRaised: '#FFFDFC',
      wood: '#A97F86',
      woodDark: '#7C5A62',
      ink: '#3C2A31',
      inkSoft: '#6B4F58',
      inkFaint: '#A2848C',
      accent: '#B15B7A',
      accentSoft: '#F6DCE4',
      accentInk: '#FFF7FA',
      gild: '#C9A24B',
      rule: '#EBD6D9',
      success: '#6F8A63',
      warning: '#C0893C',
      danger: '#AE4F55',
      glow: '#F7D6DE',
      scrim: 'rgba(60,42,49,0.40)',
    },
  },
  quietInk: {
    id: 'quietInk',
    name: 'Quiet Ink',
    blurb: 'Nothing but paper and a good sentence. No decoration at all.',
    isDark: false,
    ambience: 'dust',
    grain: 0.025,
    wash: ['#F2F1EE', '#FAFAF8'],
    colors: {
      canvas: '#F7F6F3',
      paper: '#FFFFFE',
      paperSunken: '#EFEEEA',
      paperRaised: '#FFFFFF',
      wood: '#8C8A84',
      woodDark: '#5F5D58',
      ink: '#1E1D1B',
      inkSoft: '#4A4844',
      inkFaint: '#8B8983',
      accent: '#2E2D2A',
      accentSoft: '#E6E5E0',
      accentInk: '#FBFBF9',
      gild: '#9A9188',
      rule: '#E2E1DC',
      success: '#5C6E56',
      warning: '#94793C',
      danger: '#8E4A42',
      glow: '#E9E7E0',
      scrim: 'rgba(30,29,27,0.38)',
    },
  },
  secondhandBookshop: {
    id: 'secondhandBookshop',
    name: 'Secondhand Bookshop',
    blurb: 'Bottle-green shelves, a cat asleep, everything half price.',
    isDark: false,
    ambience: 'dust',
    grain: 0.065,
    wash: ['#DCE4DA', '#EDF1E9'],
    colors: {
      canvas: '#E6EBE1',
      paper: '#F7F9F2',
      paperSunken: '#DEE5D8',
      paperRaised: '#FCFDF8',
      wood: '#5E6B52',
      woodDark: '#3C462F',
      ink: '#22291F',
      inkSoft: '#46523E',
      inkFaint: '#7C876F',
      accent: '#2F5D50',
      accentSoft: '#D2E0D6',
      accentInk: '#F4FAF6',
      gild: '#B08D4F',
      rule: '#CFD8C6',
      success: '#3F6B50',
      warning: '#A5842E',
      danger: '#8F4A3C',
      glow: '#DCE8C9',
      scrim: 'rgba(34,41,31,0.42)',
    },
  },
  lavenderDusk: {
    id: 'lavenderDusk',
    name: 'Lavender Dusk',
    blurb: 'The hour after sunset, when the page goes violet.',
    isDark: true,
    ambience: 'fireflies',
    grain: 0.06,
    wash: ['#2A2540', '#332C4C'],
    colors: {
      canvas: '#221E36',
      paper: '#2C2743',
      paperSunken: '#251F3A',
      paperRaised: '#372F52',
      wood: '#4A3F63',
      woodDark: '#2F2742',
      ink: '#EFE9F5',
      inkSoft: '#C3BAD4',
      inkFaint: '#8B84A0',
      accent: '#D5A8C8',
      accentSoft: '#3A3155',
      accentInk: '#241C33',
      gild: '#E3C48D',
      rule: '#3C3457',
      success: '#84A88E',
      warning: '#D6AA68',
      danger: '#C97D8E',
      glow: '#C9A9E0',
      scrim: 'rgba(12,9,20,0.62)',
    },
  },
  winterCabin: {
    id: 'winterCabin',
    name: 'Winter Cabin',
    blurb: 'Snow against the glass, woodsmoke, absolutely nowhere to be.',
    isDark: false,
    ambience: 'snow',
    grain: 0.05,
    wash: ['#E3E7EB', '#F2F5F7'],
    colors: {
      canvas: '#EBEFF2',
      paper: '#FAFCFD',
      paperSunken: '#E2E8ED',
      paperRaised: '#FFFFFF',
      wood: '#7E6A57',
      woodDark: '#54453A',
      ink: '#232A31',
      inkSoft: '#4B5560',
      inkFaint: '#84909B',
      accent: '#9C5A44',
      accentSoft: '#E5DAD2',
      accentInk: '#FFF8F4',
      gild: '#B39158',
      rule: '#D6DEE4',
      success: '#5A7A66',
      warning: '#B08542',
      danger: '#A2544A',
      glow: '#F4E6D2',
      scrim: 'rgba(35,42,49,0.42)',
    },
  },
  inkAndWine: {
    id: 'inkAndWine',
    name: 'Ink & Wine',
    blurb: 'A dark red bookshelf, a heavy novel, one glass poured.',
    isDark: true,
    ambience: 'dust',
    grain: 0.07,
    wash: ['#2A1A1E', '#341F25'],
    colors: {
      canvas: '#211417',
      paper: '#2C1D21',
      paperSunken: '#25171B',
      paperRaised: '#38262B',
      wood: '#4A2C2A',
      woodDark: '#2E1B1A',
      ink: '#F2E6DE',
      inkSoft: '#C7B4AC',
      inkFaint: '#8E7A75',
      accent: '#C2707A',
      accentSoft: '#3B282D',
      accentInk: '#241416',
      gild: '#D9B26A',
      rule: '#3D2A2F',
      success: '#7E9C79',
      warning: '#CDA05C',
      danger: '#CB6F6F',
      glow: '#D8A08A',
      scrim: 'rgba(10,6,7,0.66)',
    },
  },
};

/** Light rooms first, then the dark ones — the order they appear in Settings. */
export const THEME_ORDER: ThemeId[] = [
  'classicLibrary',
  'secondhandBookshop',
  'autumn',
  'coffeeShop',
  'pressedFlowers',
  'morningLight',
  'forestReading',
  'winterCabin',
  'sepiaPaper',
  'quietInk',
  'rainyEvening',
  'lavenderDusk',
  'inkAndWine',
  'midnight',
];
