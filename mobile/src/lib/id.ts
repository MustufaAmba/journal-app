/**
 * Sortable, collision-resistant ids generated on-device.
 * Local-first means the phone, not the server, names things.
 */
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export function createId(prefix = ''): string {
  const time = Date.now().toString(36).padStart(8, '0');
  let random = '';
  for (let i = 0; i < 10; i += 1) {
    random += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}${prefix ? '_' : ''}${time}${random}`;
}
