import { Directory, File, Paths } from 'expo-file-system';
import { createId } from './id';

/**
 * Copies a picked image somewhere it will survive.
 *
 * The image picker and the camera both hand back a file in the cache
 * directory, which Android is free to empty whenever it needs the space — so a
 * cover saved straight from the picker quietly becomes a broken reference some
 * weeks later. Everything the reader chooses to keep gets copied into the
 * document directory first.
 *
 * Returns the original uri if the copy fails: a cover that might disappear
 * later still beats no cover now.
 */
export async function persistImage(uri: string, folder = 'covers'): Promise<string> {
  try {
    const dir = new Directory(Paths.document, folder);
    if (!dir.exists) dir.create({ intermediates: true });

    const extension = (uri.split('?')[0].match(/\.(jpe?g|png|webp|heic)$/i)?.[1] ?? 'jpg').toLowerCase();
    const destination = new File(dir, `${createId()}.${extension}`);

    await new File(uri).copy(destination);
    return destination.uri;
  } catch {
    return uri;
  }
}

/** Removes a file the app previously persisted. Never throws. */
export function forgetImage(uri?: string): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The file is already gone, or was never ours to delete.
  }
}

/** True when a stored image is still on disk. Remote urls are assumed fine. */
export function imageExists(uri?: string): boolean {
  if (!uri) return false;
  if (/^https?:/i.test(uri)) return true;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}
