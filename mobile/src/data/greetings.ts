/**
 * Time-of-day greeting, with a second line that changes the mood of the screen.
 *
 * The name matters more than it looks: most readers use this in guest mode,
 * where there is no account to take a name from. The dedication's "For …" is
 * the right fallback — it is the person the journal was made for.
 */
export function greeting(name?: string, at: Date = new Date()): { hello: string; sub: string } {
  const hour = at.getHours();
  const who = name?.trim() ? `, ${name.trim().split(' ')[0]}` : '';

  if (hour < 5) return { hello: `Still awake${who}?`, sub: 'One more chapter. We won’t tell.' };
  if (hour < 12) return { hello: `Good morning${who}`, sub: 'The kettle is on. What are we reading?' };
  if (hour < 17) return { hello: `Good afternoon${who}`, sub: 'A quiet hour is a good hour.' };
  if (hour < 21) return { hello: `Good evening${who}`, sub: 'Lamp on, feet up, book open.' };
  return { hello: `Happy reading${who}`, sub: 'The house is quiet and the world is asleep.' };
}

/** A gentle line for the reading-goal card, chosen by how the day is going. */
export function goalEncouragement(pagesRead: number, goal: number): string {
  if (goal <= 0) return 'Read as much or as little as you like today.';
  const ratio = pagesRead / goal;
  if (ratio === 0) return 'Whenever you are ready. No rush at all.';
  if (ratio < 0.34) return 'A lovely start. Keep going.';
  if (ratio < 0.7) return 'More than halfway there.';
  if (ratio < 1) return 'Almost. One more little stretch.';
  if (ratio < 2) return 'Goal met. Everything from here is a treat.';
  return 'Well past your goal. Somebody is enjoying themselves.';
}
