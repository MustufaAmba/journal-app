/**
 * The quote that greets the reader on the home screen.
 * All public-domain or widely-attributed lines about reading itself.
 */
export type Wisdom = { text: string; author: string };

export const WISDOM: Wisdom[] = [
  { text: 'A room without books is like a body without a soul.', author: 'Cicero' },
  { text: 'There is no friend as loyal as a book.', author: 'Ernest Hemingway' },
  { text: 'I have always imagined that Paradise will be a kind of library.', author: 'Jorge Luis Borges' },
  { text: 'A reader lives a thousand lives before he dies.', author: 'George R. R. Martin' },
  { text: 'Books are a uniquely portable magic.', author: 'Stephen King' },
  { text: 'We read to know we are not alone.', author: 'C. S. Lewis' },
  { text: 'Until I feared I would lose it, I never loved to read. One does not love breathing.', author: 'Harper Lee' },
  { text: 'The reading of all good books is like a conversation with the finest minds of past centuries.', author: 'René Descartes' },
  { text: 'She read books as one would breathe air, to fill up and live.', author: 'Annie Dillard' },
  { text: 'A book is a dream that you hold in your hand.', author: 'Neil Gaiman' },
  { text: 'Books are the mirrors of the soul.', author: 'Virginia Woolf' },
  { text: 'You can never get a cup of tea large enough or a book long enough to suit me.', author: 'C. S. Lewis' },
  { text: 'Reading is a discount ticket to everywhere.', author: 'Mary Schmich' },
  { text: 'That is part of the beauty of all literature. You discover that your longings are universal longings.', author: 'F. Scott Fitzgerald' },
  { text: 'Once you learn to read, you will be forever free.', author: 'Frederick Douglass' },
  { text: 'Books wash away from the soul the dust of everyday life.', author: 'Berthold Auerbach' },
  { text: 'A good book is an event in my life.', author: 'Stendhal' },
  { text: 'When I have a little money, I buy books; and if any is left, I buy food and clothes.', author: 'Erasmus' },
  { text: 'Some books leave us free and some books make us free.', author: 'Ralph Waldo Emerson' },
  { text: 'To read is to fly: it is to soar to a point of vantage.', author: 'A. C. Grayling' },
  { text: 'Sleep is good, he said, and books are better.', author: 'George R. R. Martin' },
  { text: 'There are worse crimes than burning books. One of them is not reading them.', author: 'Joseph Brodsky' },
  { text: 'The world was hers for the reading.', author: 'Betty Smith' },
  { text: 'Reading is to the mind what exercise is to the body.', author: 'Joseph Addison' },
  { text: 'Show me a family of readers, and I will show you the people who move the world.', author: 'Napoléon Bonaparte' },
  { text: 'I cannot remember the books I have read any more than the meals I have eaten; even so, they have made me.', author: 'Ralph Waldo Emerson' },
  { text: 'Never trust anyone who has not brought a book with them.', author: 'Lemony Snicket' },
  { text: 'Books are the plane, and the train, and the road. They are the destination and the journey.', author: 'Anna Quindlen' },
  { text: 'A great book should leave you with many experiences, and slightly exhausted at the end.', author: 'William Styron' },
  { text: 'One glance at a book and you hear the voice of another person, perhaps someone dead for 1,000 years.', author: 'Carl Sagan' },
];

/** Deterministic pick so the quote is stable for a whole day. */
export function wisdomForDay(date: Date = new Date()): Wisdom {
  const seed = date.getFullYear() * 1000 + date.getMonth() * 40 + date.getDate();
  return WISDOM[seed % WISDOM.length];
}
