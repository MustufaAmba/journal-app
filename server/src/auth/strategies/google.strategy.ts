import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

export type GoogleProfile = {
  googleId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

/**
 * Registered only when Google credentials are present — see AuthModule.
 * The mobile client never holds a Google secret; it opens /auth/google in a
 * browser tab and receives our own tokens on the redirect.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('google.clientId')!,
      clientSecret: config.get<string>('google.clientSecret')!,
      callbackURL: config.get<string>('google.callbackUrl')!,
      scope: ['email', 'profile'],
      // Carries the app's deep link through the OAuth round trip.
      passReqToCallback: false,
      state: true,
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google did not share an email address.'), undefined);
      return;
    }
    const user: GoogleProfile = {
      googleId: profile.id,
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}
