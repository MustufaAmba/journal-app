import { createHash } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

/**
 * A regression test for a bug that was live for about ten minutes.
 *
 * Refresh tokens used to be hashed with bcrypt. bcrypt truncates its input at
 * 72 bytes, and two JWTs issued to the same user share far more than 72 bytes
 * of prefix — so a revoked token still compared equal to its replacement and
 * rotation revoked nothing at all.
 */
describe('refresh token hashing', () => {
  // Two real-shaped JWTs for the same subject, differing only in `iat`/`exp`.
  const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  const bodyA =
    'eyJzdWIiOiI2YThjMDY5YTQ2MzA0OWQ5MTdhOWRiM2EiLCJlbWFpbCI6ImFtbXVAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODc1NjE2MjYsImV4cCI6MTc5Mjc0NTYyNn0';
  const bodyB =
    'eyJzdWIiOiI2YThjMDY5YTQ2MzA0OWQ5MTdhOWRiM2EiLCJlbWFpbCI6ImFtbXVAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODc1NjE2NzUsImV4cCI6MTc5Mjc0NTY3NX0';

  const tokenA = `${header}.${bodyA}.RceWDso5HVXCYXjtE0dz8xhAAAAAAAAAAAAAAAAAAAA`;
  const tokenB = `${header}.${bodyB}.BD29q2Lj6i3dastuKwNoWmeCSmyc_t93B0PTSc5-uCg`;

  const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

  it('the two tokens really are different', () => {
    expect(tokenA).not.toEqual(tokenB);
  });

  it('demonstrates why bcrypt is the wrong tool here', async () => {
    // Both tokens share their first 72 bytes, which is all bcrypt looks at.
    expect(tokenA.slice(0, 72)).toEqual(tokenB.slice(0, 72));

    const hashOfB = await bcrypt.hash(tokenB, 4);
    // A revoked token matching its replacement is exactly the bug.
    await expect(bcrypt.compare(tokenA, hashOfB)).resolves.toBe(true);
  });

  it('sha256 distinguishes them, so rotation actually revokes', () => {
    expect(sha256(tokenA)).not.toEqual(sha256(tokenB));
    expect(sha256(tokenB)).toEqual(sha256(tokenB));
  });
});
