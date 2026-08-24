import type { Ambience } from '@/theme/palettes';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Northern-hemisphere meteorological seasons. */
export function seasonOf(date: Date = new Date()): Season {
  const month = date.getMonth();
  if (month <= 1 || month === 11) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}

/**
 * The seasonal decoration for a theme.
 *
 * The idea is that the app quietly notices the time of year — blossom in
 * April, leaves in October, snow in January — without ever overruling a theme
 * that has a strong weather of its own. Rain belongs to Rainy Evening whatever
 * the month is, and Midnight's stars do not fall out of the sky in December.
 */
const KEEPS_ITS_OWN_WEATHER: Ambience[] = ['rain', 'stars', 'steam', 'fireflies'];

const SEASONAL: Record<Season, Ambience> = {
  spring: 'blossom',
  summer: 'dust',
  autumn: 'leaves',
  winter: 'snow',
};

export function ambienceForSeason(
  themeAmbience: Ambience,
  enabled: boolean,
  date: Date = new Date(),
): Ambience {
  if (!enabled) return themeAmbience;
  if (KEEPS_ITS_OWN_WEATHER.includes(themeAmbience)) return themeAmbience;
  return SEASONAL[seasonOf(date)];
}

/** A line for the settings screen, so the setting explains itself. */
export function seasonLabel(date: Date = new Date()): string {
  return {
    spring: 'blossom on the breeze',
    summer: 'dust in the afternoon light',
    autumn: 'leaves coming down',
    winter: 'snow, quietly',
  }[seasonOf(date)];
}
