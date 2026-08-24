/** Colour helpers kept deliberately tiny — no runtime colour library. */

export function withAlpha(hex: string, alpha: number): string {
  const parsed = parseHex(hex);
  if (!parsed) return hex;
  const [r, g, b] = parsed;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function mix(a: string, b: string, amount: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;
  const t = Math.max(0, Math.min(1, amount));
  const out = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function shade(hex: string, amount: number): string {
  return mix(hex, amount < 0 ? '#000000' : '#ffffff', Math.abs(amount));
}

/** Perceived luminance, for deciding whether text on a colour should be light or dark. */
export function isLight(hex: string): boolean {
  const c = parseHex(hex);
  if (!c) return true;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42;
}

/** Deterministic warm colour from any string — used to tint coverless books. */
export function hueFromString(value: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function parseHex(hex: string): [number, number, number] | null {
  let value = hex.replace('#', '').trim();
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  if (value.length !== 6) return null;
  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
