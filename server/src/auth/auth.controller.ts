import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { GoogleProfile } from './strategies/google.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 4, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.token, dto.password);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser('userId') userId: string) {
    await this.auth.logout(userId);
  }

  @Get('me')
  me(@CurrentUser('userId') userId: string) {
    return this.auth.me(userId);
  }

  @Patch('me')
  updateProfile(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(userId, dto);
  }

  /* ----------------------------- Google ----------------------------- */

  /**
   * Step one: the app opens this in a browser tab, passing the deep link it
   * wants to be sent back to. We stash that link in the OAuth `state` so it
   * survives the round trip to Google.
   */
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleStart(@Query('redirect') redirect?: string) {
    // The guard performs the redirect; this body never runs. `redirect` is
    // declared so Nest documents it and so the value is validated below.
    void redirect;
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() request: Request, @Res() response: Response) {
    const profile = request.user as GoogleProfile | undefined;
    if (!profile) throw new BadRequestException('Google sign-in did not complete.');

    const result = await this.auth.loginWithGoogle(profile);

    // The app told us where to come back to, via ?redirect= on /auth/google.
    const redirect = this.safeRedirect(
      (request.query.state as string | undefined) ?? (request.query.redirect as string | undefined),
    );

    if (!redirect) {
      // No deep link (someone opened this in a plain browser) — show the
      // tokens rather than silently dropping them.
      response.json(result);
      return;
    }

    const url = new URL(redirect);
    url.searchParams.set('accessToken', result.accessToken);
    url.searchParams.set('refreshToken', result.refreshToken);
    url.searchParams.set('user', encodeURIComponent(JSON.stringify(result.user)));
    response.redirect(url.toString());
  }

  /**
   * Only ever redirect back into our own app. An open redirect here would let
   * anyone harvest a token by sending the user a crafted link.
   */
  private safeRedirect(value?: string): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      const scheme = url.protocol.replace(':', '');
      const allowedSchemes = ['marginalia', 'exp'];
      if (allowedSchemes.includes(scheme)) return url.toString();

      // Expo dev servers on the local network use http.
      const isLocal = ['localhost', '127.0.0.1'].includes(url.hostname) || /^192\.168\./.test(url.hostname);
      if ((url.protocol === 'http:' || url.protocol === 'https:') && isLocal) return url.toString();

      const allowedOrigins = this.config.get<string[]>('corsOrigins') ?? [];
      if (allowedOrigins.includes(url.origin)) return url.toString();

      return null;
    } catch {
      return null;
    }
  }
}
