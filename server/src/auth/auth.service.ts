import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { UsersService } from '../users/users.service';
import type { UserDocument } from '../users/user.schema';

/** Constant-time comparison, so a stored hash cannot be guessed byte by byte. */
function timingSafeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export type AuthTokens = { accessToken: string; refreshToken: string };
export type PublicUser = { id: string; email: string; name?: string; avatarUrl?: string; guest: false };

const SALT_ROUNDS = 12;

/**
 * Refresh tokens are hashed with SHA-256 rather than bcrypt.
 *
 * bcrypt silently truncates its input at 72 bytes. A JWT is far longer than
 * that and every token issued to the same user shares an identical prefix
 * (header + the start of the payload), so bcrypt would consider a revoked
 * token and its replacement equal — and rotation would never actually revoke
 * anything. A refresh token is already high-entropy random material, so a
 * fast digest is the right tool; bcrypt's work factor is for passwords.
 */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private toPublic(user: UserDocument): PublicUser {
    return {
      id: user.id as string,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      guest: false,
    };
  }

  private async issueTokens(user: UserDocument): Promise<AuthTokens> {
    const payload = { sub: user.id as string, email: user.email };

    // `expiresIn` is typed as a literal duration union; the value only exists
    // as a string at runtime (it comes from the environment).
    const ttl = (value?: string) => value as JwtSignOptions['expiresIn'];

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: ttl(this.config.get<string>('jwt.accessTtl')),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: ttl(this.config.get<string>('jwt.refreshTtl')),
      }),
    ]);

    // Storing a hash means a stolen database still cannot mint sessions.
    await this.users.setRefreshTokenHash(user.id as string, hashToken(refreshToken));

    return { accessToken, refreshToken };
  }

  async register(name: string, email: string, password: string) {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException('There is already an account with that email.');

    const user = await this.users.create({
      name: name.trim(),
      email,
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
    });

    return { user: this.toPublic(user), ...(await this.issueTokens(user)) };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email, true);
    // Same message either way — do not reveal which accounts exist.
    const invalid = new UnauthorizedException('That email and password do not match.');
    if (!user?.passwordHash) throw invalid;

    if (!(await bcrypt.compare(password, user.passwordHash))) throw invalid;

    return { user: this.toPublic(user), ...(await this.issueTokens(user)) };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('That session has expired. Please sign in again.');
    }

    const user = await this.users.findWithRefreshToken(payload.sub);
    if (!user?.refreshTokenHash) throw new UnauthorizedException('That session is no longer valid.');
    if (!timingSafeEqualHex(hashToken(refreshToken), user.refreshTokenHash)) {
      // The token verified but does not match the stored one — it has been
      // rotated or revoked. Drop the session entirely.
      await this.users.setRefreshTokenHash(user.id as string, null);
      throw new UnauthorizedException('That session is no longer valid.');
    }

    return { user: this.toPublic(user), ...(await this.issueTokens(user)) };
  }

  async logout(userId: string) {
    await this.users.setRefreshTokenHash(userId, null);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.toPublic(user);
  }

  async updateProfile(userId: string, patch: { name?: string; avatarUrl?: string }) {
    const user = await this.users.update(userId, patch);
    if (!user) throw new UnauthorizedException();
    return this.toPublic(user);
  }

  /**
   * Password reset.
   *
   * This is a personal-scale app with no mail provider wired up, so the token
   * is generated, hashed and stored, and the link is logged rather than sent.
   * Plug an email service in here and nothing else has to change.
   */
  async requestPasswordReset(email: string) {
    const user = await this.users.findByEmail(email);
    // Always report success — the response must not reveal who has an account.
    if (!user) return { ok: true as const };

    const token = randomBytes(32).toString('hex');
    await this.users.update(user.id as string, {
      passwordResetTokenHash: createHash('sha256').update(token).digest('hex'),
      passwordResetExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    this.logger.log(`Password reset for ${user.email}: token=${token} (valid one hour)`);
    return { ok: true as const };
  }

  async resetPassword(email: string, token: string, password: string) {
    const user = await this.users.findWithResetToken(email);
    const invalid = new UnauthorizedException('That reset link is no longer valid.');
    if (!user?.passwordResetTokenHash || !user.passwordResetExpiresAt) throw invalid;
    if (user.passwordResetExpiresAt.getTime() < Date.now()) throw invalid;

    const hashed = createHash('sha256').update(token).digest('hex');
    if (hashed !== user.passwordResetTokenHash) throw invalid;

    await this.users.update(user.id as string, {
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
      passwordResetTokenHash: undefined,
      passwordResetExpiresAt: undefined,
      // Changing the password ends every other session.
      refreshTokenHash: undefined,
    });

    return { ok: true as const };
  }
}
