#!/usr/bin/env node
/**
 * Checks the shape of a MongoDB connection string and never prints the
 * password in it.
 *
 * The usual fault is an unencoded "@" in the password. The driver reads
 * everything after the LAST "@" as the hostname, so an "@" in the password
 * moves where the host begins, and a piece of your own credentials ends up
 * being looked up in DNS.
 *
 *   node scripts/check-mongo-uri.mjs           reads MONGODB_URI, or stdin
 *   node scripts/check-mongo-uri.mjs --encode  encodes a raw password
 */
import { stdin } from 'node:process';

const read = async () => {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return chunks.join('').trim();
};

const NEEDS = { '@': '%40', ':': '%3A', '/': '%2F', '?': '%3F', '#': '%23', '[': '%5B', ']': '%5D', '%': '%25' };

if (process.argv.includes('--encode')) {
  const raw = await read();
  if (!raw) { console.error('Nothing on stdin.'); process.exit(1); }
  const changed = [...new Set([...raw])].filter((c) => NEEDS[c]);
  console.log('');
  console.log('Put this between the ":" and the "@":');
  console.log('');
  console.log('  ' + encodeURIComponent(raw));
  console.log('');
  console.log(changed.length
    ? 'Encoded: ' + changed.map((c) => c + ' -> ' + NEEDS[c]).join(', ')
    : 'Nothing needed encoding.');
  process.exit(0);
}

const uri = process.env.MONGODB_URI || (await read());
if (!uri) {
  console.error('Give it a URI: MONGODB_URI=... node scripts/check-mongo-uri.mjs');
  process.exit(1);
}

const say = (ok, text) => console.log('  ' + (ok ? 'ok  ' : 'BAD ') + text);
console.log('');

let parsed;
try {
  const { ConnectionString } = await import('mongodb-connection-string-url');
  parsed = new ConnectionString(uri);
} catch (error) {
  say(false, 'the driver cannot parse this: ' + error.message);
  const ats = (uri.match(/@/g) || []).length;
  if (ats > 1) {
    console.log('');
    console.log('  There are ' + ats + ' "@" characters. Only the one before the host may');
    console.log('  be literal. Any "@" in the password has to be written %40.');
    console.log('');
    console.log('  printf %s \'YOUR-PASSWORD\' | node scripts/check-mongo-uri.mjs --encode');
  }
  process.exit(1);
}

const hosts = parsed.hosts;
const db = parsed.pathname.replace(/^\//, '');
const hostsLookRight = hosts.length > 0 && hosts.every((h) => h.includes('.'));

say(/^mongodb(\+srv)?:$/.test(parsed.protocol), 'scheme:   ' + parsed.protocol.replace(':', ''));
say(Boolean(parsed.username), 'username: ' + (parsed.username || '(missing)'));
say(Boolean(parsed.password), 'password: ' + (parsed.password ? 'set, ' + parsed.password.length + ' characters' : '(missing)'));
say(hostsLookRight, 'host:     ' + hosts.join(', '));
say(true, 'database: ' + (db || '(none - the driver will use "test")'));
console.log('');

if (!hostsLookRight) {
  console.log('  That host has no dot in it, so it is not a hostname. This is exactly');
  console.log('  what an unencoded "@" in the password does: it moves where the host');
  console.log('  starts, and part of the password lands here.');
  console.log('');
  console.log('  printf %s \'YOUR-PASSWORD\' | node scripts/check-mongo-uri.mjs --encode');
  process.exit(1);
}
if (/x{3,}|[<>]/.test(hosts.join(''))) {
  console.log('  That host is still a placeholder out of an example. Use your own');
  console.log('  cluster id from Atlas > Connect > Drivers.');
  process.exit(1);
}

console.log('  Shape is correct. It can still be refused for a wrong password or a');
console.log('  blocked IP, but the string itself is fine.');
